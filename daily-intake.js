(function(){"use strict";
const q=id=>document.getElementById(id),T=x=>String(x??"").trim(),E=x=>T(x).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
// Local constants: do not rely on separately cached index.html exposing these names.
const BEAD_PURCHASE_TYPES=[["loose","散珠（单颗）"],["strand","素串（整串原料）"],["semi","半成品（未完成饰品）"]];
const BEAD_PURCHASE_LABEL=Object.fromEntries(BEAD_PURCHASE_TYPES);
let draft=null;let rememberedUnit="";let imageData="";let imageBusy=false;let batchDraft=[];let batchImages={};
function extractLabeledAmounts(input){
 const t=String(input||"").replace(/￥/g,"¥").replace(/[，。；;\n]/g," ");
 const number="(\\d+(?:\\.\\d{1,3})?)",currency="(?:元|块钱|块|圆)?";
 function pick(pattern){const m=t.match(new RegExp(pattern+"\\s*(?:是|为|大概|约|:|：|=|¥)?\\s*¥?\\s*"+number+"\\s*"+currency,"i"));return m?Number(m[1]):null}
 const sell="(?:建议(?:卖|售价|定价|价格)?|摆摊(?:建议)?(?:卖|售价|价)?|准备卖|打算卖|想卖|标价|售价|卖价|卖出去|卖)";
 const value="(?:实际价值|真实价值|市面价值|市场价值|参考价值|实际估值|估算价值|市值|估值|价值|值)";
 const suggested=pick(sell),actual=pick(value);
 const excluded=t.replace(new RegExp("(?:"+sell+"|"+value+")\\s*(?:是|为|大概|约|:|：|=|¥)?\\s*¥?\\s*\\d+(?:\\.\\d+)?\\s*(?:元|块钱|块|圆)?","gi")," ");
 const purchase=window.LocalAssistantPriceParser?.(excluded)??null;
 return {purchase,suggested,actual};
}
function splitPurchases(input){
 const t=String(input||"").replace(/\r/g,"").trim();
 const parts=t.replace(/(?:，|,)?\s*(?=(?:另外|此外|还有|再买(?:了|入)|又买(?:了|入)))/g,"\n")
  .replace(/(^|\n)\s*(?:\d{1,2}[、.)．]|[一二三四五六七八九十][、.])\s*/g,"$1")
  .split(/\n|；|;/g).map(x=>x.trim()).filter(Boolean);
 return parts.length>1?parts:[t];
}
function preparePurchase(raw){
 const row=parse(raw),amounts=extractLabeledAmounts(raw);
 row.price=amounts.purchase;row.suggested=amounts.suggested;row.actual=amounts.actual;
 return row;
}
function parse(raw){
 const text=T(raw).replace(/[，,。；;\n]/g," ");if(!text)throw Error("请输入日常进货描述");
 const size=window.BeadConversion.extractSize(text);
 const length=(text.match(/\d+(?:\.\d+)?\s*(?:cm|厘米|公分)/i)||[])[0]||"";
 const counts=[...text.matchAll(/(\d+(?:\.\d+)?)\s*(颗|串|个|件|包|米|厘米|克|卷|套|片)/g)];
 const strand=counts.find(x=>x[2]==="串"),beads=counts.find(x=>x[2]==="颗"),other=counts.find(x=>/^(个|件|包|卷|套|米|克|片)$/.test(x[2]));
 const half=/半成品|半串|半制品/.test(text),rawStrand=/素串|毛坯串|原料串|整串|一串|串珠/.test(text),singleLoose=/散珠|单颗|散装/.test(text);
 const finished=!half&&/外购成品|买的成品|现成.{0,3}(?:手链|项链|耳环|手串|戒指)|成品(?:手链|项链|耳环|手串|戒指)|直接卖/.test(text);
 const kind=finished?"finished":/龙虾扣|延长链|开口圈|耳钩|耳夹|隔珠|金属|链条|扣头|配件/.test(text)?"metal":/弹力线|鱼线|铜丝|钢丝|包装袋|礼盒|绒布袋|胶水|耗材/.test(text)?"supply":"bead";
 const words=["淡水珍珠","海水珍珠","仿珍珠","珍珠","贝珠","黄水晶","黑发晶","红胶花","虎眼石","月光石","白水晶","粉水晶","紫水晶","葡萄石","萤石","紫萤石","玛瑙","碧玺","菩提","檀木","木珠","米珠"];
 const category=words.find(w=>text.includes(w))||crystalNickname(text)||"";const shape=detectBeadShape(text,inferStoneClass(category),category,category);
 const lengthImpliesStrand=kind==="bead"&&Boolean(length)&&!singleLoose&&!beads;
 const item=kind==="finished"?(text.match(/珍珠(?:手链|项链|手串)|(?:手链|项链|手串|耳环|戒指|发夹|饰品)/)||[])[0]||"外购成品":kind==="metal"?(text.match(/龙虾扣|延长链|开口圈|耳钩|耳夹|隔珠|链条|扣头/)||[])[0]||"金属配件":kind==="supply"?(text.match(/弹力线|鱼线|铜丝|钢丝|包装袋|礼盒|绒布袋|胶水/)||[])[0]||"耗材":category||"待填写珠子名称";
 let qty,unit;
 if(finished){qty=other?Number(other[1]):strand?Number(strand[1]):1;unit="件"}
 else if(half||rawStrand||lengthImpliesStrand){qty=strand?Number(strand[1]):1;unit="串"}
 else if(beads){qty=Number(beads[1]);unit="颗"}
 else if(other){qty=Number(other[1]);unit=other[2]==="片"?"个":other[2]}
 else if(strand){qty=Number(strand[1]);unit="串"}
 else{qty=1;unit=kind==="bead"?"颗":"个"}
 return {text,item,category,shape,purchaseType:half?"semi":rawStrand||lengthImpliesStrand||strand?"strand":"loose",kind,qty,unit,size,length,beads:beads?Number(beads[1]):null,half,rawStrand,price:window.LocalAssistantPriceParser?.(text)??null,source:(text.match(/小红书|淘宝|拼多多|1688|抖音|微信/)||[])[0]||"",approx:/约\d|大概|大约|左右|估计|差不多/.test(text)};
}
function previewBatch(parts){
 if(parts.length<2||parts.length>20)throw Error("每次批量录入请写2至20条，每件物料用换行或分号分开");
 batchDraft=parts.map(preparePurchase);batchImages={};draft=null;
 const container=q("daily-preview");container.style.display="block";
 const options=(items,selected)=>items.map(([v,name])=>'<option value="'+E(v)+'" '+(v===selected?'selected':'')+'>'+E(name)+'</option>').join("");
 const row=(x,i)=>{
  const cv=window.BeadConversion.estimate({size:x.size,length:x.length,strands:x.unit==="串"?x.qty:1,spokenTotal:x.beads,spokenApprox:x.approx});
  const qty=x.kind==="bead"&&x.unit==="颗"&&!x.beads&&cv.beadTotal?cv.beadTotal:x.qty;
  return '<section class="di-batch-row" data-purchase-row="'+i+'" style="padding:10px;border:1px solid #dce4dd;border-radius:11px;margin:9px 0;background:#fff">'+
  '<div class="local-row" style="justify-content:space-between"><b>物料 '+(i+1)+'</b><button type="button" class="local-btn" data-batch="remove" data-row="'+i+'">移除</button></div>'+
  '<div class="di-batch-grid">'+
  '<label>物品名称<input class="local-field" data-col="name" value="'+E(x.item)+'"></label>'+
  '<label>类型<select class="local-field" data-col="kind">'+options([["bead","珠子物料"],["metal","金属配件"],["supply","耗材"],["finished","外购成品"]],x.kind)+'</select></label>'+
  '<label>具体类型<select class="local-field" data-col="purchaseType">'+options(BEAD_PURCHASE_TYPES,x.purchaseType)+'</select></label>'+
  '<label>珠子大类<select class="local-field" data-col="group">'+options(STONE_CLASS_NAMES.map(v=>[v,v]),inferStoneClass(x.category||x.item))+'</select></label>'+
  '<label>形状<input class="local-field" data-col="shape" value="'+E(x.shape||"")+'"></label>'+
  '<label>规格<input class="local-field" data-col="spec" value="'+E([x.size,x.length].filter(Boolean).join(" · "))+'"></label>'+
  '<label>数量<input type="number" min="0.0001" step="any" class="local-field" data-col="qty" value="'+qty+'"></label>'+
  '<label>单位<select class="local-field" data-col="unit">'+options(["颗","串","个","件","包","卷","米","克","套"].map(v=>[v,v]),x.unit)+'</select></label>'+
  '<label>购入总价（元）<input type="number" min="0" step="any" class="local-field" data-col="price" value="'+(x.price??"")+'"></label>'+
  '<label>建议售价（元/单位）<input type="number" min="0" step="any" class="local-field" data-col="suggested" value="'+(x.suggested??"")+'"></label>'+
  '<label>实际价值（元/单位）<input type="number" min="0" step="any" class="local-field" data-col="actual" value="'+(x.actual??"")+'"></label>'+
  '<label>单颗克重g<input type="number" min="0" step="any" class="local-field" data-col="weight" placeholder="可选"></label>'+
  '</div><label>照片（可选）<input type="file" accept="image/*" class="local-field" data-batch-photo="'+i+'"></label><img data-batch-preview="'+i+'" alt="照片" style="display:none;width:64px;height:64px;object-fit:cover;border-radius:8px"><div class="local-help">'+E(x.text)+'</div></section>';
 };
 container.innerHTML='<div class="local-help">识别到 '+parts.length+' 笔进货。逐条核对价格、类型和数量后一起保存。</div>'+
 '<div class="di-batch-grid"><label>购买渠道（必选）<select class="local-field" id="batch-source">'+purchaseSourceOptions(batchDraft.find(x=>x.source)?.source||"")+'</select></label><label>店铺备注<input id="batch-source-detail" class="local-field" placeholder="可选"></label><label>进货日期<input id="batch-date" class="local-field" type="date" value="'+today()+'"></label></div>'+
 '<div id="batch-items">'+batchDraft.map(row).join("")+'</div><button class="local-btn main" type="button" data-batch="save">核对后批量入库</button>';
 q("local-status").textContent="";
}
async function saveBatchIntake(){
 const source=makePurchaseSource(q("batch-source").value,q("batch-source-detail").value),date=q("batch-date").value;
 if(!date||date>today())throw Error("请核对进货日期");
 const rows=[...q("batch-items").querySelectorAll("[data-purchase-row]")];
 if(!rows.length)throw Error("请至少保留一条进货");
 const value=(root,key)=>root.querySelector('[data-col="'+key+'"]')?.value?.trim()??"";
 const entries=rows.map((root,i)=>{
  const name=value(root,"name"),kind=value(root,"kind"),group=value(root,"group"),purchaseType=value(root,"purchaseType"),unit=value(root,"unit"),qty=Number(value(root,"qty")),raw=value(root,"price"),purchase=Number(raw);
  if(!name||name.startsWith("待填写"))throw Error("第"+(i+1)+"条请填写准确名称");
  if(!Number.isFinite(qty)||qty<=0)throw Error("第"+(i+1)+"条数量无效");
  if(raw===""||!Number.isFinite(purchase)||purchase<0)throw Error("第"+(i+1)+"条需要明确的进价");
  if(kind==="bead"&&!STONE_CLASS_NAMES.includes(group))throw Error("第"+(i+1)+"条请确认珠子大类");
  if(kind==="bead"&&!BEAD_PURCHASE_LABEL[purchaseType])throw Error("第"+(i+1)+"条请确认具体物料类型");
  if(kind==="finished"&&(unit!=="件"||!Number.isInteger(qty)))throw Error("第"+(i+1)+"条外购成品按整数件管理");
  const optional=key=>{const t=value(root,key);if(t==="")return null;const number=Number(t);if(!Number.isFinite(number)||number<0)throw Error("第"+(i+1)+"条的"+key+"不是有效金额或重量");return number};
  const suggested=optional("suggested"),actual=optional("actual"),weight=optional("weight");
  const id=uid(),createdAt=new Date().toISOString(),cost=round(purchase/qty,8),img=batchImages[root.dataset.purchaseRow]||"",spec=value(root,"spec"),shape=value(root,"shape");
  if(kind==="finished")return {product:true,data:{id,type:"out",name,source,notes:batchDraft[Number(root.dataset.purchaseRow)]?.text||"",producedQty:qty,stock:qty,price:suggested??0,actualValue:actual,buyPrice:cost,image:img,createdAt,sameOnline:false,cost:{unit:cost,material:cost,labor:0,stall:0,tool:0}}};
  return {product:false,data:{id,kind,name,purchaseType:kind==="bead"?purchaseType:undefined,beadGroup:kind==="bead"?group:"",subtype:kind==="bead"?name:"",shape:kind==="bead"?shape:"",spec,qty,initialQty:qty,unit,unitCost:cost,totalPurchaseCost:purchase,suggestedPrice:suggested??0,actualValue:actual,actualValueUnit:actual===null?"":unit,weight:kind==="bead"?(weight??0):0,source,purchaseDate:date,notes:batchDraft[Number(root.dataset.purchaseRow)]?.text||"",image:img,createdAt,grade:"普通",flaw:"",marketGram:0,isWelfare:false}};
 });
 if(!confirm("确认把 "+entries.length+" 笔进货保存到库存？\\n总进价 ¥"+entries.reduce((n,r)=>n+(r.product?r.data.buyPrice*r.data.stock:r.data.totalPurchaseCost),0).toFixed(2)))return;
 await commit(()=>{for(const entry of entries){if(entry.product)state.products.push(entry.data);else{state.materials.push(entry.data);if(entry.data.kind==="bead")usageAdd([entry.data])}}},"已批量保存 "+entries.length+" 笔进货");
 // commit rolls back on error internally; only clear the preview when all new IDs are present.
 if(entries.every(e=>(e.product?state.products:state.materials).some(x=>x.id===e.data.id))){
  batchDraft=[];batchImages={};q("daily-description").value="";q("daily-preview").style.display="none";
  q("local-status").textContent="已入库 "+entries.length+" 条";
 }
}
function preview(){
 const parts=splitPurchases(q("daily-description").value);if(parts.length>1){previewBatch(parts);return;}draft=preparePurchase(parts[0]);draft.conversion=window.BeadConversion.estimate({size:draft.size,length:draft.length,strands:draft.unit==="串"?draft.qty:1,spokenTotal:draft.beads,spokenApprox:draft.approx});if(draft.kind==="bead"&&draft.unit==="颗"&&!draft.beads&&draft.conversion.beadTotal)draft.qty=draft.conversion.beadTotal;const x=draft,box=q("daily-preview");box.style.display="block";
 box.innerHTML='<label>入库类型</label><select id="daily-kind" class="local-field">'+[["bead","散珠 / 素串 / 半成品"],["metal","金属配件"],["supply","耗材包装"],["finished","外购成品（非手作）"]].map(([v,l])=>'<option value="'+v+'" '+(v===x.kind?"selected":"")+'>'+l+'</option>').join("")+'</select>'+
 '<div id="daily-purchase-type-wrap"><label>具体物料类型（可修改）</label><select class="local-field" id="daily-purchase-type">'+BEAD_PURCHASE_TYPES.map(([value,label])=>'<option value="'+value+'" '+(value===x.purchaseType?'selected':'')+'>'+label+'</option>').join('')+'</select></div>'+
 '<label>物品名称</label><input id="daily-name" class="local-field" value="'+E(x.item)+'">'+
 '<div id="daily-shape-box"><label>形状 / 珠型</label><input id="daily-shape-search" class="local-field" type="search" placeholder="输入关键词搜索珠形" style="margin-bottom:7px"><select id="daily-shape-select" class="local-field"><option value="">点击展开珠形选项</option></select><label>已选形状 / 自定义形状</label><input id="daily-shape" class="local-field" value="'+E(x.shape||'')+'" placeholder="从上方选择，或者直接输入新形状"></div>'+
 '<div class="local-row"><div class="local-narrow"><label>规格</label><input id="daily-spec" class="local-field" value="'+E([x.size,x.length].filter(Boolean).join(" · "))+'"></div><div class="local-narrow"><label>数量</label><input id="daily-qty" type="number" class="local-field" min="0.0001" step="any" value="'+x.qty+'"></div></div>'+
 '<div class="local-row"><div class="local-narrow"><label>单位</label><select class="local-field" id="daily-unit">'+["颗","串","个","件","包","卷","米","厘米","克","套"].map(v=>'<option value="'+v+'" '+(v===x.unit?"selected":"")+'>'+v+'</option>').join("")+'</select></div><div class="local-narrow"><label>实际购入总价（元）</label><input id="daily-total" class="local-field" type="number" min="0" step="any" value="'+(x.price??"")+'"></div></div>'+
 '<div class="local-row"><div class="local-narrow"><label>建议售价（元/当前单位）</label><input id="daily-suggested-price" class="local-field" type="number" min="0" step="any" placeholder="可留空" value="'+(x.suggested??"")+'"></div><div class="local-narrow"><label>实际价值参考（元/当前单位）</label><input id="daily-actual-value" class="local-field" type="number" min="0" step="any" placeholder="可留空" value="'+(x.actual??"")+'"></div></div>'+
 '<div class="local-row"><div class="local-narrow"><label>单颗克重（g，估值可用）</label><input id="daily-bead-weight" class="local-field" type="number" min="0" step="any" placeholder="可留空"></div><div class="local-narrow"><div id="daily-value-preview" class="local-help" aria-live="polite"></div></div></div>'+
 '<div id="daily-bead-convert" class="local-help"></div>'+
 '<div class="local-row"><div class="local-narrow"><label>购买渠道 *</label><select id="daily-source-channel" class="local-field">'+purchaseSourceOptions(splitPurchaseSource(x.source).channel)+'</select><input id="daily-source-detail" class="local-field" placeholder="店铺、直播间等补充说明" value="'+E(splitPurchaseSource(x.source).detail)+'"></div><div class="local-narrow"><label>日期</label><input id="daily-date" type="date" class="local-field" value="'+today()+'"></div></div>'+
 '<div class="di-full"><label>物料 / 成品图片（可选）</label><div class="di-photo-grid"><div class="di-photo-cell"><label>从相册选择</label><input id="daily-image-file" type="file" accept="image/*" class="di-file"></div><div class="di-photo-cell"><label>用相机拍照</label><input id="daily-image-camera" type="file" accept="image/*" capture="environment" class="di-file"></div></div><div class="local-row" style="margin:7px 0"><button type="button" class="local-btn main" data-daily="camera-api">📷 网页相机（备用）</button><button type="button" class="local-btn" data-daily="paste-photo">粘贴已复制图片</button></div><div class="di-photo-preview"><img id="daily-image-preview" alt="进货图片预览" style="display:none;width:86px;height:86px;object-fit:cover;border-radius:10px"><div class="di-photo-info"><div id="daily-image-status" class="local-help">未选择图片</div><button type="button" class="local-btn" data-daily="edit-photo">✎ 编辑图片</button><button type="button" class="local-btn" data-daily="remove-image">移除图片</button></div></div></div>'+
 '<label>备注</label><textarea id="daily-notes" class="local-field">'+E(x.text)+'</textarea>'+
 '<div id="daily-cost" class="local-help"></div><button class="local-btn main" data-daily="save">核对后确认入库</button>';
imageData="";
 // Compact after rendering: existing pair rows remain two columns; single fields are grouped into two/three columns.
 const layoutGrid=document.createElement("div");layoutGrid.className="di-grid";
 const fullItems=new Set(["daily-shape-box","daily-bead-convert"]);
 const nodes=Array.from(box.children);
 for(let i=0;i<nodes.length;){
  const node=nodes[i];
  if(node.classList.contains("local-row")){node.classList.add("di-full");layoutGrid.append(node);i++;continue;}
  if(node.id&&fullItems.has(node.id)){node.classList.add("di-full");layoutGrid.append(node);i++;continue;}
  if(node.classList.contains("di-full")){layoutGrid.append(node);i++;continue;}
  if(node.tagName==="LABEL"&&nodes[i+1]){
   const input=nodes[i+1];
   const wrap=document.createElement("div");wrap.className="di-field";
   if(input.id==="daily-image-file"||node.textContent.includes("物料 / 成品图片"))wrap.classList.add("di-full");
   wrap.append(node,input);layoutGrid.append(wrap);i+=2;continue;
  }
  if(node.id==="daily-purchase-type-wrap"){node.classList.add("di-field");layoutGrid.append(node);i++;continue;}
  node.classList.add("di-full");layoutGrid.append(node);i++;
 }
 box.append(layoutGrid);
 // Give long category and product names a full row; keep short numeric fields paired.
 for(const id of ['daily-kind','daily-purchase-type','daily-name'])q(id)?.closest('.di-field')?.classList.add('di-full');
 const picker=q("daily-shape-select"),shapeSearch=q("daily-shape-search"),shapeValue=q("daily-shape");
 function showShapes(){
  const family=shapeFamily(inferStoneClass(draft.category),draft.category,q("daily-name").value);
  const keyword=shapeSearch.value.trim(),options=sortedShapes(family,shapeValue.value).filter(x=>x.includes(keyword));
  picker.innerHTML='<option value="">'+(options.length?'点这里展开并选择形状':'无匹配结果，可在下方手填')+'</option>'+options.map(x=>'<option value="'+E(x)+'">'+E(x)+'</option>').join('');
  if(options.includes(shapeValue.value))picker.value=shapeValue.value;
 }
 picker.addEventListener("change",()=>{if(picker.value)shapeValue.value=picker.value;});
 shapeSearch.addEventListener("input",showShapes);
 shapeValue.addEventListener("input",()=>{showShapes();});
 q("daily-name").addEventListener("change",showShapes);
 showShapes();

 q("daily-kind").addEventListener("change",()=>{q("daily-purchase-type-wrap").style.display=q("daily-kind").value==="bead"?"":"none";});q("daily-kind").dispatchEvent(new Event("change"));const onImageChange=async e=>{const file=e.target.files?.[0];if(!file)return;imageBusy=true;q("daily-image-status").textContent="正在准备图片…";try{const original=await shrinkImage(file);const edited=await window.BeadPhotoEditor.open(original);if(edited){imageData=edited;const preview=q("daily-image-preview");preview.src=edited;preview.style.display="block";q("daily-image-status").textContent="已编辑图片，确认入库后保存。";}else q("daily-image-status").textContent="已取消编辑，原有图片未改变。";}catch(err){q("daily-image-status").textContent="图片处理失败："+err.message;}finally{imageBusy=false;e.target.value="";}};q("daily-image-file").addEventListener("change",onImageChange);q("daily-image-camera").addEventListener("change",onImageChange);
 for(const el of box.querySelectorAll("#daily-qty,#daily-total"))el.addEventListener("input",costPreview);q("daily-unit").addEventListener("change",changeUnit);q("daily-bead-weight").addEventListener("input",refreshValuePreview);q("daily-name").addEventListener("change",refreshValuePreview);q("daily-kind").addEventListener("change",refreshValuePreview);rememberedUnit=x.unit;refreshValuePreview();
 costPreview();
 q("local-status").textContent="已整理，请核对。"+(x.beads&&x.unit==="串"?"珠子约"+x.beads+"颗，仅作为备注；库存按串计。":"");
}
function marketValuePerStockUnit(){
 if(!draft||q("daily-kind")?.value!=="bead")return null;
 const perBead=Number(q("daily-bead-weight")?.value||0);
 if(!Number.isFinite(perBead)||perBead<=0)return null;
 const name=T(q("daily-name")?.value)||draft.category;
 const subtype=draft.category||crystalNickname(name)||name;
 const reference=marketReference({subtype,weight:perBead,grade:"普通",purchaseDate:today()});
 if(!Number.isFinite(reference)||reference<=0)return null;
 const unit=q("daily-unit")?.value;
 let count=1;
 if(unit==="串"){
  const cv=draft.conversion;
  if(!cv?.beadTotal||!cv?.strandCount)return null;
  count=cv.beadTotal/cv.strandCount;
 }else if(unit!=="颗")return null;
 return Math.round(perBead*reference*count*10000)/10000;
}
function refreshValuePreview(){
 const e=q("daily-value-preview");if(!e)return;
 const value=marketValuePerStockUnit();
 const unit=q("daily-unit")?.value||"颗";
 e.innerHTML=value!==null?'按已有克价估算：¥'+value.toFixed(2)+'/'+unit+' <button type="button" class="local-btn" data-daily="use-estimate" style="padding:4px 8px;font-size:12px">填入估算值</button>':'暂无可用估值，可手动填写';
}
function priceInputValue(id,label){
 const raw=q(id)?.value?.trim()??"";
 if(raw==="")return null;
 const value=Number(raw);
 if(!Number.isFinite(value)||value<0||value>10000000)throw Error(label+"必须是有效的非负金额");
 return value;
}
function changeUnit(){const unit=q("daily-unit").value,cv=draft?.conversion;if(cv&&draft.kind==="bead"&&(unit==="串"||unit==="颗")&&(rememberedUnit==="串"||rememberedUnit==="颗")){const oldQty=Number(q("daily-qty").value);if(rememberedUnit==="串"&&unit==="颗"){const per=cv.beadTotal?cv.beadTotal/cv.strandCount:null;if(per)q("daily-qty").value=Math.round(oldQty*per);else q("local-status").textContent="缺少可估算的珠径或串长，请先填写数量"}else if(rememberedUnit==="颗"&&unit==="串"){const per=cv.beadTotal?cv.beadTotal/cv.strandCount:null;if(per)q("daily-qty").value=Number((oldQty/per).toFixed(4));else q("local-status").textContent="缺少可估算的珠径或串长，请先填写数量"}}// Suggested and reference prices are amounts per inventory unit, not entire purchase totals.
 if(unit!==rememberedUnit&&draft?.kind==="bead"&&["串","颗"].includes(unit)&&["串","颗"].includes(rememberedUnit)){
  const c=draft.conversion,per=c?.beadTotal&&c?.strandCount?c.beadTotal/c.strandCount:null;
  if(per&&per>0){for(const id of ["daily-suggested-price","daily-actual-value"]){const input=q(id);if(!input||input.value.trim()==="")continue;const amount=Number(input.value);if(Number.isFinite(amount)&&amount>=0)input.value=Number((unit==="颗"?amount/per:amount*per).toFixed(4));}}
 }
 rememberedUnit=unit;costPreview();refreshValuePreview()}
function costPreview(){const qty=Number(q("daily-qty").value),val=q("daily-total").value,total=Number(val);const cv=draft?.conversion, unit=q("daily-unit").value;const info=cv&&draft.kind==="bead"&&cv.theoreticalPerStrand?"按珠径 "+cv.diameterMm+"mm 和串长 "+cv.lengthCm+"cm 估计每串约 "+cv.theoreticalPerStrand+"颗。"+(cv.source==="口述颗数"?"你口述约"+cv.beadTotal+"颗，优先使用口述数量。":"未提供颗数时按理论值估算。"):"没有足够规格估算每串颗数。";q("daily-bead-convert").textContent=draft?.kind==="bead"?info:"";q("daily-cost").textContent=val!==""&&qty>0&&Number.isFinite(total)?"平均进货成本 ¥"+(total/qty).toFixed(4)+"/"+unit+(draft?.kind==="bead"?"；整批总价保持不变。":""):"请填写总进价和数量";}
async function save(){
 if(!draft)throw Error("请先识别进货");
 if(imageBusy)throw Error("图片正在处理，请稍后再保存");
 const kind=q("daily-kind").value,purchaseType=q("daily-purchase-type").value,name=T(q("daily-name").value),shape=T(q('daily-shape')?.value),spec=T(q("daily-spec").value),qty=Number(q("daily-qty").value),unit=q("daily-unit").value,rawPrice=q("daily-total").value,price=Number(rawPrice),suggestedPrice=priceInputValue("daily-suggested-price","建议售价"),actualValue=priceInputValue("daily-actual-value","实际价值参考"),beadWeight=priceInputValue("daily-bead-weight","单颗克重"),source=makePurchaseSource(q("daily-source-channel").value,q("daily-source-detail").value),date=q("daily-date").value,notes=T(q("daily-notes").value);
 if(kind==="bead"&&!BEAD_PURCHASE_LABEL[purchaseType])throw Error("请选择具体类型：散珠、素串或半成品");
 if(!["bead","metal","supply","finished"].includes(kind))throw Error("请确认类型");
 if(!name||name.startsWith("待填写"))throw Error("请填写明确名称");
 if(!Number.isFinite(qty)||qty<=0||qty>100000)throw Error("请核对数量");
 if(rawPrice===""||!Number.isFinite(price)||price<0)throw Error("请填入实际进价");
 if(!date||date>today())throw Error("请检查进货日期");
 if(kind==="finished"&&(unit!=="件"||!Number.isInteger(qty)))throw Error("外购成品必须按件记录整数库存");
 if(!confirm("确认进货入库？\n"+name+" × "+qty+unit+"，共 ¥"+price.toFixed(2)+"\n"+(kind==="finished"?"外购成品，非手作":"物料库存")))return;
 const id=uid(),createdAt=new Date().toISOString(),cost=round(price/qty,8);
 if(kind==="finished"){
  const entry={id,type:"out",name,producedQty:qty,stock:qty,buyPrice:cost,price:suggestedPrice??0,actualValue:actualValue??null,source,notes:notes+"；规格："+spec,image:imageData||"",sameOnline:false,createdAt,cost:{unit:cost,material:cost,labor:0,stall:0,tool:0}};
  await commit(()=>state.products.push(entry),"外购成品已入库（非手作）");
 }else{
  const entry={id,kind,name,purchaseType:kind==="bead"?purchaseType:undefined,shape:kind==="bead"?shape:"",subtype:kind==="bead"?(draft.category||name):"",beadGroup:kind==="bead"?inferStoneClass(draft.category||name):"",spec,qty,initialQty:qty,unit,unitCost:cost,suggestedPrice:suggestedPrice??0,actualValue:actualValue??null,actualValueUnit:actualValue!==null?unit:"",totalPurchaseCost:price,source,purchaseDate:date,notes,createdAt,image:imageData||"",grade:"普通",flaw:"",weight:kind==="bead"?(beadWeight??0):0,isWelfare:false,qtyApprox:draft.approx&&unit==="颗",approxBeadCount:draft.conversion?.beadTotal||null,diameterMm:draft.conversion?.diameterMm||null,strandLengthCm:draft.conversion?.lengthCm||null,strandCount:unit==="串"?qty:draft.conversion?.strandCount||null,marketGram:0};
  await commit(()=>{state.materials.push(entry);if(kind==="bead")usageAdd([entry])},"物料已入库");
 }
 q("daily-description").value="";q("daily-preview").style.display="none";draft=null;imageData="";
 q("local-status").textContent="已保存；可在物料或外购成品列表中编辑照片与细节。";
}
q("local-daily").addEventListener("change",async e=>{
 const el=e.target.closest("[data-batch-photo]");if(!el)return;
 const file=el.files?.[0];if(!file)return;
 const index=el.dataset.batchPhoto;try{const image=await shrinkImage(file);const edited=await window.BeadPhotoEditor.open(image);if(edited){batchImages[index]=edited;const preview=q("daily-preview").querySelector('[data-batch-preview="'+index+'"]');if(preview){preview.src=edited;preview.style.display="block";}}}catch(err){q("local-status").textContent="图片处理失败："+err.message}finally{el.value=""}
});
q("local-daily").addEventListener("click",e=>{
 const b=e.target.closest("[data-batch]");if(!b)return;
 const action=b.dataset.batch;
 if(action==="save"){saveBatchIntake().catch(err=>q("local-status").textContent=err.message);return}
 if(action==="remove"){b.closest("[data-purchase-row]")?.remove();return}
});
q("local-daily").addEventListener("click",e=>{
 const a=e.target.closest("[data-daily]")?.dataset.daily;if(!a)return;
 if(a==="camera-api"||a==="paste-photo"){
  const onImage=async data=>{
   imageBusy=true;
   try{
    const edited=await window.BeadPhotoEditor.open(data);
    if(edited){imageData=edited;const image=q("daily-image-preview");if(image){image.src=edited;image.style.display="block";}q("daily-image-status").textContent="图片已编辑，确认入库后保存。";}
    else q("daily-image-status").textContent="已取消编辑，原有图片未改变。";
   }catch(err){q("daily-image-status").textContent="编辑失败："+err.message;}
   finally{imageBusy=false;}
  };
  q("daily-image-status").textContent=a==="camera-api"?"正在打开网页相机…":"正在读取复制的图片…";
  const operation=a==="camera-api"?window.BeadPhotoAccess.camera(onImage):window.BeadPhotoAccess.clipboard(onImage);
  operation.catch(err=>{q("daily-image-status").textContent=err.message||String(err);});
  return;
 }
 if(a==="use-estimate"){
  const estimate=marketValuePerStockUnit();
  if(estimate!==null)q("daily-actual-value").value=Number(estimate.toFixed(4));
  else q("daily-value-preview").textContent="暂无可用行情估值";
  return;
 }
  if(a==="edit-photo"){
  if(!imageData){q("daily-image-status").textContent="请先添加图片";return;}
  imageBusy=true;
  window.BeadPhotoEditor.open(imageData).then(edited=>{
   if(edited){imageData=edited;const image=q("daily-image-preview");if(image){image.src=edited;image.style.display="block";}q("daily-image-status").textContent="图片已编辑，确认入库后保存。";}
  }).catch(err=>{q("daily-image-status").textContent="编辑失败："+err.message;}).finally(()=>{imageBusy=false;});
  return;
 }
 if(a==="remove-image"){imageData="";if(q("daily-image-file"))q("daily-image-file").value="";if(q("daily-image-camera"))q("daily-image-camera").value="";if(q("daily-image-preview")){q("daily-image-preview").src="";q("daily-image-preview").style.display="none";}q("daily-image-status").textContent="图片已移除";return;}if(a==="clear"){imageData="";draft=null;q("daily-description").value="";q("daily-preview").style.display="none";return}
 Promise.resolve().then(a==="preview"?preview:save).catch(err=>q("local-status").textContent="无法完成："+err.message);
});
window.DailyIntake={parse,preparePurchase,splitPurchases,extractLabeledAmounts};
})();