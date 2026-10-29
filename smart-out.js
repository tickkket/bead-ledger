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
 const rawQty=(t.match(/(\d+|[一二两三四五六七八九十])\s*(?:件|条|对|副|套)/)||[])[1];
 const cn={一:1,二:2,两:2,三:3,四:4,五:5,六:6,七:7,八:8,九:9,十:10};
 const qty=rawQty?(Number(rawQty)||cn[rawQty]||1):1;
 const find=re=>{const m=t.match(re);return m?Number(m[1]):null};
 const unitCost=find(/(?:每件|单件|每对|每套)?\s*(?:进价|每件进价|成本|拿货价)\s*(?:为|是|：|:|¥)?\s*(\d+(?:\.\d+)?)/);
 const totalCost=find(/(?:总进价|进货总价|采购总价|总成本|购入总价)\s*(?:为|是|：|:|¥)?\s*(\d+(?:\.\d+)?)/);
 const cost=totalCost!==null&&!/(?:每件|单件|每对|每套)\s*(?:进价|成本)/.test(t)?Number((totalCost/qty).toFixed(4)):unitCost;
 const price=find(/(?:建议售价|售价|卖价|定价|打算卖|准备卖)\s*(?:为|是|：|:|¥)?\s*(\d+(?:\.\d+)?)/);
 const channel=channels.find(x=>x&&x!=="其他"&&t.includes(x))||"";
 const name=t.replace(/(?:每件|单件|每对|每套)?\s*(?:总进价|进货总价|采购总价|总成本|购入总价|进价|成本|拿货价|建议售价|售价|卖价|定价|打算卖|准备卖)\s*(?:为|是|：|:|¥)?\s*\d+(?:\.\d+)?\s*(?:元|块)?/g," ").replace(/(?:\d+|[一二两三四五六七八九十])\s*(?:件|条|对|副|套)/g," ").replace(/小红书|淘宝|拼多多|1688|抖音|微信|线下批发|外购|买了|进了/g," ").replace(/[，,。]/g," ").trim();
 return {name,qty,cost:cost??"",price:price??"",channel};
}
const OUT_DRAFT_KEY="bead-ledger-out-batch-draft-v1";
const OUT_PHOTO_DATABASE="bead-ledger-out-photo-drafts-v1";
let photoWrite=Promise.resolve();
async function openPhotoDatabase(){
 return new Promise((resolve,reject)=>{
  const req=indexedDB.open(OUT_PHOTO_DATABASE,1);
  req.onupgradeneeded=()=>req.result.createObjectStore("photos");
  req.onsuccess=()=>resolve(req.result);
  req.onerror=()=>reject(req.error);
 });
}
async function writePhotoDraft(){
 const section=[...root.querySelectorAll("[data-out-row]")];
 const data=section.map(el=>({name:el.querySelector('[data-field="name"]')?.value||"",photo:photos[el.dataset.outRow]||""}));
 const db=await openPhotoDatabase();
 try{
  await new Promise((resolve,reject)=>{
   const tx=db.transaction("photos","readwrite");
   tx.objectStore("photos").put(data,"latest");
   tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
  });
 }finally{db.close()}
}
function storePhotos(){
 photoWrite=photoWrite.then(writePhotoDraft).catch(err=>{console.warn("外购成品照片草稿保存失败",err);say("照片草稿暂存失败，建议先正式保存",true)});
 return photoWrite;
}
async function restorePhotos(){
 const db=await openPhotoDatabase();
 let saved;
 try{
  saved=await new Promise((resolve,reject)=>{
   const req=db.transaction("photos","readonly").objectStore("photos").get("latest");
   req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
  });
 }finally{db.close()}
 if(!Array.isArray(saved))return;
 const sections=[...root.querySelectorAll("[data-out-row]")];
 let found=0;
 for(let i=0;i<Math.min(saved.length,sections.length);i++){
  const el=sections[i],id=el.dataset.outRow;
  if(saved[i]?.photo&&String(saved[i].name||"")===String(el.querySelector('[data-field="name"]')?.value||"")){
   photos[id]=saved[i].photo;preview(id);found++;
  }
 }
 if(found)say("已恢复 "+sections.length+" 款成品草稿，包含 "+found+" 张照片");
}
async function clearPhotoDraft(){
 try{
  await photoWrite;
  const db=await openPhotoDatabase();
  try{await new Promise((resolve,reject)=>{const tx=db.transaction("photos","readwrite");tx.objectStore("photos").delete("latest");tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)})}
  finally{db.close()}
 }catch(err){console.warn("照片草稿清理失败",err)}
}

function saveDraft(){
 const rows=[...root.querySelectorAll("[data-out-row]")].map(section=>{
  const get=k=>section.querySelector('[data-field="'+k+'"]')?.value??"";
  return {name:get("name"),price:get("price"),qty:get("qty"),cost:get("cost"),channel:get("channel"),detail:get("detail"),sameOnline:get("sameOnline"),notes:get("notes")};
 });
 try{localStorage.setItem(OUT_DRAFT_KEY,JSON.stringify({rows,lines:$("#out-lines").value,savedAt:Date.now()}))}
 catch(e){console.warn("无法暂存外购成品草稿",e);say("草稿自动暂存失败，请先备份文字",true)}
}
function loadDraft(){
 try{
  const draft=JSON.parse(localStorage.getItem(OUT_DRAFT_KEY)||"null");
  if(!draft)return;
  $("#out-lines").value=draft.lines||"";
  for(const item of draft.rows||[]){
   add(item);
   const last=[...root.querySelectorAll("[data-out-row]")].at(-1);
   if(last){
    const put=(k,v)=>{const el=last.querySelector('[data-field="'+k+'"]');if(el)el.value=String(v??"")};
    put("detail",item.detail);put("sameOnline",item.sameOnline);put("notes",item.notes);
   }
  }
  if(draft.rows?.length)say("已恢复 "+draft.rows.length+" 款未保存草稿；照片需重新添加。");
 }catch(e){console.warn("外购成品草稿恢复失败",e)}
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
async function edit(id,data){if(busy)return;busy=true;try{const img=await window.BeadPhotoEditor.open(data);if(img){photos[id]=img;preview(id);await storePhotos();say("照片已编辑并暂存")}}catch(e){say(e.message,true)}finally{busy=false}}
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
  if(items.every(x=>state.products.some(y=>x.id===y.id))){$("#out-list").innerHTML="";$("#out-lines").value="";photos={};try{localStorage.removeItem(OUT_DRAFT_KEY)}catch(e){}await clearPhotoDraft();say("已保存 "+items.length+" 款")}
  else say("保存未完成，记录仍保留在当前页面",true);
 }catch(e){say(e.message||String(e),true)}finally{busy=false}
}
root.addEventListener("change",async e=>{const x=e.target.closest("[data-out-photo]");if(!x||!x.files?.[0])return;const id=x.dataset.outPhoto;try{const src=await shrinkImage(x.files[0]);await edit(id,src)}catch(err){say(err.message,true)}finally{x.value=""}});
root.addEventListener("click",async e=>{
 const b=e.target.closest("[data-out]");if(!b)return;const type=b.dataset.out;
 if(type==="add"){add({qty:1});saveDraft();storePhotos();return}
 if(type==="parse"){
  const lines=$("#out-lines").value.split(/[；;\n]+/).map(x=>x.trim()).filter(Boolean);
  if(!lines.length)return say("请输入描述",true);
  if(lines.length>30)return say("每次最多识别30款",true);
  lines.forEach(line=>add(parse(line)));$("#out-lines").value="";saveDraft();storePhotos();say("已识别"+lines.length+"款，请核对");return;
 }
 if(type==="save"){await save();return}
 const row=b.closest("[data-out-row]");if(!row)return;const id=row.dataset.outRow;
 if(type==="remove"){if(busy)return;row.remove();delete photos[id];saveDraft();storePhotos();return}
 if(type==="clear"){delete photos[id];preview(id);storePhotos();return}
 if(type==="edit"){if(!photos[id])return say("请先选图",true);await edit(id,photos[id]);return}
 if(type==="camera"){try{await window.BeadPhotoAccess.camera(data=>edit(id,data))}catch(err){say(err.message,true)}}
});
root.addEventListener("input",e=>{if(e.target.matches("#out-lines,[data-field]"))saveDraft()});
root.addEventListener("change",e=>{if(e.target.matches("[data-field]"))saveDraft()});
loadDraft();photoWrite=photoWrite.then(restorePhotos).catch(e=>console.warn("外购照片草稿恢复失败",e));
window.SmartOutIntake={parse};
})();