/* Installs the existing local-only ledger as a home screen app. */
(()=>{
 let installPrompt=null, reloading=false;
 const isInstalled=()=>matchMedia("(display-mode:standalone)").matches||navigator.standalone===true;
 addEventListener("beforeinstallprompt",e=>{e.preventDefault();installPrompt=e;});
 document.addEventListener("click",async e=>{
  const target=e.target.closest("[data-pwa-install]");if(!target)return;
  e.preventDefault();
  if(isInstalled()){alert("已经从手机桌面打开，无须重新安装。");return;}
  if(installPrompt){const p=installPrompt;installPrompt=null;await p.prompt();await p.userChoice;return;}
  if(/iPhone|iPad|iPod/.test(navigator.userAgent)){
   alert("请在 Safari 中打开本网址 → 分享 → 添加到主屏幕 → 添加。");
  }else alert("请在 Chrome 浏览器菜单中选择“安装应用”或“添加到主屏幕”。");
 });
 const notify=reg=>{
  if(!reg.waiting||!navigator.serviceWorker.controller||document.getElementById("ledger-update-banner"))return;
  const d=document.createElement("div");d.id="ledger-update-banner";
  d.style.cssText="position:fixed;z-index:99;left:12px;right:12px;bottom:90px;max-width:420px;margin:auto;padding:12px;background:#315e51;color:white;border-radius:12px;display:flex;align-items:center;gap:10px;box-shadow:0 8px 24px #0003;font:13px system-ui";
  const msg=document.createElement("span");msg.style.flex="1";msg.textContent="发现新版本，请先保存当前编辑。";
  const update=document.createElement("button");update.textContent="立即更新";update.onclick=()=>{update.disabled=true;reg.waiting?.postMessage({type:"SKIP_WAITING"});};
  const later=document.createElement("button");later.textContent="稍后";later.onclick=()=>d.remove();
  for(const b of [update,later])b.style.cssText="border:0;border-radius:8px;padding:7px;background:white;color:#315e51";
  d.append(msg,update,later);document.body.append(d);
 };
 if("serviceWorker" in navigator&&(location.protocol==="https:"||location.hostname==="localhost")){
  addEventListener("load",async()=>{
   try{
    navigator.serviceWorker.addEventListener("controllerchange",()=>{if(!reloading){reloading=true;location.reload();}});
    const reg=await navigator.serviceWorker.register("./sw.js",{scope:"./"});
    notify(reg);
    reg.addEventListener("updatefound",()=>reg.installing?.addEventListener("statechange",()=>{if(reg.installing?.state==="installed")notify(reg);}));
    await reg.update();
   }catch(e){console.warn("离线安装未启用",e);}
  });
 }
})();
