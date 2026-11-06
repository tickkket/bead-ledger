/* Optional AI-assisted purchase parsing. Completely idle until user configures a trusted EdgeOne endpoint. */
(function(){
"use strict";
const daily=document.getElementById("local-daily");
if(!daily||!window.DailyIntake?.previewAI)return;
const escape=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const key="bead-ledger-ai-enhance-endpoint-v1";
let saved="";
try{saved=localStorage.getItem(key)||""}catch{}
const firstRow=daily.querySelector('[data-daily="preview"]')?.closest(".local-row");
if(!firstRow)return;
const run=document.createElement("button");
run.type="button";run.className="local-btn";run.id="ai-enhance-run";run.textContent="✨ AI 优化识别";
const settings=document.createElement("button");
settings.type="button";settings.className="local-btn";settings.id="ai-enhance-settings";settings.textContent="⚙ AI 设置";
firstRow.append(run,settings);
const status=document.createElement("div");
status.id="ai-enhance-status";status.className="local-result";status.setAttribute("role","status");
status.setAttribute("aria-live","polite");status.style.margin="5px 0";
firstRow.insertAdjacentElement("afterend",status);
const sheet=document.getElementById("local-sheet");
const panel=document.createElement("div");
panel.id="ai-enhance-config-overlay";
panel.style.cssText="position:fixed;inset:0;z-index:120;background:#14241bb8;display:none;align-items:center;justify-content:center;padding:14px";
panel.innerHTML='<section role="dialog" aria-modal="true" aria-label="AI接口设置" style="width:min(490px,100%);max-height:85dvh;overflow:auto;background:#fff;border-radius:15px;padding:18px;color:#27352d;box-shadow:0 8px 28px #0003">'+
 '<div class="local-row" style="justify-content:space-between;margin:0"><strong style="font-size:17px">AI 接口设置</strong><button type="button" class="local-btn" id="ai-enhance-close">关闭</button></div>'+
 '<label>CloudBase / EdgeOne 接口地址</label><input class="local-field" id="ai-enhance-url" type="url" placeholder="https://你的云函数域名/api/intake" value="'+escape(saved)+'" autocomplete="url">'+
 '<label>个人访问口令（不是模型 API Key）</label><input class="local-field" id="ai-enhance-secret" type="password" autocomplete="off" placeholder="与 CloudBase LEDGER_ACCESS_TOKEN 一致">'+
 '<p class="local-help">仅在本机保存接口网址，不保存个人口令。真正的模型 API Key 只放在云函数环境变量中。</p>'+
 '<button type="button" class="local-btn main" id="ai-enhance-save">保存设置并返回</button></section>';
document.body.append(panel);
const $=id=>panel.querySelector("#"+id);
const show=(s,bad=false)=>{status.textContent=s;status.style.color=bad?"#b44545":"#315e51";};
const openConfig=()=>{panel.style.display="flex";$("ai-enhance-url").focus();};
const closeConfig=()=>{panel.style.display="none";};
settings.addEventListener("click",openConfig);
$("ai-enhance-close").addEventListener("click",closeConfig);
panel.addEventListener("click",e=>{if(e.target===panel)closeConfig();});
$("ai-enhance-save").addEventListener("click",()=>{
 const value=$("ai-enhance-url").value.trim();
 try{if(value)localStorage.setItem(key,value);else localStorage.removeItem(key)}catch{}
 closeConfig();
 show(value?"AI 接口地址已保存。点击「AI 优化识别」即可调用；个人口令仅在本次页面使用。":"未配置 AI 接口，仍可使用本地识别。");
});
$("ai-enhance-url").addEventListener("change",()=>{
 const value=$("ai-enhance-url").value.trim();
 try{if(value)localStorage.setItem(key,value);else localStorage.removeItem(key)}catch{}
});
$("ai-enhance-run").addEventListener("click",async()=>{
 const button=$("ai-enhance-run"),text=document.getElementById("daily-description")?.value?.trim()||"";
 if(!text)return show("请先说说这次买了什么。",true);
 const endpointText=$("ai-enhance-url").value.trim(),secret=$("ai-enhance-secret").value.trim();
 if(!endpointText||!secret){
  openConfig();
  return show("AI 功能尚未配置：需要你自己部署的 CloudBase 或 EdgeOne 接口地址和个人访问口令；本地识别仍可免费使用。",true);
 }
 let url;
 try{
  url=new URL(endpointText);
  if(url.protocol!=="https:"||url.username||url.password||url.search||url.hash||!url.pathname.endsWith("/api/intake"))
   throw Error("接口地址必须为可信 HTTPS 地址，且以 /api/intake 结尾");
 }catch(e){return show("接口地址有误，请检查："+e.message,true)}
 if(secret.length<24)return show("访问口令太短，请使用与 CloudBase 环境变量相同的24位以上个人口令。",true);
 if(text.length>4000)return show("一次最多识别4000字，请分批录入。",true);
 try{
  button.disabled=true;show("正在通过你的私有接口调用模型，只发送上方进货描述，不发送本地账目或照片……");
  const abort=new AbortController(),timeout=setTimeout(()=>abort.abort(),35000);
  let response;
  try{
   response=await fetch(url.href,{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+secret},
    body:JSON.stringify({text}),signal:abort.signal,cache:"no-store"});
  }finally{clearTimeout(timeout)}
  let result;
  try{result=await response.json()}catch{throw Error("接口没有返回 JSON，请确认 CloudBase / EdgeOne 接口地址正确");}
  if(!response.ok)throw Error(result?.error||"AI接口返回错误 "+response.status);
  if(!Array.isArray(result?.items))throw Error("模型返回的格式不正确");
  // The preview adapter validates each row again; no inventory writes happen here.
  window.DailyIntake.previewAI(result.items);
  show("AI 整理了 "+result.items.length+" 条进货信息，请检查名称、数量、单价、总价和分类，确认无误后再入库。");
 }catch(e){
  show("AI 暂时不能识别："+(e?.name==="AbortError"?"请求超时":e.message||e)+"。可继续点上面的「识别进货」使用本地免费识别。",true);
 }finally{button.disabled=false;}
});
})();