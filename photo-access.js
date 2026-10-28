/* Camera and clipboard image fallbacks for browser environments where file input is blocked. */
(function(){
"use strict";
let stream=null,host=null;
const style=document.createElement("style");
style.textContent="#bead-photo-overlay{position:fixed;inset:0;z-index:180;background:#08150deb;display:flex;align-items:center;justify-content:center;padding:12px}#bead-photo-panel{background:white;color:#263b2c;border-radius:14px;padding:14px;width:min(520px,100%);max-height:94dvh;overflow:auto}#bead-photo-panel video{display:block;background:#182c20;width:100%;max-height:64dvh;object-fit:contain;border-radius:10px}#bead-photo-panel button{border:1px solid #9dbbaa;border-radius:9px;background:#f4faf5;color:#234832;padding:10px 15px;font:inherit;margin:5px 4px 0 0}#bead-photo-panel button.primary{background:#315e51;color:white}";
document.head.append(style);
function stop(){
 if(stream){for(const track of stream.getTracks())track.stop();stream=null;}
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
 host.innerHTML='<div id="bead-photo-panel"><strong>拍一张物料照片</strong><p style="font-size:12px">只在本机处理，拍照后预览并确认使用，不会上传图片。</p><video playsinline autoplay muted></video><div><button type="button" data-photo="capture" class="primary">拍照并使用</button><button type="button" data-photo="cancel">取消</button></div><div data-photo-status style="font-size:12px;margin-top:7px;color:#607668">正在请求相机权限…</div></div>';
 document.body.append(host);
 const root=host,video=root.querySelector("video"),status=root.querySelector("[data-photo-status]");
 root.addEventListener("click",async e=>{
  if(e.target===root||e.target.closest('[data-photo="cancel"]')){stop();return;}
  if(!e.target.closest('[data-photo="capture"]'))return;
  try{
   if(!video.videoWidth||!video.videoHeight)throw Error("相机画面还没准备好");
   const canvas=document.createElement("canvas"),scale=Math.min(1,1200/Math.max(video.videoWidth,video.videoHeight));
   canvas.width=Math.max(1,Math.round(video.videoWidth*scale));
   canvas.height=Math.max(1,Math.round(video.videoHeight*scale));
   canvas.getContext("2d").drawImage(video,0,0,canvas.width,canvas.height);
   const data=canvas.toDataURL("image/jpeg",0.75);
   await onImage(data);stop();
  }catch(e){status.textContent=e.message||String(e)}
 });
 try{
  stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:"environment"}}});
  video.srcObject=stream;await video.play();status.textContent="画面准备好了，点击「拍照并使用」。";
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