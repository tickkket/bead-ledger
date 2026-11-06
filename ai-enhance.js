/* Optional AI-assisted purchase parsing. Completely idle until user configures a trusted EdgeOne endpoint. */
(function(){
"use strict";
const daily=document.getElementById("local-daily");
if(!daily||!window.DailyIntake?.previewAI)return;
const escape=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const key="bead-ledger-ai-enhance-endpoint-v1";
let saved="";
try{saved=localStorage.getItem(key)||""}catch{}
const panel=document.createElement("div");
panel.id="ai-enhance-panel";
panel.style.cssText="margin:10px 0;padding:11px;border:1px solid #dce4dd;border-radius:11px;background:#f6f9f6";
panel.innerHTML='<div class="local-row" style="margin:0;justify-content:space-between">'+
  '<button type="button" class="local-btn" id="ai-enhance-run">✨ AI 增强识别（可选）</button>'+
  '<button type="button" class="local-btn" id="ai-enhance-settings">⚙ 配置</button></div>'+
  '<div id="ai-enhance-config" hidden>'+
  '<label>CloudBase / EdgeOne 接口地址</label><input class="local-field" id="ai-enhance-url" type="url" placeholder="https://你自己的站点域名/api/intake" value="'+escape(saved)+'" autocomplete="url">'+
  '<label>个人访问口令（不是模型 API Key）</label><input class="local-field" id="ai-enhance-secret" type="password" autocomplete="off" placeholder="填写在 CloudBase 云函数环境变量中设置的个人口令">'+
  '<div class="local-help">仅保存接口地址，不保存访问口令。请勿在这里粘贴 AI 模型 API Key；真正的模型密钥只放在云函数的服务端环境变量里。</div></div>'+
  '<div id="ai-enhance-status" class="local-result" role="status" aria-live="polite" style="margin:7px 0 0"></div>';
const firstRow=daily.querySelector('[data-daily="preview"]')?.closest(".local-row");
if(!firstRow)return;
firstRow.insertAdjacentElement("afterend",panel);
const $=id=>panel.querySelector("#"+id),status=$("ai-enhance-status");
const show=(s,bad=false)=>{status.textContent=s;status.style.color=bad?"#b44545":"#315e51";};
$("ai-enhance-settings").addEventListener("click",()=>{$("ai-enhance-config").hidden=!$("ai-enhance-config").hidden;});
$("ai-enhance-url").addEventListener("change",()=>{
 const value=$("ai-enhance-url").value.trim();
 try{if(value)localStorage.setItem(key,value);else localStorage.removeItem(key)}catch{}
});
$("ai-enhance-run").addEventListener("click",async()=>{
 const button=$("ai-enhance-run"),text=document.getElementById("daily-description")?.value?.trim()||"";
 if(!text)return show("请先说说这次买了什么。",true);
 const endpointText=$("ai-enhance-url").value.trim(),secret=$("ai-enhance-secret").value.trim();
 if(!endpointText||!secret){
  $("ai-enhance-config").hidden=false;
  return show("AI 功能尚未配置：需要你自己部署的 CloudBase 或 EdgeOne 接口地址和个人访问口令；本地识别仍可免费使用。",true);
 }
 let url;
 try{
  url=new URL(endpointText);
  if(url.protocol!=="https:"||url.username||url.password||url.search||url.hash||!url.pathname.endsWith("/api/intake"))
   throw Error("接口地址必须为可信 HTTPS 地址，且以 /api/intake 结尾");
 }catch(e){return show("接口地址有误，请检查："+e.message,true)}
 if(secret.length<24)return show("访问口令太短，请使用与 EdgeOne 环境变量相同的24位以上个人口令。",true);
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
  try{result=await response.json()}catch{throw Error("接口没有返回 JSON，请确认 EdgeOne 部署地址正确");}
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