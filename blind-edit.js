/* Saved blind-box editor. Changes the original batch and linked material records,
   not a duplicated purchase. Does not affect automatic blind-box draft storage. */
(function(){
"use strict";
const safe=x=>esc(x??"");
const existing=id=>state.materials.filter(m=>m.batchId===id);
const editing=()=>!!document.querySelector('#editor [name="editBatchId"]');
function sourceBatch(id){
 const batch=byId(state.batches,id);
 required(batch,'盲盒批次不存在');
 const linked=existing(id);
 return {batch,linked,premium:linked.filter(m=>!m.isWelfare),welfare:linked.filter(m=>m.isWelfare)};
}
function welfareRow(m={},index=0){
 const group=ensureStoneClass(m.beadGroup,m.subtype||m.name);
 return '<div class="line-entry" data-blind-welfare-row="'+index+'">'+
 '<input type="hidden" name="w-existing-id" value="'+safe(m.id||m.existingId||'')+'">'+
 '<div class="flex" style="justify-content:space-between"><b>福利珠分组 '+(index+1)+'</b><button type="button" class="btn small danger" data-welfare-remove="'+index+'">移除</button></div>'+
 '<div class="form-grid">'+
 field('w-name','名称',m.name||'',{required:true})+
 sel('w-status','使用状态（必选）',m.usageStatus||'',usageStatusOptions())+
 sel('w-group','散珠分类',group,groupOpts)+
 beadCategoryField('w-subtype','珠子品类',m.subtype||'',group)+
 field('w-shape','形状 / 珠型',m.shape||'')+
 field('w-spec','卡数 / 尺寸规格',m.spec||'')+
 num('w-qty','本组原始颗数',m.initialQty??m.qty??1,{min:1,step:1})+
 '</div>'+imageField('welfare-'+index,'本组照片（可选）')+'</div>';
}
function welfareRows(){
 return Array.from(document.querySelectorAll('#blind-welfare-rows [data-blind-welfare-row]')).map((r,i)=>({
  existingId:v(r,'w-existing-id'),name:v(r,'w-name'),usageStatus:v(r,'w-status'),
  beadGroup:v(r,'w-group'),subtype:v(r,'w-subtype'),shape:v(r,'w-shape'),
  spec:v(r,'w-spec'),qtyText:inputVal(r,'w-qty'),image:ui.images['welfare-'+i]||''
 }));
}
function rebuildWelfare(rows){
 const keep=Object.fromEntries(Object.entries(ui.images).filter(([key])=>!key.startsWith('welfare-')));
 rows.forEach((r,i)=>keep['welfare-'+i]=r.image||'');
 ui.images=keep;
 const area=document.getElementById('blind-welfare-rows');
 if(area)area.innerHTML=rows.map((r,i)=>welfareRow({...r,initialQty:r.qtyText??r.initialQty??r.qty},i)).join('');
 refresh();
}
function refresh(){
 if(!editing())return;
 const all=collectBlindRows().filter(hasBlindBeadContent);
 const welfare=welfareRows();
 const valid=welfare.every(r=>r.qtyText.trim()!==''&&Number.isInteger(Number(r.qtyText))&&Number(r.qtyText)>0);
 const count=all.length+(valid?welfare.reduce((a,r)=>a+Number(r.qtyText),0):0);
 const input=document.querySelector('#editor [name="totalQty"]');
 if(input)input.value=String(count);
 const info=document.getElementById('blind-qty-status');
 if(info){
  info.textContent=valid?'当前明细：优选 '+all.length+' 颗，福利 '+(count-all.length)+' 颗，整盒 '+count+' 颗。':'福利珠原始颗数必须是正整数。';
  info.style.color=valid?'#546b59':'#b64c49';
 }
}
function open(id){
 const {batch,premium,welfare}=sourceBatch(id);
 const photos={batch:batch.image||''};
 premium.forEach((m,i)=>photos['blind-'+i]=m.image||'');
 welfare.forEach((m,i)=>photos['welfare-'+i]=m.image||'');
 ui.images=photos;
 const body='<input type="hidden" name="editBatchId" value="'+safe(id)+'">'+
 '<div class="info">直接修改原盲盒，不会重新入库。原有珠子记录 ID、已用库存和手作关联会保留。</div>'+
 '<div class="form-grid" style="margin-top:12px">'+
 field('title','盲盒批次名称',batch.title||'',{required:true})+
 num('total','实付总成本（元）',batch.totalCost??0,{min:0})+
 field('totalQty','整盒总颗数（由明细计算）',batch.totalQty??0,{type:'number'})+
 sourceField('source',batch.source||'')+
 sel('split','成本分摊方式',batch.costSplit||'manual',[['manual','逐颗核对成本'],['even','重新平均分摊']])+
 field('date','进货日期',batch.date||today(),{type:'date'})+
 field('notes','整盒备注',batch.notes||'',{type:'textarea',wide:true})+
 '</div><div class="info" id="blind-qty-status" style="margin-top:9px"></div>'+
 imageField('batch','整盒照片 / 采购截图')+
 '<div class="hint" style="margin-top:9px">修改整盒价格后，可以逐颗调整成本使合计一致，或选择「重新平均分摊」。历史已售成品的成本快照不自动改写。</div>'+
 '<details style="margin-top:14px"><summary><b>优选珠明细（'+premium.length+' 颗）</b></summary>'+
 '<div class="actions" style="margin:10px 0"><button type="button" class="btn small" data-action="add-blind-row">＋ 新增优选珠</button><button type="button" class="btn small" data-action="duplicate-blind-row">复制上一颗</button></div>'+
 '<div id="blind-rows">'+premium.map((m,i)=>blindRow({...m,existingId:m.id,manualCost:m.unitCost},i)).join('')+'</div></details>'+
 '<details style="margin-top:14px"><summary><b>福利珠明细（'+welfare.length+' 组）</b></summary>'+
 '<div class="actions" style="margin:10px 0"><button type="button" class="btn small" data-welfare-add>＋ 添加福利珠分组</button></div>'+
 '<div id="blind-welfare-rows">'+welfare.map((m,i)=>welfareRow(m,i)).join('')+'</div></details>'+
 '<div class="hint" style="margin-top:12px">已经用于制作、已扣库存、被其他记录引用或有盘点记录的珠子，不能直接删除。编辑整盒名称、渠道、备注或照片则不受影响。</div>';
 openModal('编辑已保存盲盒',body,'save-blind-edit','保存修改');
 ui.images=photos;
 const totalInput=document.querySelector('#editor [name="totalQty"]');
 if(totalInput)totalInput.readOnly=true;
 refresh();
}
function planEdit(id,meta,premiumRows,welfareData){
 const {batch,linked}=sourceBatch(id);
 required(meta.title.trim(),'请填写盲盒批次名称');
 required(Number.isFinite(meta.total)&&meta.total>=0&&meta.total<=1e9,'实付总价无效');
 required(['even','manual'].includes(meta.split),'分摊方式无效');
 required(/^\d{4}-\d{2}-\d{2}$/.test(meta.date),'进货日期格式不正确');
 required(premiumRows.length>0,'至少保留一颗优选珠');
 required(premiumRows.length+welfareData.length<=1000,'单个盲盒不能超过1000行');
 const linkedIDs=new Set(),originalIDs=new Set(linked.map(m=>m.id));
 function fetchOld(row,isWelfare){
  if(!row.existingId)return null;
  const id=row.existingId;
  required(!linkedIDs.has(id),'重复的旧珠子记录编号');
  const m=byId(state.materials,id);
  required(m&&m.batchId===batch.id&&!!m.isWelfare===isWelfare,'珠子记录不属于本盲盒，请重新打开');
  linkedIDs.add(id);
  return m;
 }
 for(let i=0;i<premiumRows.length;i++){
  const r=premiumRows[i];
  required(r.name&&r.subtype,'第 '+(i+1)+' 颗优选珠缺少名称或品类');
  required(USAGE_STATUSES.includes(r.usageStatus),'第 '+(i+1)+' 颗优选珠请选择使用状态');
  required(STONE_CLASS_NAMES.includes(r.beadGroup),'第 '+(i+1)+' 颗优选珠分类无效');
  fetchOld(r,false);
 }
 const welfareSpecs=welfareData.map((r,i)=>{
  required(r.name&&r.subtype,'第 '+(i+1)+' 组福利珠缺少名称或品类');
  required(USAGE_STATUSES.includes(r.usageStatus),'第 '+(i+1)+' 组福利珠请选择使用状态');
  required(STONE_CLASS_NAMES.includes(r.beadGroup),'第 '+(i+1)+' 组福利珠分类无效');
  const amount=Number(r.qtyText);
  required(r.qtyText!==''&&Number.isInteger(amount)&&amount>0&&amount<=1000000,'第 '+(i+1)+' 组福利珠数量错误');
  const old=fetchOld(r,true);
  if(old){
   const used=Math.max(0,n(old.initialQty??old.qty)-n(old.qty));
   required(amount>=used,'「'+old.name+'」已经消耗 '+used+' 颗，不能减少到 '+amount+' 颗');
   if(state.adjustments.some(a=>a.materialId===old.id))required(amount===n(old.initialQty??old.qty),'「'+old.name+'」有盘点记录，请使用物料盘点功能调整库存');
  }
  return {...r,amount,old};
 });
 const cents=Math.round(meta.total*100);
 const allocations=meta.split==='even'
  ?premiumRows.map((_,i)=>Math.floor(cents/premiumRows.length)+(i<cents%premiumRows.length?1:0))
  :premiumRows.map((r,i)=>{
   const raw=String(r.manualCost??'').trim(),amount=Number(raw);
   required(raw!==''&&Number.isFinite(amount)&&amount>=0,'第 '+(i+1)+' 颗优选珠缺少成本');
   required(Math.abs(amount*100-Math.round(amount*100))<0.00001,'第 '+(i+1)+' 颗分摊成本最多两位小数');
   return Math.round(amount*100);
  });
 required(allocations.reduce((a,b)=>a+b,0)===cents,'优选珠成本合计必须等于整盒总价，可选择重新平均分摊');
 const premiums=premiumRows.map((r,i)=>{
  const old=r.existingId?byId(state.materials,r.existingId):null;
  return {...old,id:old?.id||uid(),kind:'bead',batchId:batch.id,isWelfare:false,
   purchaseType:'loose',name:r.name,usageStatus:r.usageStatus,beadGroup:ensureStoneClass(r.beadGroup,r.subtype),
   subtype:r.subtype,shape:r.shape||'',spec:r.spec||'',weight:n(r.weight),grade:r.grade||'普通',
   flaw:r.flaw||'',stallRange:r.stallRange||'',looseMarketPrice:r.looseMarketPrice||'',costHint:r.costHint||'',
   qty:old?n(old.qty):1,initialQty:old?n(old.initialQty??1):1,unit:'颗',unitCost:allocations[i]/100,
   image:r.image||'',source:meta.source,purchaseDate:meta.date,notes:old?.notes===batch.notes?meta.notes:(old?.notes||meta.notes),
   createdAt:old?.createdAt||new Date().toISOString(),marketGram:old?.marketGram||0,suggestedPrice:old?.suggestedPrice||0};
 });
 const welfare=welfareSpecs.map(r=>{
  const old=r.old,previous=old?n(old.initialQty??old.qty):0,remaining=old?n(old.qty)+r.amount-previous:r.amount;
  required(remaining>=0,'「'+r.name+'」库存不足');
  const oldAutomatic='盲盒余珠，未分配独立成本。'+(batch.notes||'');
  return {...old,id:old?.id||uid(),kind:'bead',batchId:batch.id,isWelfare:true,
   purchaseType:'loose',name:r.name,usageStatus:r.usageStatus,beadGroup:ensureStoneClass(r.beadGroup,r.subtype),
   subtype:r.subtype,shape:r.shape||'',spec:r.spec||'',qty:remaining,initialQty:r.amount,
   unit:'颗',unitCost:0,image:r.image||'',source:meta.source,purchaseDate:meta.date,
   notes:old?.notes&&old.notes!==oldAutomatic?old.notes:'盲盒余珠，未分配独立成本。'+meta.notes,
   grade:old?.grade||'普通',flaw:old?.flaw||'',weight:old?.weight||0,
   createdAt:old?.createdAt||new Date().toISOString()};
 });
 const removed=linked.filter(m=>!linkedIDs.has(m.id));
 for(const m of removed){
  required(n(m.qty)===n(m.initialQty??m.qty),'「'+m.name+'」已经消耗，不能删除');
  required(!state.products.some(p=>p.components?.some(c=>c.id===m.id)),'「'+m.name+'」被手作配方引用，不能删除');
  required(!state.adjustments.some(a=>a.materialId===m.id),'「'+m.name+'」已有库存盘点记录，不能删除');
  required(!(state.legacySales||[]).some(s=>s.materialId===m.id),'「'+m.name+'」已有销售记录，不能删除');
 }
 const totalQty=premiums.length+welfareSpecs.reduce((a,r)=>a+r.amount,0);
 const nextBatch={...batch,title:meta.title,totalCost:cents/100,totalQty,premiumQty:premiums.length,
  welfareQty:totalQty-premiums.length,source:meta.source,date:meta.date,notes:meta.notes,
  image:meta.image||'',costSplit:meta.split,editedAt:new Date().toISOString()};
 return {batch:nextBatch,materials:[...premiums,...welfare],removed:removed.map(m=>m.id),newItems:[...premiums,...welfare].filter(m=>!originalIDs.has(m.id))};
}
async function save(){
 const root=document.querySelector('#editor');
 required(root&&editing(),'请先打开盲盒编辑');
 const id=v(root,'editBatchId');
 const raw=inputVal(root,'total'),total=Number(raw);
 required(raw.trim()!==''&&Number.isFinite(total),'请输入正确的实付总成本');
 const meta={title:v(root,'title'),total,source:purchaseSource(root),date:v(root,'date'),
  notes:v(root,'notes'),split:v(root,'split'),image:ui.images.batch||''};
 const premiums=collectBlindRows().filter(hasBlindBeadContent),welfare=welfareRows();
 const plan=planEdit(id,meta,premiums,welfare);
 await commit(()=>{
  const idx=state.batches.findIndex(b=>b.id===id);
  required(idx>=0,'盲盒批次已不存在');
  state.batches[idx]=plan.batch;
  const updates=new Map(plan.materials.map(x=>[x.id,x])),removed=new Set(plan.removed);
  state.materials=state.materials.map(m=>updates.get(m.id)||m).filter(m=>!removed.has(m.id));
  state.materials.push(...plan.newItems);
  usageAdd(plan.newItems.filter(m=>!m.isWelfare));
 },'盲盒已更新，原库存及已用流水已保留');
}
document.addEventListener('click',event=>{
 if(!editing())return;
 if(event.target.closest('[data-welfare-add]')){
  event.preventDefault();
  rebuildWelfare([...welfareRows(),{name:'',subtype:'',beadGroup:'待确认品类',usageStatus:'',qtyText:'1',image:''}]);
  return;
 }
 const remove=event.target.closest('[data-welfare-remove]');
 if(remove){event.preventDefault();const rows=welfareRows();rows.splice(Number(remove.dataset.welfareRemove),1);rebuildWelfare(rows)}
});
document.addEventListener('input',event=>{
 if(editing()&&event.target?.matches('#blind-welfare-rows [name="w-qty"]'))refresh();
});
document.addEventListener('change',event=>{
 if(editing()&&event.target?.matches('#blind-welfare-rows [name="w-qty"]'))refresh();
});
window.BlindEdit={open,save,refresh,planEdit,editing};
})();