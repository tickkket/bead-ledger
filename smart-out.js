(function(){
"use strict";
const root=document.getElementById("local-out");if(!root)return;
const $=s=>root.querySelector(s);
const escape=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const channels=["","小红书","淘宝","拼多多","1688","抖音","微信","线下批发","其他"];
let next=0,busy=false,photos={};
root.innerHTML='<label>每行一款外购成品</label><textarea class="local-field" id="out-lines" rows="3" placeholder="珍珠耳夹3对，进价12元，售价39元；水晶手串2件，进价25元，售价68元"></textarea><div class="local-row"><button type="button" class="local-btn" data-out="parse">识别多款</button><button type="button" class="local-btn" data-out="add">＋ 加一款</button></div><div id="out-list"></div><button type="button" class="local-btn main" data-out="save">核对后批量入库</button><div id="out-msg" class="local-result" role="status"></div>';
const say=(s,error)=>{const x=$("#out-msg");x.textContent=s;x.style.color=error?"#b44545":"#315e51"};
function parse(t){
 const qty=(t.match(/(\d+)\s*(?:件|条|对|副|套)/)||[])[1];
 const find=re=>{const m=t.match(re);return m?Number(m[1]):null};
 const cost=find(/(?:每件|单件|每对|每套)?\s*(?:进价|每件进价|成本|拿货价)\s*(?:为|是|：|:|¥)?\s*(\d+(?:\.\d+)?)/);
 const price=find(/(?:建议售价|售价|卖价|定价|打算卖|准备卖)\s*(?:为|是|：|:|¥)?\s*(\d+(?:\.\d+)?)/);
 const channel=channels.find(x=>x&&x!=="其他"&&t.includes(x))||"";
 const name=t.replace(/(?:每件|单件|每对|每套)?\s*(?:进价|成本|拿货价|建议售价|售价|卖价|定价|打算卖|准备卖)\s*(?:为|是|：|:|¥)?\s*\d+(?:\.\d+)?\s*(?:元|块)?/g," ").replace(/\d+\s*(?:件|条|对|副|套)/g," ").replace(/小红书|淘宝|拼多多|1688|抖音|微信|线下批发|外购|买了|进了/g," ").replace(/[，,。]/g," ").trim();
 return {name,qty:qty||1,cost:cost??"",price:price??"",channel};
}
function field(label,key,value="",kind="text"){
 return '<label>'+label+'<input class="local-field" type="'+kind+'" data-field="'+key+'" value="'+escape(value)+'"></label>';
}
function draw(r={}){
 const id="out"+(++next);
 const channelOptions=channels.map(x=>'<option value="'+escape(x)+'" '+(x===r.channel?'selected':'')+'>'+escape(x||"请选择")+'</option>').join("");
 return '<section data-out-row="'+id+'" style="padding:10px;margin:9px 0;border:1px solid #d5e1d9;border-radius:10px;background:white">'+
 '<div class="local-row"><strong>外购成品 · 非手作</strong><button class="local-btn" type="button" data-out="remove">移除</button></div><div class="di-grid">'+
 '<div class="di-full">'+field("名称 *","name",r.name||"")+'</div>'+
 field("售价（元）*","price",r.price??"","number")+
 field("入库件数 *","qty",r.qty??1,"number")+
 field("每件进价（元）*","cost",r.cost??"","number")+
 '<label>网上同款风险<select class="local-field" data-field="sameOnline"><option value="0">暂无发现/不确定</option><option value="1">网上容易找到同款</option></select></label>'+
 '<label>购买渠道 *<select class="local-field" data-field="channel">'+channelOptions+'</select></label>'+
 field("店铺/直播间","detail")+
 '<div class="di-full"><label>备注<textarea class="local-field" data-field="notes" rows="2"></textarea></label></div>'+
 '<div class="di-full"><label>成品照片（可选）<input data-out-photo="'+id+'" type="file" accept="image/*" class="di-file"></label><div class="local-row"><button class="local-btn" type="button" data-out="camera">网页拍照</button><button class="local-btn" type="button" data-out="edit">裁切/画笔</button><button class="local-btn" type="button" data-out="clear">清除图片</button></div><img data-out-preview="'+id+'" alt="照片" style="display:none;width:70px;height:70px;object-fit:cover"></div></div></section>';
}
function add(r){$("#out-list").insertAdjacentHTML("beforeend",draw(r))}
function preview(id){const el=root.querySelector('[data-out-preview="'+id+'"]');if(el){el.src=photos[id]||"";el.style.display=photos[id]?"block":"none"}}
async function edit(id,data){if(busy)return;busy=true;try{const img=await window.BeadPhotoEditor.open(data);if(img){photos[id]=img;preview(id);say("照片已编辑")}}catch(e){say(e.message,true)}finally{busy=false}}
async function save(){
 if(busy)return;busy=true;
 try{
  const sections=[...root.querySelectorAll("[data-out-row]")];if(!sections.length)throw Error("至少添加一款外购成品");
  if(sections.length>50)throw Error("每批最多50款");
  const items=sections.map((el,i)=>{
   const v=k=>el.querySelector('[data-field="'+k+'"]')?.value?.trim()??"";
   const name=v("name"),q=v("qty"),c=v("cost"),p=v("price"),qty=Number(q),buyPrice=Number(c),price=Number(p);
   const which="第"+(i+1)+"款";
   if(!name)throw Error(which+"缺少名称");
   if(q===""||!Number.isInteger(qty)||qty<1)throw Error(which+"件数无效");
   if(c===""||!Number.isFinite(buyPrice)||buyPrice<0)throw Error(which+"每件进价无效");
   if(p===""||!Number.isFinite(price)||price<0)throw Error(which+"售价无效");
   let source;try{source=makePurchaseSource(v("channel"),v("detail"))}catch(e){throw Error(which+"渠道："+e.message)}
   const id=uid();
   return {id,type:"out",name,price,producedQty:qty,stock:qty,buyPrice,source,sameOnline:v("sameOnline")==="1",notes:v("notes"),image:photos[el.dataset.outRow]||"",createdAt:new Date().toISOString(),cost:{unit:buyPrice,material:buyPrice,labor:0,stall:0,tool:0}};
  });
  if(!confirm("确定入库 "+items.length+" 款，共 "+items.reduce((n,x)=>n+x.producedQty,0)+" 件外购成品？"))return;
  await commit(()=>state.products.push(...items),"外购成品已批量入库");
  if(items.every(x=>state.products.some(y=>x.id===y.id))){$("#out-list").innerHTML="";photos={};say("已保存 "+items.length+" 款")}
  else say("保存未完成，记录仍保留在当前页面",true);
 }catch(e){say(e.message||String(e),true)}finally{busy=false}
}
root.addEventListener("change",async e=>{const x=e.target.closest("[data-out-photo]");if(!x||!x.files?.[0])return;const id=x.dataset.outPhoto;try{const src=await shrinkImage(x.files[0]);await edit(id,src)}catch(err){say(err.message,true)}finally{x.value=""}});
root.addEventListener("click",async e=>{
 const b=e.target.closest("[data-out]");if(!b)return;const type=b.dataset.out;
 if(type==="add"){add({qty:1});return}
 if(type==="parse"){
  const lines=$("#out-lines").value.split(/[；;\n]+/).map(x=>x.trim()).filter(Boolean);
  if(!lines.length)return say("请输入描述",true);
  if(lines.length>30)return say("每次最多识别30款",true);
  lines.forEach(line=>add(parse(line)));$("#out-lines").value="";say("已识别"+lines.length+"款，请核对");return;
 }
 if(type==="save"){await save();return}
 const row=b.closest("[data-out-row]");if(!row)return;const id=row.dataset.outRow;
 if(type==="remove"){if(busy)return;row.remove();delete photos[id];return}
 if(type==="clear"){delete photos[id];preview(id);return}
 if(type==="edit"){if(!photos[id])return say("请先选图",true);await edit(id,photos[id]);return}
 if(type==="camera"){try{await window.BeadPhotoAccess.camera(data=>edit(id,data))}catch(err){say(err.message,true)}}
});
window.SmartOutIntake={parse};
})();