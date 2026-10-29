(function(){
"use strict";
let query="",visual=false,visualResult=[],loading=false;
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
 loading=true;visual=true;visualResult=[];
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
  visualResult=[];
  if(message)message.textContent="图片查询失败："+err.message;
 }finally{
  loading=false;draw();
 }
}
function mount(){
 const slot=document.getElementById("ledger-global-search-slot");if(!slot)return;
 slot.innerHTML='<div style="margin:8px;padding:9px;background:white;border:1px solid #d6e1d8;border-radius:10px"><input id="ledger-query" type="search" placeholder="搜索物料、成品、规格和备注" style="width:65%;padding:9px" value="'+escapeHtml(query)+'"><button type="button" data-ledger-search="clear" class="btn small">清除</button><div style="margin-top:7px;display:flex;gap:7px;align-items:center;flex-wrap:wrap"><label class="btn small" style="cursor:pointer">上传图片查询<input type="file" id="ledger-image-query" accept="image/*" style="display:none"></label><button type="button" data-ledger-search="camera" class="btn small">拍照查询</button><small class="muted">本机相似图片匹配，不联网识物</small></div><div id="ledger-results"></div></div>';
 draw();
}
function draw(){
 const node=document.getElementById("ledger-results");if(!node)return;
 const items=visual?visualResult:find(query);
 node.innerHTML=!visual&&!query?"":items.length?items.slice(0,12).map(x=>'<div style="padding:7px;border-top:1px solid #eee;display:flex;align-items:center;gap:7px"><img src="'+(safeImage(x.item.image)||svgThumb('图'))+'" style="width:45px;height:45px;object-fit:cover;border-radius:7px" alt="">'+escapeHtml(x.item.name)+' · '+(x.kind==="material"?"物料":"成品")+' <button class="btn small" data-action="'+(x.kind==="material"?"edit-material":"edit-product")+'" data-id="'+escapeHtml(x.item.id)+'">查看</button></div>').join(""):'<small>无匹配记录</small>';
}
document.addEventListener("input",event=>{if(event.target.id==="ledger-query"){query=event.target.value;visual=false;draw()}});
document.addEventListener("click",event=>{const type=event.target.closest('[data-ledger-search]')?.dataset.ledgerSearch;if(type==='clear'){query='';visual=false;visualResult=[];mount()}if(type==='camera')window.BeadPhotoAccess.camera(src=>searchImage(src)).catch(err=>{const x=document.getElementById('ledger-results');if(x)x.textContent=err.message})});
document.addEventListener("change",async event=>{
 const fileInput=event.target;if(fileInput.id!=="ledger-image-query")return;
 const file=fileInput.files?.[0];if(!file)return;
 const url=URL.createObjectURL(file);
 try{await searchImage(url)}
 finally{URL.revokeObjectURL(url);fileInput.value=""}
});
window.LedgerSearch={mount,find,searchImage};
mount();
})();