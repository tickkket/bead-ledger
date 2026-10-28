/* Local photo editor, free/offline: draw marks and crop before saving. */
(function(){
"use strict";
let active=false;
const style=document.createElement("style");
style.textContent="#bead-edit-shade{position:fixed;inset:0;z-index:240;background:#102119bb;display:flex;align-items:center;justify-content:center;padding:9px;box-sizing:border-box}#bead-edit-panel{box-sizing:border-box;background:white;color:#26362c;width:min(740px,100%);max-height:96dvh;overflow:auto;border-radius:15px;padding:13px}#bead-edit-panel *{box-sizing:border-box}.bead-edit-row{display:flex;flex-wrap:wrap;align-items:center;gap:7px;margin:10px 0}.bead-edit-btn{font:inherit;min-height:40px;border:1px solid #c9d6ca;background:white;border-radius:9px;padding:8px 12px;color:#315e51;cursor:pointer}.bead-edit-btn.active,.bead-edit-btn.primary{background:#315e51;color:white}.bead-edit-btn:disabled{opacity:.4}#bead-edit-stage{position:relative;max-width:100%;width:fit-content;margin:8px auto;line-height:0;background:#eef4ef;touch-action:none}#bead-edit-base{display:block;max-width:100%;height:auto;max-height:58dvh;object-fit:contain}#bead-edit-overlay{position:absolute;inset:0;width:100%;height:100%;touch-action:none;cursor:crosshair}#bead-edit-panel label{font-size:12px}#bead-edit-panel input[type=color]{width:43px;height:37px}#bead-edit-panel input[type=range]{width:110px;accent-color:#315e51}#bead-edit-status{font-size:12px;line-height:1.55;color:#60766a;min-height:21px}@media(max-width:480px){#bead-edit-panel{padding:11px}#bead-edit-base{max-height:53dvh}.bead-edit-btn{padding:8px 10px}}";
document.head.append(style);
const decode=url=>new Promise((ok,fail)=>{const image=new Image();image.onload=()=>ok(image);image.onerror=()=>fail(Error("无法读取图片"));image.src=url});
async function open(source){
 if(active)throw Error("图片编辑器已打开");
 if(typeof source!=="string"||!source.startsWith("data:image/"))throw Error("请先选择或拍摄照片");
 active=true;
 let originalImage;
 try{originalImage=await decode(source)}catch(e){active=false;throw e}
 return new Promise(resolve=>{
  let closed=false,shade=null;
  let onKey=null;
  function finish(value){
   if(closed)return;
   closed=true;active=false;
   if(onKey)document.removeEventListener("keydown",onKey,true);
   shade?.remove();resolve(value);
  }
  try{
   shade=document.createElement("div");shade.id="bead-edit-shade";
   shade.innerHTML=[
   '<section id="bead-edit-panel" role="dialog" aria-modal="true" aria-label="照片编辑">',
   '<div class="bead-edit-row" style="justify-content:space-between"><strong>照片编辑</strong><button class="bead-edit-btn" type="button" data-edit="cancel">关闭</button></div>',
   '<div class="bead-edit-row"><button class="bead-edit-btn active" type="button" data-edit="pen">✎ 画笔标记</button><button class="bead-edit-btn" type="button" data-edit="crop">▣ 框选裁切</button><button class="bead-edit-btn" type="button" data-edit="apply-crop" disabled>完成裁切</button></div>',
   '<div class="bead-edit-row"><label>颜色 <input type="color" id="bead-edit-color" value="#ef3b35"></label><label>画笔粗细 <input type="range" id="bead-edit-width" min="2" max="22" value="6"></label><button class="bead-edit-btn" type="button" data-edit="undo">↶ 撤销</button><button class="bead-edit-btn" type="button" data-edit="reset">重置</button></div>',
   '<div id="bead-edit-stage"><canvas id="bead-edit-base"></canvas><canvas id="bead-edit-overlay"></canvas></div>',
   '<div id="bead-edit-status">在照片上用画笔圈画；裁切时拖动选出保留区域。</div>',
   '<div class="bead-edit-row" style="justify-content:flex-end"><button class="bead-edit-btn" type="button" data-edit="cancel">取消</button><button class="bead-edit-btn primary" type="button" data-edit="done">✓ 完成编辑</button></div>',
   '</section>'].join("");
   document.body.append(shade);
   const base=shade.querySelector("#bead-edit-base"),ctx=base.getContext("2d");
   const layer=shade.querySelector("#bead-edit-overlay"),mask=layer.getContext("2d");
   if(!ctx||!mask)throw Error("此浏览器不支持图片画布");
   const scale=Math.min(1,1400/Math.max(originalImage.naturalWidth,originalImage.naturalHeight));
   base.width=Math.max(1,Math.round(originalImage.naturalWidth*scale));
   base.height=Math.max(1,Math.round(originalImage.naturalHeight*scale));
   ctx.fillStyle="#fff";ctx.fillRect(0,0,base.width,base.height);
   ctx.drawImage(originalImage,0,0,base.width,base.height);
   const original=base.toDataURL("image/jpeg",0.9);
   layer.width=base.width;layer.height=base.height;
   let mode="pen",drawing=false,origin=null,rect=null,history=[],busy=false;
   const undoButton=shade.querySelector('[data-edit="undo"]'),cropButton=shade.querySelector('[data-edit="apply-crop"]'),status=shade.querySelector("#bead-edit-status");
   const say=t=>status.textContent=t;
   function pos(e){const r=layer.getBoundingClientRect();return {x:Math.min(base.width,Math.max(0,(e.clientX-r.left)*base.width/r.width)),y:Math.min(base.height,Math.max(0,(e.clientY-r.top)*base.height/r.height))};}
   function saveState(){history.push(base.toDataURL("image/png"));if(history.length>10)history.shift();undoButton.disabled=false}
   function bounds(a,b){const x=Math.round(Math.min(a.x,b.x)),y=Math.round(Math.min(a.y,b.y)),w=Math.round(Math.abs(a.x-b.x)),h=Math.round(Math.abs(a.y-b.y));return w>=12&&h>=12?{x,y,w,h}:null}
   function previewCrop(){
    mask.clearRect(0,0,layer.width,layer.height);
    if(rect){
     const r=rect;mask.fillStyle="rgba(0,0,0,.34)";
     mask.fillRect(0,0,layer.width,r.y);mask.fillRect(0,r.y,r.x,r.h);
     mask.fillRect(r.x+r.w,r.y,layer.width-r.x-r.w,r.h);
     mask.fillRect(0,r.y+r.h,layer.width,layer.height-r.y-r.h);
     mask.strokeStyle="white";mask.lineWidth=Math.max(2,layer.width/400);mask.setLineDash([9,6]);
     mask.strokeRect(r.x,r.y,r.w,r.h);mask.setLineDash([]);
    }
    cropButton.disabled=!rect;
   }
   function switchMode(next){
    mode=next;drawing=false;rect=null;previewCrop();
    shade.querySelector('[data-edit="pen"]').classList.toggle("active",mode==="pen");
    shade.querySelector('[data-edit="crop"]').classList.toggle("active",mode==="crop");
    say(mode==="pen"?"用手指画笔标记，支持颜色、粗细和撤销。":"在图上拖出裁切区域，然后点「完成裁切」。");
   }
   layer.addEventListener("pointerdown",e=>{
    if(!e.isPrimary||e.button>0||busy)return;
    e.preventDefault();drawing=true;origin=pos(e);layer.setPointerCapture?.(e.pointerId);
    if(mode==="pen"){
     saveState();ctx.strokeStyle=shade.querySelector("#bead-edit-color").value;ctx.fillStyle=ctx.strokeStyle;
     ctx.lineWidth=Number(shade.querySelector("#bead-edit-width").value);ctx.lineCap="round";ctx.lineJoin="round";
     ctx.beginPath();ctx.arc(origin.x,origin.y,ctx.lineWidth/2,0,Math.PI*2);ctx.fill();
     ctx.beginPath();ctx.moveTo(origin.x,origin.y);
    }else{rect=null;previewCrop();}
   });
   layer.addEventListener("pointermove",e=>{
    if(!drawing)return;e.preventDefault();const p=pos(e);
    if(mode==="pen"){ctx.lineTo(p.x,p.y);ctx.stroke();ctx.beginPath();ctx.moveTo(p.x,p.y)}
    else{rect=bounds(origin,p);previewCrop();}
   });
   layer.addEventListener("pointerup",e=>{
    if(!drawing)return;drawing=false;e.preventDefault();
    if(mode==="crop"){rect=bounds(origin,pos(e));previewCrop();say(rect?"选区已建立，点击「完成裁切」。":"裁切区域太小，请重新框选。")}
   });
   layer.addEventListener("pointercancel",()=>{drawing=false});
   async function restore(data){
    const img=await decode(data);
    base.width=img.naturalWidth;base.height=img.naturalHeight;
    ctx.drawImage(img,0,0);
    layer.width=base.width;layer.height=base.height;rect=null;previewCrop();
   }
   function applyCrop(){
    if(!rect)return;
    saveState();const tmp=document.createElement("canvas");
    tmp.width=rect.w;tmp.height=rect.h;
    tmp.getContext("2d").drawImage(base,rect.x,rect.y,rect.w,rect.h,0,0,rect.w,rect.h);
    base.width=tmp.width;base.height=tmp.height;ctx.drawImage(tmp,0,0);
    layer.width=base.width;layer.height=base.height;switchMode("pen");say("裁切完成，可继续标记或保存。");
   }
   shade.addEventListener("click",async e=>{
    if(e.target===shade){finish(null);return}
    const action=e.target.closest("[data-edit]")?.dataset.edit;
    if(!action||busy)return;
    try{
     if(action==="cancel"){finish(null);return}
     if(action==="pen"||action==="crop"){switchMode(action);return}
     if(action==="apply-crop"){applyCrop();return}
     if(action==="undo"){if(history.length){busy=true;await restore(history.pop());undoButton.disabled=history.length===0;say("已撤销。")}else if(rect){rect=null;previewCrop()}return}
     if(action==="reset"){busy=true;history=[];await restore(original);undoButton.disabled=true;switchMode("pen");say("已恢复原始图片。");return}
     if(action==="done"){if(mode==="crop"&&rect)applyCrop();finish(base.toDataURL("image/jpeg",0.82))}
    }catch(err){say("图片操作失败："+err.message)}finally{busy=false}
   });
   undoButton.disabled=true;
   onKey=e=>{if(e.key==="Escape"){e.preventDefault();e.stopImmediatePropagation();finish(null)}};
   document.addEventListener("keydown",onKey,true);
  }catch(err){console.error("照片编辑初始化失败",err);finish(null);}
 });
}
window.BeadPhotoEditor={open};
})();