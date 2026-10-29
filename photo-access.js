/* Camera and clipboard image fallbacks for browser environments where file input is blocked. */
(function(){
"use strict";
let stream=null,host=null,zoom=1,hardwareZoom=false,track=null,focusLocked=false;
const style=document.createElement("style");
style.textContent="#bead-photo-overlay{position:fixed;inset:0;z-index:180;background:#08150deb;display:flex;align-items:center;justify-content:center;padding:12px}#bead-photo-panel{background:white;color:#263b2c;border-radius:14px;padding:14px;width:min(520px,100%);max-height:94dvh;overflow:auto}#bead-photo-panel .camera-viewport{position:relative;overflow:hidden;border-radius:10px;background:#182c20;max-height:64dvh}#bead-photo-panel video{display:block;background:#182c20;width:100%;max-height:64dvh;object-fit:contain;transform-origin:center center}#bead-photo-panel .camera-focus{position:absolute;width:52px;height:52px;border:2px solid #f4e88c;border-radius:9px;pointer-events:none;transform:translate(-50%,-50%);display:none}#bead-photo-panel .camera-controls{display:flex;align-items:center;gap:9px;flex-wrap:wrap;margin:9px 0}#bead-photo-panel input[type=range]{flex:1;min-width:110px;accent-color:#315e51}#bead-photo-panel button{border:1px solid #9dbbaa;border-radius:9px;background:#f4faf5;color:#234832;padding:10px 15px;font:inherit;margin:5px 4px 0 0}#bead-photo-panel button.primary{background:#315e51;color:white}";
document.head.append(style);
function stop(){
 if(stream){for(const mediaTrack of stream.getTracks())mediaTrack.stop();stream=null;}track=null;zoom=1;hardwareZoom=false;focusLocked=false;
 host?.remove();host=null;
}
function errorInfo(e){
 const name=e?.name||"UnknownError";
 return ({NotAllowedError:"未获得摄像头权限，请在浏览器的网站权限里允许摄像头；或改用手机浏览器打开网页版。",NotFoundError:"没有找到可用摄像头。",NotReadableError:"摄像头被其他应用占用或系统无法读取。",OverconstrainedError:"所要求的摄像头不可用。",SecurityError:"此页面或浏览器禁止摄像头访问。",TypeError:"此环境不支持安全的摄像头调用。"}[name]||"摄像头启动失败，请尝试系统浏览器。")+"（"+name+"）";
}
async function camera(onImage){
 if(host)return;
 if(!navigator.mediaDevices?.getUserMedia)throw Error("当前快捷应用不支持网页摄像头 API。请在 Chrome/Edge/Safari 中打开网页版尝试。");
 host=document.createElement("div");host.id="bead-photo-overlay";
 host.innerHTML='<div id="bead-photo-panel"><strong>拍摄物料</strong><div class="camera-viewport" data-camera-viewport><video playsinline autoplay muted></video><div class="camera-focus" data-camera-focus></div></div><div class="camera-controls"><label>缩放 <span data-zoom-label>1.0×</span></label><input data-camera-zoom type="range" min="1" max="4" step="0.1" value="1"><button type="button" data-photo="focus-lock">锁定聚焦</button></div><div><button type="button" data-photo="capture" class="primary">拍照</button><button type="button" data-photo="cancel">取消</button></div><div data-photo-status style="font-size:12px;margin-top:7px;color:#607668">正在请求相机权限…</div></div>';
 document.body.append(host);
 const root=host,video=root.querySelector("video"),status=root.querySelector("[data-photo-status]"),viewport=root.querySelector("[data-camera-viewport]"),slider=root.querySelector("[data-camera-zoom]"),zoomLabel=root.querySelector("[data-zoom-label]"),focusMark=root.querySelector("[data-camera-focus]"),lockButton=root.querySelector('[data-photo="focus-lock"]');
 let capabilities={};
 const setStatus=t=>{if(status.isConnected)status.textContent=t;};
 async function setZoom(value){
  zoom=Number(value);zoomLabel.textContent=zoom.toFixed(1)+"×";
  if(hardwareZoom&&track){try{await track.applyConstraints({advanced:[{zoom:zoom}]});video.style.transform="none";return;}catch(e){hardwareZoom=false;setStatus("设备不支持当前硬件变焦，已切换为画面放大。");}}
  video.style.transform="scale("+zoom+")";
 }
 slider.addEventListener("input",()=>{setZoom(slider.value).catch(e=>setStatus(e.message))});
 viewport.addEventListener("click",async e=>{
  if(!track)return;
  const r=video.getBoundingClientRect(),x=Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)),y=Math.max(0,Math.min(1,(e.clientY-r.top)/r.height));
  const outer=viewport.getBoundingClientRect();focusMark.style.left=(e.clientX-outer.left)+"px";focusMark.style.top=(e.clientY-outer.top)+"px";focusMark.style.display="block";
  if(!capabilities.focusMode?.length||!capabilities.pointsOfInterest){setStatus("已标记对焦位置；当前浏览器不支持网页点按聚焦，请用系统相机拍摄以实现真实对焦。");return;}
  try{const focusMode=capabilities.focusMode.includes("single-shot")?"single-shot":"continuous";
   await track.applyConstraints({advanced:[{focusMode,pointsOfInterest:[{x:Math.round(x*(video.videoWidth||1)),y:Math.round(y*(video.videoHeight||1))}]}]});focusLocked=false;lockButton.textContent="锁定聚焦";setStatus("已尝试在所点位置聚焦。");}
  catch(err){setStatus("浏览器未接受点按聚焦控制，画面标记不代表已对焦。");}
 });
 root.addEventListener("click",async e=>{
  if(e.target===root||e.target.closest('[data-photo="cancel"]')){stop();return;}
  if(e.target.closest('[data-photo="focus-lock"]')){
   if(!track||!capabilities.focusMode?.includes("manual")){setStatus("当前浏览器不支持锁定镜头焦距，可使用系统相机的对焦锁定。");return;}
   try{focusLocked=!focusLocked;await track.applyConstraints({advanced:[{focusMode:focusLocked?"manual":"continuous"}]});lockButton.textContent=focusLocked?"解除锁定":"锁定聚焦";setStatus(focusLocked?"已请求锁定焦距。":"已恢复自动聚焦。");}catch(e){focusLocked=false;setStatus("浏览器不支持锁定聚焦。");}
   return;
  }
  if(!e.target.closest('[data-photo="capture"]'))return;
  try{
   if(!video.videoWidth||!video.videoHeight)throw Error("相机画面还没准备好");
   const canvas=document.createElement("canvas"),scale=Math.min(1,1200/Math.max(video.videoWidth,video.videoHeight));
   canvas.width=Math.max(1,Math.round(video.videoWidth*scale));
   canvas.height=Math.max(1,Math.round(video.videoHeight*scale));
   const ctx=canvas.getContext("2d");
   if(!hardwareZoom&&zoom>1){const sw=video.videoWidth/zoom,sh=video.videoHeight/zoom,sx=(video.videoWidth-sw)/2,sy=(video.videoHeight-sh)/2;ctx.drawImage(video,sx,sy,sw,sh,0,0,canvas.width,canvas.height)}
   else ctx.drawImage(video,0,0,canvas.width,canvas.height);
   const data=canvas.toDataURL("image/jpeg",0.75);
   stop(); // Release camera before the photo editor opens.
   await onImage(data);
  }catch(e){if(status.isConnected)status.textContent=e.message||String(e);else console.warn('Camera photo editing failed',e)}
 });
 try{
  stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:"environment"}}});
  track=stream.getVideoTracks()[0];video.srcObject=stream;await video.play();
  capabilities=typeof track.getCapabilities==="function"?track.getCapabilities():{};
  const zoomCap=capabilities.zoom;
  if(zoomCap&&zoomCap.max>zoomCap.min){hardwareZoom=true;slider.min=String(zoomCap.min);slider.max=String(Math.min(zoomCap.max,8));slider.step=String(zoomCap.step||0.1);slider.value=String(Math.max(zoomCap.min,Math.min(zoomCap.max,Number(track.getSettings()?.zoom||1))));zoom=Number(slider.value);zoomLabel.textContent=zoom.toFixed(1)+"×";}
  setStatus("可以滑动缩放，点按画面尝试对焦。");
 }catch(e){stop();throw Error(errorInfo(e));}
}
async function clipboard(onImage){
 if(!navigator.clipboard?.read)throw Error("此浏览器不支持从剪贴板读取照片。");
 let items;
 try{items=await navigator.clipboard.read()}catch(e){throw Error("无法读取剪贴板（"+e.name+"），需要在系统弹窗里授权读取图片。")}
 for(const item of items)for(const type of item.types){
  if(!type.startsWith("image/"))continue;
  const blob=await item.getType(type);
  const image=await blobToData(blob);
  await onImage(image);return;
 }
 throw Error("剪贴板里没有图片。请先从相册复制一张照片。");
}
async function blobToData(blob){
 const url=URL.createObjectURL(blob);
 try{
  const img=await new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(Error("无法读取剪贴板图片"));image.src=url});
  const ratio=Math.min(1,1000/Math.max(img.naturalWidth,img.naturalHeight));
  const canvas=document.createElement("canvas");canvas.width=Math.round(img.naturalWidth*ratio);canvas.height=Math.round(img.naturalHeight*ratio);
  canvas.getContext("2d").drawImage(img,0,0,canvas.width,canvas.height);
  return canvas.toDataURL("image/jpeg",0.7);
 }finally{URL.revokeObjectURL(url)}
}
// Camera closes when the user taps cancel or finishes shooting.
window.BeadPhotoAccess={camera,clipboard,stop};
})();