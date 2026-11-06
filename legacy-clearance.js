/* Historical stock clearance: legacy glass beads, Hemu wood beads and alloy findings.
   Purchase cost is UNKNOWN even when the old business period has recovered its spending.
   Records live in the same IndexedDB snapshot as ordinary materials. */
(function(){
"use strict";
const GROUP_LABEL={glass:"琉璃珠",wood:"禾木珠",metal:"旧合金／铜配件"};
const STATUS=["未用","已用","已卖","自戴"];
const UNIT=["克","包","颗","个"];
const COLORS=["保色可以","保色一般（铜配件）","保色差"];
const channels=["闲鱼","淘宝","拼多多","微信","抖音","线下","其他"];
const e=x=>esc(x);
const f=(form,name)=>form.querySelector('[name="'+name+'"]');
const val=(form,name)=>f(form,name)?.value?.trim()??"";
const checked=(form,name)=>!!f(form,name)?.checked;
const opts=(values,selected="",placeholder="请选择")=>
 '<option value="">'+e(placeholder)+'</option>'+
 values.map(item=>{const [value,label]=Array.isArray(item)?item:[item,item];return '<option value="'+e(value)+'"'+(String(selected)===String(value)?' selected':'')+'>'+e(label)+'</option>'}).join("");
const field=(name,title,value="",type="text",hint="")=>
 '<div class="field"><label>'+e(title)+'</label><input class="input" name="'+e(name)+'" type="'+type+'" value="'+e(value??"")+'"'+(type==="number"?' min="0" step="any"':'')+'>'+(hint?'<div class="hint">'+e(hint)+'</div>':'')+'</div>';
const select=(name,title,values,selected="",hint="")=>
 '<div class="field"><label>'+e(title)+'</label><select class="select" name="'+e(name)+'">'+opts(values,selected)+'</select>'+(hint?'<div class="hint">'+e(hint)+'</div>':'')+'</div>';
const optionalNumber=(root,name,label)=>{const raw=val(root,name);if(raw==="")return null;const number=Number(raw);required(Number.isFinite(number)&&number>=0&&number<1e9,label+"必须是大于等于0的数字");return number};
const storageLots=()=>state.materials.filter(m=>m.legacyStock===true).sort((a,b)=>Number(b.legacyGroup==="metal"&&b.legacyColorClass==="保色差")-Number(a.legacyGroup==="metal"&&a.legacyColorClass==="保色差")||String(b.createdAt||"").localeCompare(String(a.createdAt||"")));
const sales=()=>Array.isArray(state.legacySales)?state.legacySales:[];
const lotTitle=m=>(GROUP_LABEL[m.legacyGroup]||"历史物料")+(m.legacyGrade?" · "+m.legacyGrade:"")+(m.legacyColorClass?" · "+m.legacyColorClass:"");
const askPrice=m=>[
 m.legacyPriceJin!==null&&m.legacyPriceJin!==undefined?"¥"+n(m.legacyPriceJin).toFixed(2)+"/斤":"",
 m.legacyPriceBag!==null&&m.legacyPriceBag!==undefined?"¥"+n(m.legacyPriceBag).toFixed(2)+"/包":"",
 m.legacyPricePiece!==null&&m.legacyPricePiece!==undefined?"¥"+n(m.legacyPricePiece).toFixed(2)+"/颗/个":""
].filter(Boolean).join(" · ");
const badge=text=>'<span class="badge">'+e(text)+'</span>';

function renderSection(){
 const lots=storageLots(),records=sales(),gross=records.reduce((sum,x)=>sum+n(x.gross),0);
 const net=records.reduce((sum,x)=>sum+n(x.net),0);
 const cards=lots.map(m=>{
  const unit=e(m.unit||"克");
  const grade=m.legacyGroup==="glass"?m.legacyGrade:m.legacyGroup==="metal"?m.legacyColorClass:"历史批次";
  const history=(m.legacyTests||[]).length;
  return '<div class="item"><div class="item-body"><div class="item-title">'+e(m.name)+' '+badge(GROUP_LABEL[m.legacyGroup]||"旧货")+(grade?badge(grade):"")+'</div>'+
   '<div class="meta">'+(m.legacyGroup==='metal'&&m.legacyColorClass==='保色差'?'<b style="color:#ae4949">优先清仓</b> · ':'')+'剩余 '+fmt(m.qty)+' '+unit+' · '+(askPrice(m)?'参考售价 '+e(askPrice(m))+' · ':'')+'历史成本不详</div>'+
   '<div class="meta">经营系列：平价琉璃 / 历史库存'+(history?' · 保色测试 '+history+' 次':'')+(m.notes?' · '+e(m.notes):'')+'</div></div>'+
   '<div class="side"><div class="item-buttons"><button class="btn small" data-action="legacy-edit" data-id="'+e(m.id)+'">编辑</button>'+
   '<button class="btn small primary" data-action="legacy-sell" data-id="'+e(m.id)+'"'+(n(m.qty)<=0?' disabled':'')+'>清仓出售</button><button class="btn small danger" data-action="legacy-delete" data-id="'+e(m.id)+'">删除</button></div></div></div>';
 }).join("");
 return '<section class="panel" style="margin-bottom:14px;padding:13px">'+
  '<div class="flex" style="justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap"><div><h3 style="margin:0 0 4px">历史库存 · 批量清仓</h3>'+
  '<div class="muted tiny">琉璃珠按等级分别定价；禾木珠和旧配件支持按斤或按包出售</div></div>'+
  '<button type="button" class="btn primary small" data-action="legacy-add">＋ 登记旧货批次</button></div>'+
  '<div class="meta" style="margin:9px 0">旧货批次 '+lots.length+' · 已成交 '+records.length+' 笔 · 成交额 '+money(gross)+' · 扣本次运费及手续费后回款 '+money(net)+'</div>'+
  '<details'+(lots.length&&lots.length<=4?' open':'')+'><summary style="cursor:pointer">查看历史库存批次（'+lots.length+'）</summary>'+
  '<div class="list" style="margin-top:10px">'+(lots.length?cards:'<div class="empty">还没有登记旧货。可以按等级、按混装包或按重量建批次，不必逐颗清点。</div>')+'</div></details>'+
  '<div class="hint" style="margin-top:8px">旧货已整体回本，但单批原始采购成本不详，因此这里统计的是额外回款，不把全部售价当成利润。不同等级的琉璃珠请分批登记，各自设置参考售价。</div></section>';
}
function renderSalesSection(){
 const records=sales(),gross=records.reduce((a,s)=>a+n(s.gross),0),net=records.reduce((a,s)=>a+n(s.net),0);
 const groupSum={};for(const s of records){const key=(GROUP_LABEL[s.legacyGroup]||"历史库存")+(s.grade?" · "+s.grade:"");groupSum[key]=(groupSum[key]||0)+n(s.net)}
 const items=[...records].reverse().map(s=>'<div class="item"><div class="item-body"><div class="item-title">'+e(s.name)+' '+badge(s.grade||GROUP_LABEL[s.legacyGroup]||"旧货")+'</div>'+
 '<div class="meta">'+e(s.date)+' · '+fmt(s.saleQty)+' '+e(s.saleUnit)+' · 成交 '+money(s.gross)+' · 运费／手续费 '+money(n(s.shipping)+n(s.fee))+'</div>'+
 '<div class="meta">本次净回款 '+money(s.net)+' · '+e(s.channel||"未填")+(s.notes?' · '+e(s.notes):'')+'</div></div>'+
 '<div class="side"><button class="btn small danger" data-action="legacy-reverse-sale" data-id="'+e(s.id)+'">撤销并退库存</button></div></div>').join("");
 return '<section class="panel" style="margin:13px 0;padding:13px"><h3 style="margin:0 0 6px">历史物料清仓回款（单独统计）</h3>'+
 '<div class="meta">已成交 '+records.length+' 笔 · 商品成交额 '+money(gross)+' · 扣运费／平台费后 '+money(net)+'</div>'+
 (Object.keys(groupSum).length?'<div class="hint" style="margin-top:5px">'+Object.entries(groupSum).map(([k,v])=>e(k)+'：'+money(v)).join('　·　')+'</div>':'')+
 '<div class="hint">旧货原始成本不详；这里的金额是后续回款，不是包含旧采购成本的净利润，也不重复进入新主营利润。</div>'+
 '<details style="margin-top:9px"><summary style="cursor:pointer">查看清仓流水（'+records.length+'）</summary>'+
 '<div class="list" style="margin-top:9px">'+(items||'<div class="empty">还没有历史物料清仓成交记录。</div>')+'</div></details></section>';
}
function openLot(id=null){
 const m=id?byId(state.materials,id):null;
 if(id)required(m?.legacyStock,"没有找到历史库存批次");
 const locked=!!m,group=m?.legacyGroup||"glass",unit=m?.unit||"克";
 const grp=locked?'<input type="hidden" name="legacyGroup" value="'+e(group)+'"><div class="field"><label>历史物料种类</label><input class="input" disabled value="'+e(GROUP_LABEL[group])+'"></div>':
 select("legacyGroup","历史物料种类",Object.entries(GROUP_LABEL),group);
 const unitControl=locked?'<input type="hidden" name="legacyStockUnit" value="'+e(unit)+'"><div class="field"><label>库存单位（有销售流水后不可更改）</label><input class="input" disabled value="'+e(unit)+'"></div>':
 select("legacyStockUnit","库存计算单位",UNIT,unit,"按斤管理选克；按整包管理选包；按颗、个出售也可选颗／个。");
 const testHistory=(m?.legacyTests||[]);
 const history=testHistory.length?'<details style="margin-top:9px"><summary>已有 '+testHistory.length+' 次保色测试（展开查看）</summary>'+
 testHistory.map(t=>'<div class="info" style="margin:6px 0">'+e(t.date||"")+' · '+e(t.method||"")+' · '+e(t.outcome||"")+
 (t.testQty?' · 测试 '+fmt(t.testQty):'')+(t.discardQty?' · 报废 '+fmt(t.discardQty):'')+
 (t.note?' · '+e(t.note):'')+'</div>').join('')+'</details>':"";
 const body='<div class="info" style="margin-bottom:10px">这部分为以前摆摊已经整体回本的旧库存。原始单批成本不详，不会生成新的采购支出；出售时统计额外回款。</div>'+
 '<input type="hidden" name="legacyId" value="'+e(id||"")+'"><div class="form-grid">'+grp+
 field("legacyName","批次名称 *",m?.name||"","text","例：琉璃珠 A级／保色差合金混装／禾木珠混装")+
 '<div class="field" id="legacy-grade-wrap"'+(group==="glass"?"":' style="display:none"')+'><label>琉璃珠等级（必填）</label><input class="input" name="legacyGrade" list="legacy-grades" value="'+e(m?.legacyGrade||"")+'" placeholder="例如 A级、B级、C级、混合级"><datalist id="legacy-grades"><option value="A级"><option value="B级"><option value="C级"><option value="精品"><option value="普通"><option value="瑕疵"><option value="混合级"></datalist><div class="hint">不同等级请分别登记库存并设置各自单价。</div></div>'+
 '<div class="field" id="legacy-color-wrap"'+(group==="metal"?"":' style="display:none"')+'>'+select("legacyColorClass","保色等级",COLORS,m?.legacyColorClass||"").replace(/^<div class="field">|<\/div>$/g,"")+'</div>'+
 unitControl+
 field("legacyQty","当前剩余数量 *",m?.qty??"","number","这是当前可用库存，不需要回填已卖掉的旧货。")+
 field("legacyGramsPerBag","每包克重（可选）",m?.legacyGramsPerBag??"","number","只有库存按克、又准备按包卖时才需要；不知道重量可以留空，用独立包数批次管理。")+
 select("legacyUsageStatus","使用状态（必选）",STATUS,m?.usageStatus||"")+
 field("legacyPriceJin","参考售价（元/斤）",m?.legacyPriceJin??"","number","每个琉璃珠等级可填不同价格。")+
 field("legacyPriceBag","参考售价（元/包）",m?.legacyPriceBag??"","number")+
 field("legacyPricePiece","参考售价（元/颗或个）",m?.legacyPricePiece??"","number")+
 '<div class="field wide"><label>批次备注</label><textarea class="textarea" name="legacyNotes" rows="2" placeholder="例如旧退坑包混装、等级区分办法、需要如实说明的瑕疵">'+e(m?.notes||"")+'</textarea></div></div>'+
 '<div id="legacy-color-test"'+(group==="metal"?"":' style="display:none"')+'><div class="line-entry" style="margin-top:12px">'+
 '<label class="check"><input type="checkbox" name="legacyTestEnabled"><span>＋ 填写一次保色测试（可选）</span></label>'+
 '<div class="hint">不勾选就不展开，不影响保存；以前的测试记录不会被删除。</div>'+
 '<div id="legacy-test-fields" style="display:none;margin-top:8px"><div class="form-grid">'+
 field("legacyTestDate","测试日期",today(),"date")+
 select("legacyTestMethod","测试方式",["日常佩戴","清水接触","汗液接触","其他"],"")+
 select("legacyTestOutcome","测试结论",["测试中","达标","不达标"],"")+
 field("legacyTestQty","本次参与测试数量（可不填）","","number")+
 field("legacyTestDiscard","其中实际报废数量（可不填）","","number","此数量将从可用库存中扣除；未报废的测试品不会扣库存。")+
 '<div class="field wide"><label>观察备注</label><textarea class="textarea" name="legacyTestNote" rows="2" placeholder="例如一周后局部褪色">'+""+'</textarea></div></div></div>'+history+'</div></div>'+
 '<div class="hint" style="margin-top:12px">按斤出售时：1斤=500克。若既按斤又按包卖，请先提供每包克重；否则按包单独建一个批次，避免错误扣库存。</div>';
 openModal(m?"编辑历史库存批次":"登记历史库存批次",body,"legacy-save-lot","保存历史库存");
}
function saveLot(){
 const root=$("#editor"),id=val(root,"legacyId"),old=id?byId(state.materials,id):null;
 if(id)required(old?.legacyStock,"原历史库存已不存在");
 const group=val(root,"legacyGroup"),name=val(root,"legacyName"),unit=val(root,"legacyStockUnit");
 required(Object.hasOwn(GROUP_LABEL,group),"请选择旧货类别");
 required(name&&name.length<=110,"请填写不超过110字的批次名称");
 required(UNIT.includes(unit),"请选择库存单位");
 if(old)required(old.legacyGroup===group&&old.unit===unit,"已有批次不能更改类别或库存单位，请另外新建批次");
 const raw=val(root,"legacyQty"),qty=Number(raw);
 required(raw!==""&&Number.isFinite(qty)&&qty>=0&&qty<=1e8,"请填写正确的当前剩余数量");
 if(["包","颗","个"].includes(unit))required(Number.isInteger(qty),"按包／颗／个计数时数量必须是整数");
 const grade=val(root,"legacyGrade"),color=val(root,"legacyColorClass"),status=val(root,"legacyUsageStatus");
 if(group==="glass")required(grade&&grade.length<=40,"请填写琉璃珠等级");
 if(group==="metal")required(COLORS.includes(color),"请选择保色等级");
 required(STATUS.includes(status),"请选择未用、已用、已卖或自戴");
 const priceJin=optionalNumber(root,"legacyPriceJin","元/斤参考售价"),
  priceBag=optionalNumber(root,"legacyPriceBag","元/包参考售价"),
  pricePiece=optionalNumber(root,"legacyPricePiece","元/颗/个参考售价"),
  gramsPerBag=optionalNumber(root,"legacyGramsPerBag","每包克重");
 if(gramsPerBag!==null)required(gramsPerBag>0,"每包克重必须大于零");
 const tests=[...(old?.legacyTests||[])];
 let discard=0;
 if(group==="metal"&&checked(root,"legacyTestEnabled")){
  const method=val(root,"legacyTestMethod"),outcome=val(root,"legacyTestOutcome"),testDate=val(root,"legacyTestDate");
  required(method&&outcome,"展开测试后，请选择测试方式和结果");
  required(testDate&&testDate<=today(),"请填写正确的测试日期");
  const testQty=optionalNumber(root,"legacyTestQty","测试数量"),
   consumed=optionalNumber(root,"legacyTestDiscard","报废数量");
  discard=consumed||0;
  required(testQty===null||discard<=testQty,"报废数量不能超过参加测试的数量");
  tests.push({id:uid(),date:testDate,method,outcome,testQty,discardQty:discard,note:val(root,"legacyTestNote").slice(0,1000),createdAt:new Date().toISOString()});
 }
 required(discard<=qty,"本次测试报废量不能超过当前库存");
 const remainder=round(qty-discard,6);
 if(["包","颗","个"].includes(unit))required(Number.isInteger(remainder),"整包／颗／个报废量必须是整数");
 const data={...old,id:old?.id||uid(),kind:group==="metal"?"metal":"bead",legacyStock:true,
  historicalCostUnknown:true,inventoryOrigin:"legacy",series:"平价琉璃系列",
  legacyGroup:group,legacyGrade:group==="glass"?grade:"",legacyColorClass:group==="metal"?color:"",
  legacyPriceJin:priceJin,legacyPriceBag:priceBag,legacyPricePiece:pricePiece,
  legacyGramsPerBag:gramsPerBag,legacyTests:tests,
  name,qty:remainder,initialQty:old?.initialQty??qty,unit,unitCost:0,totalPurchaseCost:null,
  source:"历史遗留库存（旧阶段已回本）",purchaseDate:old?.purchaseDate||"",
  notes:val(root,"legacyNotes").slice(0,1000),usageStatus:status,
  subtype:group==="glass"?"琉璃珠":group==="wood"?"禾木珠":"",
  beadGroup:group==="wood"?"有机/香木类":"待确认品类",
  purchaseType:group!=="metal"?"loose":undefined,
  accessoryGroup:group==="metal"?"历史旧配件":"",accessoryType:group==="metal"?"旧合金／铜混装":"",
  spec:old?.spec||"",shape:old?.shape||"",weight:old?.weight||0,
  createdAt:old?.createdAt||new Date().toISOString(),
  legacyRecordedAt:old?.legacyRecordedAt||today()};
 return commit(()=>{
  if(old)state.materials[state.materials.findIndex(x=>x.id===old.id)]=data;
  else state.materials.push(data);
 },"历史库存已保存"+(discard?"，已扣减报废 "+fmt(discard)+unit:""));
}
function modesFor(m){
 const unit=m.unit,grams=n(m.legacyGramsPerBag);
 if(unit==="克")return [{id:"jin",label:"按斤出售（1斤=500克）",unit:"斤",factor:500,reference:m.legacyPriceJin},
  {id:"gram",label:"按克出售",unit:"克",factor:1,reference:m.legacyPriceJin===null?null:n(m.legacyPriceJin)/500},
  ...(grams>0?[{id:"bag",label:"按包出售（每包"+fmt(grams)+"克）",unit:"包",factor:grams,reference:m.legacyPriceBag}]:[])];
 if(unit==="包")return [{id:"bag",label:"按包出售",unit:"包",factor:1,reference:m.legacyPriceBag}];
 if(unit==="颗"||unit==="个")return [{id:"piece",label:"按"+unit+"出售",unit,factor:1,reference:m.legacyPricePiece}];
 return [];
}
function saleForm(materialId){
 const m=byId(state.materials,materialId);
 required(m?.legacyStock,"没有找到历史库存");
 required(n(m.qty)>0,"这批历史库存已经没有可出售数量");
 const modes=modesFor(m);required(modes.length,"库存单位不支持当前销售方式");
 const rows=modes.map(x=>[x.id,x.label]);
 const body='<input type="hidden" name="legacyMaterialId" value="'+e(m.id)+'">'+
 '<div class="info" style="margin-bottom:10px">'+e(m.name)+' · '+e(lotTitle(m))+' · 当前库存 '+fmt(m.qty)+' '+e(m.unit)+'。<b>历史采购成本不详</b>，本次只核算回款。</div>'+
 '<div class="form-grid">'+select("legacySaleMode","销售方式",rows,modes[0].id)+
 field("legacySaleQty","出售数量（按选择的销售单位） *",1,"number")+
 '<div class="field wide"><button type="button" class="btn small" data-action="legacy-use-asking">按该等级参考单价填写成交额</button><div class="hint" id="legacy-price-hint">参考售价仅用于填单，最终请以实际成交价为准。</div></div>'+
 field("legacySaleGross","实际商品成交金额（元） *","","number","这是整笔成交总金额，不是单价；不要把参考售价当作已经收到的钱。")+
 field("legacySaleShipping","卖家承担的运费（元）",0,"number")+
 field("legacySaleFee","平台手续费（元）",0,"number")+
 select("legacySaleChannel","销售渠道",channels,"闲鱼")+
 field("legacySaleDate","出售日期",today(),"date")+
 '<div class="field wide"><label>销售备注</label><textarea class="textarea" name="legacySaleNotes" rows="2" placeholder="例如：保色差混装如实告知、该等级一包多少克"></textarea></div></div>'+
 '<div class="hint" id="legacy-sale-remaining" style="margin-top:10px"></div>';
 openModal("历史物料清仓出售",body,"legacy-save-sale","确认售出并扣库存");
 updateSaleHint();
}
function updateSaleHint(){
 const root=$("#editor");if(!root||!f(root,"legacySaleMode"))return;
 const m=byId(state.materials,val(root,"legacyMaterialId"));
 if(!m)return;
 const mode=modesFor(m).find(x=>x.id===val(root,"legacySaleMode"));
 if(!mode)return;
 const qty=Number(val(root,"legacySaleQty")),deduction=qty*mode.factor;
 const hint=$("#legacy-sale-remaining"),reference=$("#legacy-price-hint");
 if(hint)hint.textContent="本次将扣库存 "+(Number.isFinite(deduction)?fmt(deduction):"—")+" "+m.unit+"；目前剩余 "+fmt(m.qty)+" "+m.unit+(Number.isFinite(deduction)&&deduction>n(m.qty)?"（库存不足）":"");
 if(reference)reference.textContent=mode.reference===null||mode.reference===undefined?
  "这个等级尚未填写参考售价，请按实际成交金额录入。":
  "当前批次参考价：¥"+Number(mode.reference).toFixed(2)+"/"+mode.unit+"；参考总金额：¥"+(Math.max(0,qty||0)*Number(mode.reference)).toFixed(2)+"。";
}
function fillAsking(){
 const root=$("#editor");required(root,"请先打开清仓出售窗口");
 const m=byId(state.materials,val(root,"legacyMaterialId")),mode=modesFor(m).find(x=>x.id===val(root,"legacySaleMode"));
 required(mode?.reference!==null&&mode?.reference!==undefined,"该等级还没有设置参考售价");
 const qty=Number(val(root,"legacySaleQty"));
 required(Number.isFinite(qty)&&qty>0,"请先填正确的出售数量");
 f(root,"legacySaleGross").value=(qty*Number(mode.reference)).toFixed(2);
 toast("已按参考单价填入，可再修改为实际成交金额");
}
function saveSale(){
 const root=$("#editor"),m=byId(state.materials,val(root,"legacyMaterialId"));
 required(m?.legacyStock,"原库存批次已不存在");
 const mode=modesFor(m).find(x=>x.id===val(root,"legacySaleMode"));
 required(mode,"请选择允许的出售方式");
 const raw=val(root,"legacySaleQty"),qty=Number(raw);
 required(raw!==""&&Number.isFinite(qty)&&qty>0&&qty<=1e8,"出售数量必须大于0");
 if(["包","颗","个"].includes(mode.unit))required(Number.isInteger(qty),"按包、颗或个出售时必须是整数数量");
 const stockDeduction=round(qty*mode.factor,6);
 required(stockDeduction>0&&stockDeduction<=n(m.qty)+0.0000001,"这批旧货库存不足；请检查克重、包数和出售数量");
 const gross=optionalNumber(root,"legacySaleGross","实际成交总金额"),
  shipping=optionalNumber(root,"legacySaleShipping","运费")??0,
  fee=optionalNumber(root,"legacySaleFee","手续费")??0;
 required(gross!==null,"请填入实际成交总金额，不能仅靠参考售价自动完成");
 const date=val(root,"legacySaleDate"),channel=val(root,"legacySaleChannel");
 required(date&&date<=today(),"出售日期无效或在未来");
 required(channels.includes(channel),"请选择销售渠道");
 const s={id:uid(),materialId:m.id,name:m.name,legacyGroup:m.legacyGroup,
  legacyGroupLabel:GROUP_LABEL[m.legacyGroup]||"",grade:m.legacyGroup==="glass"?m.legacyGrade:m.legacyColorClass,
  saleQty:qty,saleUnit:mode.unit,stockDeduction,stockUnit:m.unit,
  referencePrice:mode.reference??null,gross:round(gross,2),shipping:round(shipping,2),fee:round(fee,2),
  net:round(gross-shipping-fee,2),channel,date,notes:val(root,"legacySaleNotes").slice(0,1000),
  historicalCostUnknown:true,createdAt:new Date().toISOString()};
 return commit(()=>{
  required(n(m.qty)>=stockDeduction-0.0000001,"出售前库存发生变化，请重新核对");
  m.qty=round(Math.max(0,n(m.qty)-stockDeduction),6);
  if(!Array.isArray(state.legacySales))state.legacySales=[];
  state.legacySales.push(s);
 },"已记录历史物料清仓 · 净回款 "+money(s.net));
}
function reverseSale(id){
 const record=sales().find(x=>x.id===id);
 if(!record)return toast("清仓流水不存在");
 const m=byId(state.materials,record.materialId);
 if(!m)return toast("原历史库存已不存在，不能直接退回，请先检查备份");
 if(!confirm("确定撤销「"+record.name+"」这笔历史物料销售，并退回 "+fmt(record.stockDeduction)+" "+record.stockUnit+" 库存吗？"))return;
 commit(()=>{
  m.qty=round(n(m.qty)+n(record.stockDeduction),6);
  state.legacySales=state.legacySales.filter(x=>x.id!==id);
 },"清仓销售已撤销，库存已恢复");
}
function deleteLot(id){
 const m=byId(state.materials,id);
 if(!m?.legacyStock)return toast("历史库存批次不存在");
 if(sales().some(s=>s.materialId===id))return toast("已有清仓流水，不能删除历史库存批次；可盘点为0");
 if(state.products.some(p=>p.type==="hand"&&(p.components||[]).some(x=>x.id===id)))return toast("该批次已被手作配方引用，不能删除");
 if(!confirm("确定删除历史库存批次「"+m.name+"」吗？此操作会一并删除它的保色测试记录。"))return;
 commit(()=>{state.materials=state.materials.filter(x=>x.id!==id)},"历史库存批次已删除");
}
function initFormUI(){
 const root=$("#editor");if(!root)return;
 const group=val(root,"legacyGroup"),grade=$("#legacy-grade-wrap"),colors=$("#legacy-color-wrap"),test=$("#legacy-color-test");
 if(grade)grade.style.display=group==="glass"?"":"none";
 if(colors)colors.style.display=group==="metal"?"":"none";
 if(test)test.style.display=group==="metal"?"":"none";
 const enabled=checked(root,"legacyTestEnabled"),fields=$("#legacy-test-fields");
 if(fields)fields.style.display=enabled?"":"none";
}
document.addEventListener("change",ev=>{
 if(!ev.target.closest("#editor"))return;
 if(ev.target.matches('[name="legacyGroup"],[name="legacyTestEnabled"]'))initFormUI();
 if(ev.target.matches('[name="legacySaleMode"],[name="legacySaleQty"]'))updateSaleHint();
});
document.addEventListener("input",ev=>{
 if(ev.target.matches('#editor [name="legacySaleQty"]'))updateSaleHint();
});
window.LegacyClearance={renderSection,renderSalesSection,openLot,saveLot,saleForm,saveSale,reverseSale,deleteLot,fillAsking,modesFor};
if(ui.tab==="materials"||ui.tab==="sales")render();
})();