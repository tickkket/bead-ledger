/* Optional AI assistant. API keys only live in the current page, never persisted. */
(function(){
"use strict";
let photo="", result=null, quotes=[],busy=false;
const E=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const T=x=>String(x??"").trim();
const css=document.createElement("style");
css.textContent="#ai-launch{position:fixed;z-index:40;right:12px;bottom:88px;border:0;border-radius:35px;background:#315e51;color:white;padding:12px 16px;box-shadow:0 4px 22px #0003;font-weight:650}#ai-mask{display:none;position:fixed;inset:0;background:#0009;z-index:90;align-items:center;justify-content:center;padding:10px}#ai-mask.open{display:flex}#ai-panel{background:#fbfbf8;width:min(700px,100%);max-height:95dvh;overflow:auto;border-radius:15px;padding:17px;color:#26362f}#ai-panel textarea{min-height:110px;resize:vertical}#ai-panel label{display:block;font-size:12px;font-weight:600;margin:12px 0 5px}.ai-input{width:100%;padding:10px;border:1px solid #dce1dc;border-radius:10px;background:white;color:#27342c;font:inherit}.ai-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:10px 0}.ai-button{padding:9px 12px;border:1px solid #cddad2;border-radius:9px;background:white;color:#315e51;cursor:pointer}.ai-button.primary{background:#315e51;color:white}.ai-button:disabled{opacity:.45}.ai-hint{font-size:12px;line-height:1.6;color:#68776b;margin:5px 0}#ai-result{font:12px/1.6 monospace;min-height:170px}#ai-market{display:none}#ai-quotes>div{background:white;border:1px solid #e6eae6;border-radius:10px;margin:9px 0;padding:12px;font-size:12px;line-height:1.7}#ai-message{font-size:12px;white-space:pre-wrap;color:#315e51;margin:10px 0}#ai-panel a{color:#315e51}@media(max-width:600px){#ai-mask{padding:0;align-items:flex-end}#ai-panel{border-radius:18px 18px 0 0;max-height:94dvh;padding:14px}}";
document.head.append(css);
const launcher=document.createElement("button");launcher.id="ai-launch";launcher.textContent="✦ AI进货助手";launcher.type="button";document.body.append(launcher);
const mask=document.createElement("div");mask.id="ai-mask";
mask.innerHTML=[
'<section id="ai-panel" role="dialog" aria-modal="true" aria-label="AI进货助手">',
'<div class="ai-row" style="justify-content:space-between"><strong style="font-size:18px">✦ AI进货与行情助手</strong><button class="ai-button" data-ai="close">关闭</button></div>',
'<div class="ai-hint">原有记账离线可用。只有点击 AI 按钮时，选中的描述或照片才会发送到你选择的国内模型。AI 需要联网，可能消耗免费额度或产生服务商费用。</div>',
'<label id="ai-key-label">阿里云百炼 API Key（本页临时使用；不保存）</label>',
'<input id="ai-key" type="password" autocomplete="off" class="ai-input" placeholder="请粘贴自己的 API Key">',
'<div class="ai-hint"><a id="ai-key-link" href="https://bailian.console.aliyun.com/" target="_blank" rel="noopener noreferrer">开通百炼并获取 API Key</a> · 请为个人测试建立专用密钥并设置用量预算。密钥只在当前页面内存中，但浏览器直连仍存在泄露风险；不建议使用有较高支付额度的密钥。</div>',
'<div class="ai-row"><span class="ai-hint">模型服务</span><select id="ai-provider" class="ai-input" style="flex:1"><option value="qwen">阿里云百炼·通义千问（国内推荐，支持图片和联网查价）</option><option value="deepseek">DeepSeek API（文字整理；不支持本工具联网查价）</option></select></div><div class="ai-hint" id="ai-provider-note">文字整理使用 qwen-plus；图片识别使用 qwen3-vl-plus；行情用 qwen-plus 联网搜索。百炼 API Key 与地区需匹配（默认北京）。</div>',
'<div class="ai-row"><button class="ai-button primary" data-ai="show-parse">整理盲盒</button><button class="ai-button" data-ai="show-market">联网更新行情</button></div>',
'<div id="ai-parse">',
'<label>把这次盲盒的情况直接告诉 AI</label>',
'<textarea id="ai-description" class="ai-input" placeholder="例如：小红书买盲盒，实付30元，共12颗。优选黄水晶卡17、无棉无裂1颗，虎眼石卡8、微棉2颗，另外9颗福利珠……"></textarea>',
'<label>可选：表格截图 / 盲盒照片</label><input id="ai-photo" class="ai-input" type="file" accept="image/*">',
'<div class="ai-hint">照片只用于辅助理解；不能仅凭外观鉴别天然石真假、精确克数或真实批发价格。</div>',
'<div class="ai-row"><button class="ai-button primary" data-ai="organize">AI生成表格</button><button class="ai-button" data-ai="copy">复制表格</button><button class="ai-button" data-ai="import">填入盲盒入库</button></div>',
'<label>整理结果（可以直接编辑）</label><textarea id="ai-result" class="ai-input" spellcheck="false" placeholder="AI将生成 TSV 表格，也能复制到 Excel"></textarea>',
'<div class="ai-hint">请先核对品类、颗数、瑕疵、价格。导入后仍需确认整盒实际付款和成本分摊，AI不直接扣库存。</div>',
'</div><div id="ai-market">',
'<label>需要更新参考行情的品类（每行一种，最多8种）</label><textarea id="ai-names" class="ai-input" placeholder="黄水晶&#10;黑发晶&#10;紫萤石"></textarea>',
'<div class="ai-hint">只寻找明确标示单位的近期散珠批发人民币元/克报价。模型不能凭空生成行情；无可比来源就不更新。此功能仅支持百炼通义千问。</div>',
'<div class="ai-row"><button class="ai-button primary" data-ai="search">联网查价（按次消耗配额）</button><button class="ai-button" data-ai="apply">核对并写入选中行情</button></div>',
'<div id="ai-quotes"></div></div>',
'<div id="ai-message" role="status" aria-live="polite"></div></section>'
].join("");
document.body.append(mask);
const q=id=>document.getElementById(id),message=(s,bad=false)=>{q("ai-message").textContent=s;q("ai-message").style.color=bad?"#b64c49":"#315e51"};
launcher.onclick=()=>{mask.classList.add("open");if(!q("ai-names").value){const names=[...new Set([...state.materials.filter(x=>x.kind==="bead"&&!x.isWelfare).map(x=>x.subtype),...state.markets.map(x=>x.category)].filter(Boolean))];q("ai-names").value=names.slice(0,8).join("\n");}};
function tab(t){q("ai-parse").style.display=t==="parse"?"":"none";q("ai-market").style.display=t==="market"?"":"none";message("");}
function parseJSON(s){let t=String(s||"").trim();const bt=String.fromCharCode(96);if(t.startsWith(bt+bt+bt))t=t.replace(new RegExp("^"+bt+"{3}(?:json)?\\s*","i"),"").replace(new RegExp(bt+"{3}\\s*$"),"");try{return JSON.parse(t)}catch(e){const a=t.indexOf("{"),b=t.lastIndexOf("}");if(a<0||b<a)throw Error("模型没有返回有效的结构化结果");return JSON.parse(t.slice(a,b+1));}}
const PROVIDERS={
 qwen:{endpoint:"https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",keyLink:"https://bailian.console.aliyun.com/",name:"阿里云百炼",textModel:"qwen-plus",visionModel:"qwen3-vl-plus"},
 deepseek:{endpoint:"https://api.deepseek.com/chat/completions",keyLink:"https://platform.deepseek.com/",name:"DeepSeek",textModel:"deepseek-chat"}
};
function provider(){return q("ai-provider").value==="deepseek"?"deepseek":"qwen";}
function updateProviderUI(){
 const p=provider(),info=PROVIDERS[p],link=q("ai-key-link");
 q("ai-key-label").textContent=info.name+" API Key（仅当前网页临时使用；不保存）";
 link.href=info.keyLink;link.textContent="获取 "+info.name+" API Key";
 q("ai-key").value="";
 q("ai-provider-note").textContent=p==="qwen"?
 "默认使用百炼北京地域 API；文字 qwen-plus，图片 qwen3-vl-plus，行情 qwen-plus 联网搜索。需国内地域的百炼密钥。":
 "DeepSeek 仅用于文字描述整理；上传照片请改用通义千问。联网行情需切回百炼，模型本身不能替你访问商品网站。";
 if(p!=="qwen"&&q("ai-market").style.display!=="none"){tab("parse");message("已切换到 DeepSeek，联网查价只支持百炼通义千问。");}
}
q("ai-provider").addEventListener("change",updateProviderUI);
async function aiRequest(prompt,usePhoto,grounding){
 if(!navigator.onLine)throw Error("当前没有网络。原有账本可离线使用，但 AI 功能需要联网。");
 const p=provider(),conf=PROVIDERS[p];
 if(p==="deepseek"&&usePhoto&&photo)throw Error("当前 DeepSeek 文字模式不能识别你上传的照片，请切换阿里云百炼。");
 if(grounding&&p!=="qwen")throw Error("联网查价仅支持百炼 qwen-plus，请在模型服务里切换为通义千问。");
 const key=T(q("ai-key").value);if(!key)throw Error("请先填写 "+conf.name+" 的 API Key（仅本页使用，不会存进台账）。");
 const model=usePhoto&&photo?conf.visionModel:conf.textModel;
 const body={model,messages:[{role:"user",content:usePhoto&&photo?[{type:"text",text:prompt},{type:"image_url",image_url:{url:photo}}]:prompt}],stream:false};
 if(grounding){body.enable_search=true;body.search_options={search_strategy:"turbo"};}
 else if(p==="deepseek"){body.response_format={type:"json_object"};}
 const controller=new AbortController(),id=setTimeout(()=>controller.abort(),65000);
 let response;
 try{response=await fetch(conf.endpoint,{method:"POST",mode:"cors",signal:controller.signal,headers:{"Content-Type":"application/json","Authorization":"Bearer "+key},body:JSON.stringify(body)});}
 catch(e){const eText=e?.name==="AbortError"?"请求超时（65秒）":"无法直连 "+conf.name+" API；可能是网络、浏览器跨域限制或接口限制。请不要把密钥发给别人。";throw Error(eText);}
 finally{clearTimeout(id);}
 const data=await response.json().catch(()=>({}));
 if(!response.ok)throw Error(conf.name+" API 返回 HTTP "+response.status+"："+String(data?.error?.message||"请核对地域、API Key、模型开通情况和配额").slice(0,170));
 const content=data.choices?.[0]?.message?.content;
 const text=typeof content==="string"?content:Array.isArray(content)?content.map(x=>x.text||"").join("\n"):"";
 if(!text)throw Error("模型没有返回可用文字，请检查模型和额度。");
 return {data:parseJSON(text),cand:data.choices?.[0],raw:data};
}
async function readPhoto(file){
 if(!file){photo="";return}if(file.size>12*1024*1024)throw Error("照片不能超过12MB");
 const url=URL.createObjectURL(file),im=new Image();
 try{await new Promise((a,b)=>{im.onload=a;im.onerror=()=>b(Error("无法读取图片"));im.src=url});const factor=Math.min(1,1300/Math.max(im.width,im.height)),canvas=document.createElement("canvas");canvas.width=Math.max(1,Math.round(im.width*factor));canvas.height=Math.max(1,Math.round(im.height*factor));canvas.getContext("2d").drawImage(im,0,0,canvas.width,canvas.height);photo=canvas.toDataURL("image/jpeg",0.7);}
 finally{URL.revokeObjectURL(url)}
}
q("ai-photo").onchange=async e=>{try{await readPhoto(e.target.files?.[0]);message(photo?"照片已选；仅点击 AI 生成时才发送。":"")}catch(err){message(err.message,true)}};
function toTSV(rows){
 const col=["名称","品类","卡数","克数","品相","瑕疵","数量","优选/福利","该品类市面批发克价参考","摆摊建议售价","线上市面零售价参考"];
 const safe=s=>String(s??"").replace(/[\t\r\n]/g," ").trim();
 return [col.join("\t"),...rows.map(r=>[r.name,r.subtype||r.name,r.spec,r.weight,r.grade,r.flaw,r.qty,r.status,r.wholesaleRange,r.stallRange,r.onlineRange].map(safe).join("\t"))].join("\n");
}
async function organize(){
 const description=T(q("ai-description").value);if(!description&&!photo)throw Error("请先描述盲盒或上传图片");message("正在整理，请保留此页面……");
 const prompt=[
 "你是中文饰品手作摆摊的盲盒入库助手。只提取用户提供的信息，严禁编造数量、克重、报价、瑕疵或天然石鉴别结论。",
 "输出 JSON 对象：{\"title\":\"\",\"source\":\"\",\"batchTotal\":null,\"totalQty\":null,\"rows\":[{\"name\":\"\",\"subtype\":\"\",\"spec\":\"\",\"weight\":\"\",\"grade\":\"普通\",\"flaw\":\"\",\"qty\":1,\"status\":\"优选\",\"wholesaleRange\":\"\",\"stallRange\":\"\",\"onlineRange\":\"\"}],\"warnings\":[]}",
 "卡数代表珠子尺寸/规格（卡17等），不是克数或克拉数；weight只有用户亲自称重才填写。grade只选精品/优选/普通/瑕疵，具体品相原话须完整保留（如无棉无裂）。",
 "优选、福利只能依据用户说明区分；数量没说时一行一颗。仅填写明确说过的批发克价、摆摊建议价和网上零售价，没有就留空。不要从图片自行推断价钱或重量。",
 "batchTotal只有实际整盒实付价可填写，不能用所谓单颗成本代替。重复同类若品相不同拆成单独记录。最多150行。警告写warnings。",
 "原始说明："+description
 ].join("\n");
 const response=await aiRequest(prompt,true,false),j=response.data;if(!Array.isArray(j.rows)||!j.rows.length)throw Error("AI未识别到具体珠子，请补充数量与品类");
 if(j.rows.length>150)throw Error("超过150行，请分批整理");
 const rows=j.rows.map((r,i)=>{
  const name=T(r.name||r.subtype);if(!name)throw Error("第"+(i+1)+"行缺少名称");
  const qty=Number(r.qty);return {name,subtype:T(r.subtype)||name,spec:T(r.spec),weight:r.weight??"",grade:["精品","优选","普通","瑕疵"].includes(r.grade)?r.grade:"普通",flaw:T(r.flaw),qty:Number.isInteger(qty)&&qty>0&&qty<=300?qty:1,status:/福利/.test(r.status)?"福利":"优选",wholesaleRange:T(r.wholesaleRange),stallRange:T(r.stallRange),onlineRange:T(r.onlineRange)};
 });
 result={rows,title:T(j.title),source:T(j.source),batchTotal:j.batchTotal,totalQty:j.totalQty};q("ai-result").value=toTSV(rows);
 message("已生成"+rows.length+"行、"+rows.reduce((s,x)=>s+x.qty,0)+"颗，请核对后复制或填入盲盒。"+(Array.isArray(j.warnings)&&j.warnings.length?"\n注意："+j.warnings.slice(0,5).join("；"):""));
}
async function copy(){
 const s=T(q("ai-result").value);if(!s)throw Error("尚无表格可复制");
 try{await navigator.clipboard.writeText(s);message("表格已复制，可以粘贴到Excel/WPS")}
 catch(e){q("ai-result").focus();q("ai-result").select();message("无法自动复制，已选中，请手动复制")}
}
async function importBlind(){
 const s=T(q("ai-result").value);if(!s)throw Error("请先生成表格");
 const parsed=parseBlindTable(s);if(!parsed.premium.length)throw Error("未找到优选珠");
 blindForm();const editor=q("editor");editor.querySelector('[name="blindTable"]').value=s;
 if(result){
  if(result.title)editor.querySelector('[name="title"]').value=result.title;
  if(result.source)editor.querySelector('[name="source"]').value=result.source;
  const price=Number(result.batchTotal);if(result.batchTotal!==null&&result.batchTotal!==""&&Number.isFinite(price)&&price>=0)editor.querySelector('[name="total"]').value=price;
  const amount=Number(result.totalQty);if(Number.isInteger(amount)&&amount>=parsed.count)editor.querySelector('[name="totalQty"]').value=amount;
 }
 blindPaste();if(photo){ui.images.batch=photo;updatePreview("batch");}
 mask.classList.remove("open");message("请在盲盒表单确认整盒实付、总数、品相后再正式入库。");
}
function sourced(candidate,raw){
 const outputs=[...(candidate?.groundingMetadata?.groundingChunks||[]).map(x=>({url:x.web?.uri||"",title:x.web?.title||""})),
 ...(raw?.search_info?.search_results||[]).map(x=>({url:x.url||"",title:x.title||""})),
 ...(raw?.output?.search_info?.search_results||[]).map(x=>({url:x.url||"",title:x.title||""}))];
 return outputs.filter(x=>/^https:\/\//.test(x.url));
}
function safeURL(s){try{const u=new URL(s);return u.protocol==="https:"?u.href:""}catch(e){return ""}}
async function search(){
 const names=[...new Set(q("ai-names").value.split(/[\n，,、；;]/).map(T).filter(Boolean))];if(!names.length)throw Error("请填写品类");if(names.length>8)throw Error("每次最多查8个品类，以免浪费搜索额度");
 quotes=[];message("联网检索中：只会列出有来源的候选报价……");
 const prompt=[
 "今天是"+new Date().toLocaleDateString("zh-CN")+"。你是中国串珠饰品散珠批发克价核价助手。请使用Google Search搜索近期真实、可公开访问的批发报价来源。",
 "只比较同品类、同尺寸与同品相的散珠【人民币元/g】，必须有明确可核验的克价。不允许把每颗、每串、成品零售价换算成批发克价，不允许捏造来源网址、更新日期或价格。",
 "输出纯 JSON：{\"items\":[{\"category\":\"\",\"low\":null,\"high\":null,\"date\":\"\",\"sourceUrl\":\"\",\"sourceTitle\":\"\",\"confidence\":\"低\",\"note\":\"\"}]}。low/high为数字或null；找不到有依据的元/g报价时null，解释原因。",
 "查询品类："+names.join("、")
 ].join("\n");
 const {data,cand,raw}=await aiRequest(prompt,false,true);
 if(!Array.isArray(data.items))throw Error("AI未返回可解析的行情结果");
 const sources=sourced(cand,raw);
 quotes=data.items.filter(x=>names.includes(T(x.category))).slice(0,8).map((x,i)=>{
  const low=Number(x.low),high=Number(x.high),url=safeURL(x.sourceUrl);
  return {id:i,category:T(x.category),low,high,url,date:T(x.date),sourceTitle:T(x.sourceTitle),note:T(x.note),verified:x.low!==null&&x.high!==null&&low>0&&high>=low&&high<100000&&Boolean(url)&&/^https:\/\//.test(url)};
 });
 q("ai-quotes").innerHTML=quotes.map(x=>'<div><label style="display:block"><input type="checkbox" data-quote="'+x.id+'" '+(x.verified?'':'disabled')+'> <strong>'+E(x.category)+'</strong> '+(x.verified?'¥'+x.low.toFixed(2)+'～'+x.high.toFixed(2)+'/g':'无可用的元/g价格或参考链接')+'</label><div>来源：'+(x.url?'<a href="'+E(x.url)+'" target="_blank" rel="noopener noreferrer">'+E(x.sourceTitle||x.url)+'</a>':'缺失')+'</div><div>时间：'+E(x.date||"未知")+' · '+E(x.note)+'</div><div>'+(x.verified?'模型提供的来源未经独立验证。必须打开链接，确认页面确实有相同规格的批发元/g报价后才能勾选':'缺少完整参考价格或 HTTPS 链接，无法写入')+'</div></div>').join("");
 message("已检索。可供核对的参考价格 "+quotes.filter(x=>x.verified).length+" 条。所有候选链接由 AI 提供，可能错误。请先打开真实商家页面确认品类、品相、单位、时间和报价，再勾选写入。");
}
async function apply(){
 const picked=[...document.querySelectorAll("[data-quote]:checked")].map(e=>Number(e.dataset.quote)),toSave=quotes.filter(x=>picked.includes(x.id)&&x.verified);
 if(!toSave.length)throw Error("请先核对来源并勾选要采用的价格");
 if(!confirm("注意：AI给出的来源可能不真实。你是否已经打开原始来源，确认品类、日期和人民币/克的批发报价一致？\n确认后才会更新行情，不修改历史成本。"))return;
 await commit(()=>{
  if(!Array.isArray(state.marketHistory))state.marketHistory=[];
  for(const x of toSave){
   const prev=state.markets.find(m=>m.category===x.category);
   if(prev)state.marketHistory.push({category:prev.category,price:prev.gramPrice,low:prev.low??null,high:prev.high??null,sourceUrl:prev.sourceUrl||"",date:prev.updatedAt||"",archivedAt:new Date().toISOString()});
   const data={...(prev||{}),id:prev?.id||uid(),category:x.category,gramPrice:Math.round((x.low+x.high)*5000)/10000,low:x.low,high:x.high,gradePrices:{},sourceUrl:x.url,sourceTitle:x.sourceTitle,sourceNote:x.note,updatedAt:new Date().toISOString().slice(0,10),sourceDate:x.date,platformPrice:prev?.platformPrice||0};
   if(prev)Object.assign(prev,data);else state.markets.push(data);
  }
 },"行情已更新，历史成本不变");
 q("ai-quotes").querySelectorAll("[data-quote]").forEach(el=>el.checked=false);
 message("已确认并写入 "+toSave.length+" 条行情。");
}
async function run(fn){
 if(busy)return;busy=true;mask.querySelectorAll("[data-ai]").forEach(x=>x.disabled=true);
 try{await fn()}catch(e){message(e.message||String(e),true)}
 finally{busy=false;mask.querySelectorAll("[data-ai]").forEach(x=>x.disabled=false)}
}
mask.addEventListener("click",e=>{
 const a=e.target.closest("[data-ai]")?.dataset.ai;if(!a)return;
 if(a==="close"){if(!busy)mask.classList.remove("open");return}
 if(a==="show-parse"){tab("parse");return}
 if(a==="show-market"){tab("market");return}
 const f={organize,copy,import:importBlind,search,apply}[a];if(f)run(f);
});
})();