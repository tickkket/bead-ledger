/* Offline ledger PWA. App data stays in IndexedDB; updating the app shell does not erase records. */
(()=>{
 "use strict";
 const BUILD=57;
 let installPrompt=null,reloading=false,checking=false,registration=null,noticed=false;
 const isInstalled=()=>matchMedia("(display-mode:standalone)").matches||navigator.standalone===true;
 const isEditing=()=>!!document.querySelector("#editor,#bead-edit-shade,#bead-photo-overlay,#local-shade.open");
 function openFreshPage(){
  if(isEditing()){alert("请先保存或取消正在编辑的记录，再重新载入新版。旧库存数据不会被清除。");return false;}
  if(reloading)return true;
  reloading=true;
  const url=new URL(location.href);
  url.searchParams.set("ledger_update",String(Date.now()));
  location.replace(url.href);
  return true;
 }
 function banner(text,reg){
  let d=document.getElementById("ledger-update-banner");
  if(d)d.remove();
  d=document.createElement("div");
  d.id="ledger-update-banner";
  d.setAttribute("role","status");
  d.style.cssText="position:fixed;z-index:999;left:12px;right:12px;bottom:90px;max-width:420px;margin:auto;padding:12px;background:#315e51;color:white;border-radius:12px;display:flex;align-items:center;gap:10px;box-shadow:0 8px 24px #0003;font:13px system-ui";
  const msg=document.createElement("span");msg.style.flex="1";msg.textContent=text;
  const update=document.createElement("button");update.type="button";update.textContent="立即更新";
  update.onclick=()=>{
   if(isEditing()){alert("请先保存正在填写的表单，再点更新。");return;}
   update.disabled=true;
   if(reg?.waiting){
    reg.waiting.postMessage({type:"SKIP_WAITING"});
    // controllerchange normally handles navigation. This also covers browsers which do not fire it.
    setTimeout(()=>{if(!reloading)openFreshPage();},2500);
   }else openFreshPage();
  };
  const later=document.createElement("button");later.type="button";later.textContent="稍后";
  later.onclick=()=>d.remove();
  for(const b of [update,later])b.style.cssText="border:0;border-radius:8px;padding:7px;background:white;color:#315e51;cursor:pointer";
  d.append(msg,update,later);document.body.append(d);
 }
 function notify(reg){
  if(!reg.waiting||!navigator.serviceWorker.controller)return false;
  banner("发现新版本。请先保存当前编辑，再点「立即更新」。",reg);
  return true;
 }
 async function getRegistration(){
  if(!("serviceWorker" in navigator))throw Error("当前浏览器不支持离线更新");
  registration=registration||await navigator.serviceWorker.register("./sw.js",{scope:"./",updateViaCache:"none"});
  return registration;
 }
 async function fetchLiveRelease(){
  // Unique URL and no-store bypass both browser HTTP cache and previous app-shell cache.
  // The service worker uses network-first; without an Internet connection this check fails.
  const url=new URL("./sw.js",location.href);
  url.searchParams.set("check_release",String(Date.now()));
  const r=await fetch(url.href,{cache:"no-store"});
  if(!r.ok)throw Error("无法访问新版本文件："+r.status);
  const body=await r.text();
  const version=body.match(/bead-stall-ledger-pwa-v(\d+)/);
  if(!version)throw Error("无法验证线上版本号");
  return Number(version[1]);
 }
 async function check(manual=false){
  if(checking)return;
  checking=true;
  try{
   if(!navigator.onLine)throw Error("当前离线，请联网后再检查");
   const reg=await getRegistration();
   // Check the published release rather than relying solely on SW 'waiting' state.
   const published=await fetchLiveRelease();
   await reg.update();
   if(reg.waiting&&navigator.serviceWorker.controller){
    notify(reg);
    return;
   }
   if(published>BUILD){
    banner("线上版本 v"+published+"，当前页面 v"+BUILD+"。可以重新载入新版。",reg);
    return;
   }
   if(manual)alert("检查完成：当前页面 v"+BUILD+"，线上版本 v"+published+"。"+(published===BUILD?"已经是最新版。":"网页版本与线上版本不同，可以关闭页面后重新打开。"));
  }catch(err){
   if(manual)alert("暂时无法联网检查更新："+(err?.message||err)+"。\n不会影响你已经保存的账目。");
   else console.warn("PWA update check:",err);
  }finally{checking=false;}
 }
 addEventListener("beforeinstallprompt",e=>{e.preventDefault();installPrompt=e;});
 document.addEventListener("click",async e=>{
  const update=e.target.closest("[data-pwa-update-check]");
  if(update){e.preventDefault();await check(true);return;}
  const reload=e.target.closest("[data-pwa-update-reload]");
  if(reload){e.preventDefault();openFreshPage();return;}
  const target=e.target.closest("[data-pwa-install]");
  if(!target)return;
  e.preventDefault();
  if(isInstalled()){alert("已经从手机桌面打开，无须重新安装。");return;}
  if(installPrompt){const p=installPrompt;installPrompt=null;await p.prompt();await p.userChoice;return;}
  if(/iPhone|iPad|iPod/.test(navigator.userAgent))alert("请在 Safari 中打开本网址 → 分享 → 添加到主屏幕 → 添加。");
  else alert("请在 Chrome 浏览器菜单中选择「安装应用」或「添加到主屏幕」。");
 });
 if("serviceWorker" in navigator&&(location.protocol==="https:"||location.hostname==="localhost")){
  // Never navigate without user action. Auto-reload can interrupt Android selectors and editing.
  navigator.serviceWorker.addEventListener("controllerchange",()=>{
   if(reloading)return;
   banner("新版本已准备好。保存正在填写的内容后，再点击「立即更新」。",registration);
  });
  addEventListener("load",async()=>{
   try{
    const reg=await getRegistration();
    reg.addEventListener("updatefound",()=>{
     const installing=reg.installing;
     if(!installing)return;
     installing.addEventListener("statechange",()=>{
      if(installing.state==="installed")notify(reg);
     });
    });
    notify(reg); // No background update check, navigation or reload on startup.
   }catch(err){console.warn("无法启用离线更新",err);}
  });
 }
})();