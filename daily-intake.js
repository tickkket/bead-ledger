(function(){"use strict";
const q=id=>document.getElementById(id),T=x=>String(x??"").trim(),E=x=>T(x).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
// Local constants: do not rely on separately cached index.html exposing these names.
const BEAD_PURCHASE_TYPES=[["loose","散珠（单颗）"],["strand","素串（整串原料）"],["semi","半成品（未完成饰品）"]];
const BEAD_PURCHASE_LABEL=Object.fromEntries(BEAD_PURCHASE_TYPES);
let draft=null;let rememberedUnit="";let imageData="";let imageBusy=false;
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
function preview(){
 draft=parse(q("daily-description").value);draft.conversion=window.BeadConversion.estimate({size:draft.size,length:draft.length,strands:draft.unit==="串"?draft.qty:1,spokenTotal:draft.beads,spokenApprox:draft.approx});if(draft.kind==="bead"&&draft.unit==="颗"&&!draft.beads&&draft.conversion.beadTotal)draft.qty=draft.conversion.beadTotal;const x=draft,box=q("daily-preview");box.style.display="block";
 box.innerHTML='<label>入库类型</label><select id="daily-kind" class="local-field">'+[["bead","散珠 / 素串 / 半成品"],["metal","金属配件"],["supply","耗材包装"],["finished","外购成品（非手作）"]].map(([v,l])=>'<option value="'+v+'" '+(v===x.kind?"selected":"")+'>'+l+'</option>').join("")+'</select>'+
 '<div id="daily-purchase-type-wrap"><label>具体物料类型（可修改）</label><select class="local-field" id="daily-purchase-type">'+BEAD_PURCHASE_TYPES.map(([value,label])=>'<option value="'+value+'" '+(value===x.purchaseType?'selected':'')+'>'+label+'</option>').join('')+'</select></div>'+
 '<label>物品名称</label><input id="daily-name" class="local-field" value="'+E(x.item)+'">'+
 '<div id="daily-shape-box"><label>形状 / 珠型（点选或搜索）</label><button type="button" id="daily-shape-open" class="local-field" style="text-align:left;cursor:pointer">选择形状：'+E(x.shape||'未选择')+' ▾</button><input id="daily-shape" type="hidden" value="'+E(x.shape||'')+'"><div id="daily-shape-options" style="display:none;padding:9px;border:1px solid #d9dfd8;border-radius:10px;background:#fff;margin-top:5px"><input type="search" class="local-field" id="daily-shape-search" placeholder="搜索形状，例如圆珠、近圆、老型珠"><div id="daily-shape-list" style="display:flex;flex-wrap:wrap;gap:7px;margin-top:9px"></div><div class="local-help">找不到的形状可输入搜索词，再点击「使用自定义形状」。</div><button type="button" class="local-btn" id="daily-shape-custom">使用自定义形状</button></div></div>'+
 '<div class="local-row"><div class="local-narrow"><label>规格</label><input id="daily-spec" class="local-field" value="'+E([x.size,x.length].filter(Boolean).join(" · "))+'"></div><div class="local-narrow"><label>数量</label><input id="daily-qty" type="number" class="local-field" min="0.0001" step="any" value="'+x.qty+'"></div></div>'+
 '<div class="local-row"><div class="local-narrow"><label>单位</label><select class="local-field" id="daily-unit">'+["颗","串","个","件","包","卷","米","厘米","克","套"].map(v=>'<option value="'+v+'" '+(v===x.unit?"selected":"")+'>'+v+'</option>').join("")+'</select></div><div class="local-narrow"><label>实际购入总价（元）</label><input id="daily-total" class="local-field" type="number" min="0" step="any" value="'+(x.price??"")+'"></div></div>'+
 '<div id="daily-bead-convert" class="local-help"></div>'+
 '<div class="local-row"><div class="local-narrow"><label>购买渠道 *</label><select id="daily-source-channel" class="local-field">'+purchaseSourceOptions(splitPurchaseSource(x.source).channel)+'</select><input id="daily-source-detail" class="local-field" placeholder="店铺、直播间等补充说明" value="'+E(splitPurchaseSource(x.source).detail)+'"></div><div class="local-narrow"><label>日期</label><input id="daily-date" type="date" class="local-field" value="'+today()+'"></div></div>'+
 '<label>物料 / 成品图片</label><label for="daily-image-file" class="local-btn main" style="display:inline-block;cursor:pointer;padding:12px 18px">📷 点击选择照片 / 相册上传</label><input id="daily-image-file" type="file" accept="image/*" style="position:absolute;width:1px;height:1px;opacity:0;pointer-events:none"><div class="local-row"><img id="daily-image-preview" alt="进货图片预览" style="display:none;width:96px;height:96px;object-fit:cover;border-radius:12px;border:1px solid #dde2dc"><button type="button" class="local-btn" data-daily="remove-image">移除图片</button></div><div class="local-help" id="daily-image-status">图片会压缩并存入本地账本，保存后能在库存里查看。</div>'+
 '<label>备注</label><textarea id="daily-notes" class="local-field">'+E(x.text)+'</textarea>'+
 '<div id="daily-cost" class="local-help"></div><button class="local-btn main" data-daily="save">核对后确认入库</button>';
imageData="";
 const shapeList=q("daily-shape-list"),shapeSearch=q("daily-shape-search"),shapePanel=q("daily-shape-options"),shapeBtn=q("daily-shape-open");
 function showShapes(){const family=shapeFamily(inferStoneClass(draft.category),draft.category,q("daily-name").value);const filtered=sortedShapes(family,q("daily-shape").value).filter(x=>x.includes(shapeSearch.value.trim()));shapeList.innerHTML=filtered.map(x=>'<button type="button" class="local-btn" data-shape-value="'+E(x)+'">'+E(x)+'</button>').join("")||'<div class="local-help">没有匹配的预设形状，可使用自定义形状。</div>';}
 shapeBtn.addEventListener("click",()=>{shapePanel.style.display=shapePanel.style.display==="none"?"block":"none";showShapes()});
 shapeSearch.addEventListener("input",showShapes);
 shapeList.addEventListener("click",e=>{const b=e.target.closest("[data-shape-value]");if(!b)return;const value=b.dataset.shapeValue;q("daily-shape").value=value;shapeBtn.textContent="形状："+value+" ▾";shapePanel.style.display="none";});
 q("daily-shape-custom").addEventListener("click",()=>{const value=shapeSearch.value.trim();if(!value){q("local-status").textContent="请先输入自定义形状";return;}q("daily-shape").value=value;shapeBtn.textContent="形状："+value+" ▾";shapePanel.style.display="none";});
 q("daily-kind").addEventListener("change",()=>{q("daily-purchase-type-wrap").style.display=q("daily-kind").value==="bead"?"":"none";});q("daily-kind").dispatchEvent(new Event("change"));q("daily-image-file").addEventListener("change",async e=>{const file=e.target.files?.[0];if(!file)return;imageBusy=true;q("daily-image-status").textContent="正在压缩图片…";try{imageData=await shrinkImage(file);const preview=q("daily-image-preview");preview.src=imageData;preview.style.display="block";q("daily-image-status").textContent="图片已准备好，确认保存时会与物料一同入库。";}catch(err){imageData="";q("daily-image-status").textContent="图片未成功处理："+err.message;}finally{imageBusy=false;}});
 for(const el of box.querySelectorAll("#daily-qty,#daily-total"))el.addEventListener("input",costPreview);q("daily-unit").addEventListener("change",changeUnit);rememberedUnit=x.unit;
 costPreview();
 q("local-status").textContent="已整理，请核对。"+(x.beads&&x.unit==="串"?"珠子约"+x.beads+"颗，仅作为备注；库存按串计。":"");
}
function changeUnit(){const unit=q("daily-unit").value,cv=draft?.conversion;if(cv&&draft.kind==="bead"&&(unit==="串"||unit==="颗")&&(rememberedUnit==="串"||rememberedUnit==="颗")){const oldQty=Number(q("daily-qty").value);if(rememberedUnit==="串"&&unit==="颗"){const per=cv.beadTotal?cv.beadTotal/cv.strandCount:null;if(per)q("daily-qty").value=Math.round(oldQty*per);else q("local-status").textContent="缺少可估算的珠径或串长，请先填写数量"}else if(rememberedUnit==="颗"&&unit==="串"){const per=cv.beadTotal?cv.beadTotal/cv.strandCount:null;if(per)q("daily-qty").value=Number((oldQty/per).toFixed(4));else q("local-status").textContent="缺少可估算的珠径或串长，请先填写数量"}}rememberedUnit=unit;costPreview()}
function costPreview(){const qty=Number(q("daily-qty").value),val=q("daily-total").value,total=Number(val);const cv=draft?.conversion, unit=q("daily-unit").value;const info=cv&&draft.kind==="bead"&&cv.theoreticalPerStrand?"按珠径 "+cv.diameterMm+"mm 和串长 "+cv.lengthCm+"cm 估计每串约 "+cv.theoreticalPerStrand+"颗。"+(cv.source==="口述颗数"?"你口述约"+cv.beadTotal+"颗，优先使用口述数量。":"未提供颗数时按理论值估算。"):"没有足够规格估算每串颗数。";q("daily-bead-convert").textContent=draft?.kind==="bead"?info:"";q("daily-cost").textContent=val!==""&&qty>0&&Number.isFinite(total)?"平均进货成本 ¥"+(total/qty).toFixed(4)+"/"+unit+(draft?.kind==="bead"?"；整批总价保持不变。":""):"请填写总进价和数量";}
async function save(){
 if(!draft)throw Error("请先识别进货");
 if(imageBusy)throw Error("图片正在处理，请稍后再保存");
 const kind=q("daily-kind").value,purchaseType=q("daily-purchase-type").value,name=T(q("daily-name").value),shape=T(q('daily-shape')?.value),spec=T(q("daily-spec").value),qty=Number(q("daily-qty").value),unit=q("daily-unit").value,rawPrice=q("daily-total").value,price=Number(rawPrice),source=makePurchaseSource(q("daily-source-channel").value,q("daily-source-detail").value),date=q("daily-date").value,notes=T(q("daily-notes").value);
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
  const entry={id,type:"out",name,producedQty:qty,stock:qty,buyPrice:cost,price:0,source,notes:notes+"；规格："+spec,image:imageData||"",sameOnline:false,createdAt,cost:{unit:cost,material:cost,labor:0,stall:0,tool:0}};
  await commit(()=>state.products.push(entry),"外购成品已入库（非手作）");
 }else{
  const entry={id,kind,name,purchaseType:kind==="bead"?purchaseType:undefined,shape:kind==="bead"?shape:"",subtype:kind==="bead"?(draft.category||name):"",beadGroup:kind==="bead"?inferStoneClass(draft.category||name):"",spec,qty,initialQty:qty,unit,unitCost:cost,totalPurchaseCost:price,source,purchaseDate:date,notes,createdAt,image:imageData||"",grade:"普通",flaw:"",weight:0,isWelfare:false,qtyApprox:draft.approx&&unit==="颗",approxBeadCount:draft.conversion?.beadTotal||null,diameterMm:draft.conversion?.diameterMm||null,strandLengthCm:draft.conversion?.lengthCm||null,strandCount:unit==="串"?qty:draft.conversion?.strandCount||null,marketGram:0,suggestedPrice:0};
  await commit(()=>{state.materials.push(entry);if(kind==="bead")usageAdd([entry])},"物料已入库");
 }
 q("daily-description").value="";q("daily-preview").style.display="none";draft=null;imageData="";
 q("local-status").textContent="已保存；可在物料或外购成品列表中编辑照片与细节。";
}
q("local-daily").addEventListener("click",e=>{
 const a=e.target.closest("[data-daily]")?.dataset.daily;if(!a)return;
 if(a==="remove-image"){imageData="";if(q("daily-image-file"))q("daily-image-file").value="";if(q("daily-image-preview")){q("daily-image-preview").src="";q("daily-image-preview").style.display="none";}q("daily-image-status").textContent="图片已移除";return;}if(a==="clear"){imageData="";draft=null;q("daily-description").value="";q("daily-preview").style.display="none";return}
 Promise.resolve().then(a==="preview"?preview:save).catch(err=>q("local-status").textContent="无法完成："+err.message);
});
window.DailyIntake={parse};
})();