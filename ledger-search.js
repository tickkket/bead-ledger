(function(){
"use strict";
let query="",visual=false,visualResult=[],loading=false,expanded=false,visualError="";
const escapeHtml=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function entries(){
 return state.materials.map(item=>({kind:"material",item:item})).concat(state.products.map(item=>({kind:"product",item:item})));
}
function find(query){
 const terms=query.toLowerCase().trim().split(/\s+/).filter(Boolean);if(!terms.length)return [];
 return entries().filter(x=>{
  const p=x.item;
  const hay=[p.name,p.subtype,p.beadGroup,p.spec,p.shape,p.source,p.notes,p.craftType,p.craftSize,x.kind,p.type==="out"?"外购成品":"手作成品"].join(" ").toLowerCase();
  return terms.every(t=>hay.includes(t));
 });
}
function openImage(url){
 return new Promise((resolve,reject)=>{
  const image=new Image();
  image.onload=()=>resolve(image);
  image.onerror=()=>reject(Error("无法读取这张照片"));
  image.src=url;
 });
}
function imageSignature(image){
 const canvas=document.createElement("canvas");
 canvas.width=8;canvas.height=8;
 const ctx=canvas.getContext("2d",{willReadFrequently:true});
 ctx.drawImage(image,0,0,8,8);
 const pixels=ctx.getImageData(0,0,8,8).data;
 const values=[];
 for(let i=0;i<64;i++){
  const offset=i*4;
  values.push([pixels[offset],pixels[offset+1],pixels[offset+2]]);
 }
 return values;
}
function imageDifference(a,b){
 let diff=0;
 for(let i=0;i<64;i++){
  for(let j=0;j<3;j++)diff+=Math.abs(a[i][j]-b[i][j]);
 }
 return diff;
}
async function searchImage(url){
 if(loading)return;
 loading=true;visual=true;expanded=true;visualResult=[];visualError="";
 const message=document.getElementById("ledger-results");
 if(message)message.textContent="正在本机比对已保存照片…";
 try{
  const target=imageSignature(await openImage(url));
  const candidates=entries().filter(x=>String(x.item.image||"").startsWith("data:image/"));
  const scores=await Promise.all(candidates.map(async function(e){
   try{
    const sample=imageSignature(await openImage(e.item.image));
    return {item:e,distance:imageDifference(target,sample)};
   }catch(err){return null}
  }));
  visualResult=scores.filter(Boolean).sort((a,b)=>a.distance-b.distance).slice(0,12).map(x=>x.item);
 }catch(err){
  visualResult=[];visualError="图片查询失败："+err.message;
  if(message)message.textContent=visualError;
 }finally{
  loading=false;draw();
 }
}
function mount(){
 const slot=document.getElementById("ledger-global-search-slot");if(!slot)return;
 slot.innerHTML='<div class="ledger-search-box" role="search"><div class="ledger-search-line">'+
 '<span class="ledger-search-icon" aria-hidden="true">⌕</span>'+
 '<input id="ledger-query" type="search" enterkeyhint="search" placeholder="搜索物料或成品…" aria-label="搜索所有物料和成品" value="'+escapeHtml(query)+'" autocomplete="off">'+
 '<button type="button" data-ledger-search="clear" class="ledger-search-tool ledger-search-clear" aria-label="清除搜索" title="清除搜索" style="display:'+(query.trim()||visual?'inline-flex':'none')+'">×</button>'+
 '<button type="button" data-ledger-search="image" class="ledger-search-tool" aria-label="从相册选图查询" title="从相册选图查询">▧</button>'+
 '<button type="button" data-ledger-search="camera" class="ledger-search-tool" aria-label="拍照查询" title="拍照查询">📷</button>'+
 '<input type="file" id="ledger-image-query" accept="image/*" style="display:none"></div>'+
 '<div id="ledger-results" class="ledger-search-results" aria-live="polite" hidden></div></div>';
 draw();
}
function draw(){
 const node=document.getElementById("ledger-results");if(!node)return;
 const clear=document.querySelector('[data-ledger-search="clear"]');if(clear)clear.style.display=query.trim()||visual?"inline-flex":"none";
 const hasQuery=visual||!!query.trim();
 const show=expanded&&hasQuery;
 node.hidden=!show;if(!show){node.innerHTML="";return}
 if(loading){node.innerHTML='<p class="muted tiny" style="padding:9px">正在本机匹配相似照片…</p>';return}
 if(visualError){node.textContent=visualError;return}
 const items=visual?visualResult:find(query);
 const label=visual?'<p class="muted tiny" style="padding:7px 1px">按库存照片外观近似排序（非 AI 识物）</p>':'';
 node.innerHTML=label+(items.length?items.slice(0,12).map(x=>{
  const material=x.kind==="material",item=x.item;
  const description=material?
   [item.subtype,item.spec,"库存 "+item.qty+" "+(item.unit||"颗")].filter(Boolean).join(" · "):
   (item.type==="out"?"外购成品":"手作成品")+" · 现货 "+item.stock+" 件";
  return '<div class="ledger-result-row">'+
   '<img src="'+(safeImage(item.image)||svgThumb("图"))+'" alt="">'+
   '<div class="ledger-result-text"><strong>'+escapeHtml(item.name)+'</strong><small>'+escapeHtml(description)+'</small></div>'+
   '<button type="button" class="btn small" data-action="'+(material?"edit-material":"edit-product")+'" data-id="'+escapeHtml(item.id)+'">查看</button></div>';
 }).join(""):'<p class="muted" style="padding:9px 1px">没有找到匹配的库存记录。</p>');
}
document.addEventListener("input",event=>{
 if(event.target.id==="ledger-query"){
  query=event.target.value;visual=false;visualError="";expanded=true;draw();
 }
});
document.addEventListener("focusin",event=>{
 if(event.target.id==="ledger-query"&&(query.trim()||visual)){expanded=true;draw()}
});
document.addEventListener("click",event=>{
 const type=event.target.closest('[data-ledger-search]')?.dataset.ledgerSearch;
 if(type==="clear"){query="";visual=false;visualResult=[];visualError="";expanded=false;mount();document.getElementById("ledger-query")?.focus();return}
 if(type==="image"){document.getElementById("ledger-image-query")?.click();return}
 if(type==="camera"){window.BeadPhotoAccess.camera(src=>searchImage(src)).catch(err=>{visualError=err.message||String(err);visual=true;expanded=true;draw()});return}
 if(!event.target.closest(".ledger-search-box")&&expanded){expanded=false;draw()}
});
document.addEventListener("change",async event=>{
 const input=event.target;if(input.id!=="ledger-image-query")return;
 const file=input.files?.[0];if(!file)return;
 const url=URL.createObjectURL(file);
 try{await searchImage(url)}
 finally{URL.revokeObjectURL(url);input.value=""}
});
document.addEventListener("keydown",event=>{
 if(event.key==="Escape"&&expanded){
  expanded=false;draw();
  if(event.target.id==="ledger-query")event.target.blur();
 }
});
window.LedgerSearch={mount,find,searchImage};
mount();
})();