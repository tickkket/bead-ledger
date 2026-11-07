/* Deterministic blind-box parsing and cost allocation; no inventory writes. */
(function(){
"use strict";
const FAMILIES=["水晶晶石类","玛瑙玉石类","珍珠类","贝类螺类","木珠种子类","其他类别","其他集合玉石类","待确认品类"];
const WEIGHTS={"水晶晶石类":1.2,"玛瑙玉石类":1.25,"珍珠类":1.35,"贝类螺类":.9,"木珠种子类":.8,"其他类别":1,"其他集合玉石类":1.25,"待确认品类":1};
const SHAPES=["算盘珠","圆珠","隔片","隔珠","碎石","直切","水滴","米珠","桶珠","鼓珠","老型珠","切面珠","随形","异形","不规则","方珠","平安扣","跑环","贝片","戒面","贴面","圆片","扁片","药片珠","蛋面","方糖","橄榄珠","莲花珠","枣珠"];
const STRAND_FACTOR_DEFAULT=12;
const str=x=>String(x??"").trim();
const cleanse=x=>str(x).replace(/[\t\r\n]+/g," ").slice(0,140);
function groupFor(name){
 if(typeof window.BeadMaterialClassifier?.inferStoneClass==="function")return window.BeadMaterialClassifier.inferStoneClass(name);
 const t=str(name);
 if(/珍珠|贝珠/.test(t))return "珍珠类";
 if(/水晶|发晶|萤石|拉长石/.test(t))return "水晶晶石类";
 if(/玛瑙|翡翠|和田玉|玉髓/.test(t))return "玛瑙玉石类";
 if(/贝母|贝壳|海螺/.test(t))return "贝类螺类";
 if(/沉香|檀木|木珠|菩提/.test(t))return "木珠种子类";
 if(/琉璃|玻璃/.test(t))return "其他类别";
 return "待确认品类";
}
function shapeFor(t){return [...SHAPES].sort((a,b)=>b.length-a.length).find(x=>str(t).includes(x))||""}
function cleanRow(x={}){
 const rawQty=str(x.qty),shape=str(x.shape),rawName=str(x.name||x.category);
 const explicitUnit=str(x.unit||x.measure);
 const unit=explicitUnit==="串"||explicitUnit==="整串"||(!explicitUnit&&/串/.test(rawQty))?"串":"颗";
 const kind=str(x.kind||x.sourceType)==="手串"||(!x.kind&&(/手串/.test(rawName)||unit==="串"))?"手串":"散珠";
 const name=rawName.replace(/手串$/,"").trim();
 const card=str(x.card)||(unit==="串"&&/碎石|直切/.test(shape)?"不适用":"");
 return {name,card,qty:rawQty.replace(/(?:颗|粒|个|串)$/,"").trim(),shape,
  unit,kind,group:FAMILIES.includes(x.group)?x.group:groupFor(name),
  weight:str(x.weight),notes:str(x.notes)};
}
function parseLines(input){
 const out=[];
 for(const line of str(input).split(/[\r\n；;]+/).map(x=>x.trim()).filter(Boolean)){
  if(/^(?:总价|整盒|整套|实付|总成本)\s*[:：¥￥]?\s*\d/.test(line))continue;
  let name="",card="",qty="",shape="",unit="",kind="",notes="";
  if(/\t|[｜|]/.test(line)||((line.match(/[，,]/g)||[]).length>=2)){
   const v=line.split(/\t|[｜|]|[，,]/).map(str);[name,card,qty,shape]=v;
   if(v[4]==="串"||v[4]==="颗"){unit=v[4];if(v[5]==="手串"||v[5]==="散珠"){kind=v[5];notes=v.slice(6).join(" ")}else notes=v.slice(5).join(" ")}
   else if(v[4]==="手串"||v[4]==="散珠"){kind=v[4];notes=v.slice(5).join(" ")}
   else notes=v.slice(4).join(" ");
  }else{
   const cm=line.match(/(?:卡(?:数)?\s*[:：]?\s*(\d+(?:\.\d+)?)|(\d+(?:\.\d+)?)\s*卡)/i);
   const qm=line.match(/(\d+)\s*(颗|粒|个|串)/);
   card=cm?(cm[1]||cm[2]):(/无卡数|卡数不适用/.test(line)?"不适用":"");
   qty=qm?qm[1]:"";unit=qm&&qm[2]==="串"?"串":"颗";
   kind=/手串/.test(line)||unit==="串"?"手串":"散珠";
   shape=shapeFor(line);
   name=line.replace(/^\d+[、.)．]\s*/,"")
    .replace(/(?:卡(?:数)?\s*[:：]?\s*\d+(?:\.\d+)?|\d+(?:\.\d+)?\s*卡)/gi,"")
    .replace(/\d+\s*(?:颗|粒|个|串)/g,"").replace(/(?:优选|福利珠|福利|无卡数|卡数不适用)/g,"").trim();
   if(shape&&name.endsWith("手串"))name=name.slice(0,-2).trim();
   if(shape&&name.endsWith(shape))name=name.slice(0,-shape.length).trim();
  }
  name=str(name).replace(/^\d+[、.)．]\s*/,"").replace(/[\s,，：:]+$/,"");
  card=str(card).replace(/卡数|卡/g,"");
  qty=str(qty).replace(/(?:颗|粒|个|串)$/,"");
  if(/(?:购买|实付|总价|元|账单)/.test(name)&&!qty&&!card)continue;
  if(name||card||qty||shape)out.push(cleanRow({name,card,qty,shape,unit,kind,notes}));
  if(out.length>=60)break;
 }
 return out;
}
function questions(rows,total){
 const res=[];
 if(str(total)===""||!Number.isFinite(Number(total))||Number(total)<0)res.push("整套盲盒实付总价是多少元？");
 if(!rows.length)res.push("请先说明至少一种珠子：品类、卡数（如适用）、数量、单位和形状。");
 rows.forEach((row,i)=>{
  const r=cleanRow(row),who="第"+(i+1)+"种"+(r.name?"「"+r.name+"」":"珠子");
  if(!r.name)res.push(who+"是什么品类？");
  if(!r.card)res.push(who+"卡数是多少？没有卡数请填“不适用”。");
  if(!/^\d+$/.test(r.qty)||Number(r.qty)<1)res.push(who+"有多少"+r.unit+"？");
  if(!r.shape)res.push(who+"是什么形状/珠型？");
  if(!["颗","串"].includes(r.unit))res.push(who+"按颗还是按整串计算？");
  if(r.weight&&(!Number.isFinite(Number(r.weight))||Number(r.weight)<.1||Number(r.weight)>20))res.push(who+"的品类权重必须在0.1至20之间。");
 });
 return res;
}
function allocate(total,rows,markup=2.5,strandFactor=STRAND_FACTOR_DEFAULT){
 const amount=Number(total),mult=Number(markup),factor=Number(strandFactor);
 if(str(total)===""||!Number.isFinite(amount)||amount<0||amount>1000000)throw Error("整套总价须在0至100万元之间");
 if(!Number.isFinite(mult)||mult<1||mult>20)throw Error("售价倍率应在1至20之间");
 if(!Number.isFinite(factor)||factor<1||factor>200)throw Error("整串折算系数须在1至200之间");
 const missing=questions(rows,total);if(missing.length)throw Error("还有"+missing.length+"项待补充："+missing[0]);
 const entries=rows.map((item,index)=>{
  const r=cleanRow(item),qty=Number(r.qty),weight=r.weight?Number(r.weight):(WEIGHTS[r.group]??1);
  if(!Number.isInteger(qty)||qty<1||qty>100000)throw Error("第"+(index+1)+"种数量无效");
  if(!(weight>=.1&&weight<=20))throw Error("第"+(index+1)+"种权重不正确");
  return {r,index,qty,weight,score:qty*weight*(r.unit==="串"?factor:1),cents:0,fraction:0};
 });
 const score=entries.reduce((a,x)=>a+x.score,0),cents=Math.round((amount+Number.EPSILON)*100);
 let assigned=0;
 for(const x of entries){const share=cents*x.score/score;x.cents=Math.floor(share);x.fraction=share-x.cents;assigned+=x.cents}
 const order=[...entries].sort((a,b)=>b.fraction-a.fraction||a.index-b.index);
 for(let i=0;i<cents-assigned;i++)order[i%order.length].cents++;
 const segments=[];
 for(const x of entries){
  const low=Math.floor(x.cents/x.qty),highCount=x.cents%x.qty;
  for(const [count,unit] of [[x.qty-highCount,low],[highCount,low+1]]){
   if(count)segments.push({row:x.r,qty:count,weight:x.weight,unitCents:unit,subtotalCents:count*unit,
    suggest:Math.ceil(unit/100*mult*2)/2,index:x.index});
  }
 }
 if(segments.reduce((a,x)=>a+x.subtotalCents,0)!==cents)throw Error("成本尾差分配异常");
 const pieces=entries.filter(x=>x.r.unit==="颗").reduce((a,x)=>a+x.qty,0);
 const strands=entries.filter(x=>x.r.unit==="串").reduce((a,x)=>a+x.qty,0);
 return {segments,qty:pieces+strands,pieces,strands,groups:entries.length,cents,score,strandFactor:factor};
}
function toTSV(plan){
 const lines=[["珠子品类","珠子大类","来源","卡数","形状","数量","单位","品类权重","整串折算系数","单位分摊成本(元)","成本小计(元)","建议售价(元/单位)","备注"].join("\t")];
 for(const s of plan.segments){
  lines.push([s.row.name,s.row.group,s.row.kind,s.row.card,s.row.shape,s.qty,s.row.unit,s.weight,s.row.unit==="串"?plan.strandFactor:1,
   (s.unitCents/100).toFixed(2),(s.subtotalCents/100).toFixed(2),s.suggest.toFixed(2),
   s.row.notes].map(cleanse).join("\t"));
 }
 lines.push(["合计","","","","",plan.pieces+"颗 / "+plan.strands+"串","","","",
  "",(plan.cents/100).toFixed(2),"","整串系数为成本分摊参考，不代表市场行情；尾差可能将一种珠子拆成两行"].join("\t"));
 return lines.join("\n");
}
window.BlindBoxPlanner={FAMILIES,WEIGHTS,SHAPES,STRAND_FACTOR_DEFAULT,groupFor,cleanRow,shapeFor,parseLines,questions,allocate,toTSV};
})();