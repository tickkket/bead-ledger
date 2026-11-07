/* AI Blind Box workflow (separate from stock ledger and old blind-box drafts).
   Only user-approved facts enter accounting. No automatic inventory writes. */
(function(){
"use strict";
const KEY="bead-ledger-blind-ai-workspace-v1",API_KEY="bead-ledger-ai-enhance-endpoint-v1";
const P=()=>window.BlindBoxPlanner;
const escapeHTML=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const str=x=>String(x??"").trim();
const fresh=()=>({total:"",description:"",markup:2.5,strandFactor:12,confirmed:false,rows:[],messages:[],images:[],endpoint:"",token:"",output:"",plan:null,lastQuestion:"",busy:false});
let state=fresh(),overlay=null,lastFocus=null;
function load(){
 try{
  const a=JSON.parse(localStorage.getItem(KEY)||"null");if(!a)return;
  state.total=str(a.total);state.description=str(a.description);
  state.markup=Number(a.markup)||2.5;state.strandFactor=Number(a.strandFactor)||12;
  state.rows=Array.isArray(a.rows)?a.rows.slice(0,60).map(P().cleanRow):[];
  state.output=str(a.output);
 }catch(e){console.warn("盲盒整理草稿读取失败",e)}
}
function persist(){
 try{localStorage.setItem(KEY,JSON.stringify({total:state.total,description:state.description,markup:state.markup,strandFactor:state.strandFactor,rows:state.rows,output:state.output}))}catch{}
}
function getURL(){try{return str(localStorage.getItem(API_KEY))}catch{return ""}}
function el(id){return overlay?.querySelector("#"+id)||null}
function addMessage(message,role="assistant"){
 state.messages.push({role,text:String(message||"").slice(0,1400)});
 if(state.messages.length>35)state.messages=state.messages.slice(-35);
 renderChat();
}
function status(message,error=false){
 const box=el("baw-status");if(box){box.style.color=error?"#ab403f":"#337b55";box.textContent=message}
}
function sync(){
 if(!overlay)return;
 state.total=str(el("baw-total")?.value);state.description=el("baw-description")?.value||"";
 state.markup=Number(el("baw-markup")?.value)||2.5;
 state.strandFactor=Number(el("baw-strand-factor")?.value)||12;
 state.endpoint=str(el("baw-endpoint")?.value)||getURL();
 state.token=el("baw-token")?.value??state.token;
 try{
  const url=new URL(state.endpoint);
  if(url.protocol==="https:"&&!url.username&&!url.password)localStorage.setItem(API_KEY,url.href)
 }catch{}
 persist();
}
function clearPlan(){
 state.plan=null;state.output="";
 const output=el("baw-output");if(output)output.innerHTML="";
 persist();
}
function createHost(){
 if(overlay)return;
 const css=[
 "#blind-ai-wizard{position:fixed;inset:0;z-index:120;background:#152820bb;display:flex;align-items:center;justify-content:center;padding:12px;box-sizing:border-box}",
 "#blind-ai-wizard[hidden]{display:none!important}",
 ".baw-shell{width:min(880px,100%);max-height:94dvh;overflow-y:auto;overscroll-behavior:contain;background:#f9faf7;color:#233b31;border-radius:16px;padding:15px;box-sizing:border-box}",
 ".baw-head{position:sticky;top:-16px;z-index:2;background:#f9faf7;padding:8px 0;display:flex;justify-content:space-between;align-items:center;gap:8px}",
 ".baw-head h3{font-size:19px;margin:0}",
 ".baw-panel{background:white;border:1px solid #dde6dc;padding:12px;border-radius:12px;margin-top:10px}",
 ".baw-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}",
 ".baw-field{font-size:12px;color:#52695d;display:flex;flex-direction:column;gap:6px;min-width:0}",
 ".baw-wide{grid-column:1/-1}",
 ".baw-input,.baw-text,.baw-select{width:100%;box-sizing:border-box;background:#fff;color:#263b30;border:1px solid #d0dad2;border-radius:9px;padding:9px 10px;font:inherit;font-size:15px;min-height:40px}",
 ".baw-text{min-height:83px;resize:vertical}",
 ".baw-note{font-size:12px;color:#677d6f;line-height:1.65}",
 ".baw-btn{background:white;color:#305d48;border:1px solid #cfdbd2;padding:9px 11px;min-height:38px;border-radius:9px;cursor:pointer;font:inherit;font-size:13px}",
 ".baw-btn.primary{background:#315f4a;color:white;border-color:#315f4a}",
 ".baw-btn.danger{color:#a13a35}",
 ".baw-btn:disabled{opacity:.45}",
 ".baw-actions{display:flex;flex-wrap:wrap;gap:7px;margin:10px 0}",
 ".baw-row{border-bottom:1px solid #e8ece6;padding:10px 0}",
 ".baw-row:last-child{border-bottom:0}",
 ".baw-images{display:flex;flex-wrap:wrap;gap:8px}",
 ".baw-image{position:relative;width:125px;padding:5px;border:1px solid #e1e8df;border-radius:9px;background:#fff}",
 ".baw-image img{width:100%;height:90px;display:block;object-fit:cover;border-radius:7px}",
 ".baw-image button{border:1px solid #d6e0d5;background:#f7faf6;border-radius:6px;cursor:pointer;padding:5px;font-size:11px;color:#315e51}",".baw-image .baw-image-actions{display:flex;flex-wrap:wrap;gap:4px;margin-top:5px}",".baw-image small{display:block;line-height:1.5;color:#617265}",
 ".baw-chat{max-height:180px;overflow-y:auto;border:1px solid #dfe6df;background:#f5f8f5;padding:8px;border-radius:9px}",
 ".baw-msg{background:white;padding:9px;border-radius:7px;line-height:1.6;font-size:13px;white-space:pre-wrap;overflow-wrap:anywhere;margin:6px 0}",
 ".baw-msg.user{background:#e7f1e9}",
 ".baw-scroll{overflow-x:auto}",
 ".baw-scroll table{border-collapse:collapse;font-size:12px;min-width:820px}",
 ".baw-scroll td,.baw-scroll th{padding:7px 8px;border-bottom:1px solid #e1e8e1;white-space:nowrap;text-align:left}",
 "#baw-status{min-height:18px;font-size:13px;white-space:pre-wrap}",
 "@media(max-width:620px){#blind-ai-wizard{align-items:flex-end;padding:0}.baw-shell{max-height:97dvh;width:100%;border-radius:16px 16px 0 0;padding:12px}}"
 ];
 const st=document.createElement("style");st.textContent=css.join("\n");document.head.append(st);
 overlay=document.createElement("div");overlay.id="blind-ai-wizard";overlay.hidden=true;
 overlay.setAttribute("role","dialog");overlay.setAttribute("aria-modal","true");overlay.setAttribute("aria-label","AI盲盒整理");
 overlay.innerHTML='<div class="baw-shell"><div class="baw-head"><h3>✨ AI 盲盒整理</h3><button type="button" class="baw-btn" data-baw="close">关闭</button></div><div id="baw-content"></div></div>';
 document.body.append(overlay);
 overlay.addEventListener("click",onClick);
 overlay.addEventListener("input",onInput);
 overlay.addEventListener("change",onChange);
}
function render(){
 createHost();
 el("baw-content").innerHTML=[
 '<p class="baw-note">① 上传或拍摄照片、填写总价、品类、卡数、数量与形状 → ② AI或本地核对并逐项补齐 → ③ 按颗/整串及可调整的品类权重分摊 → ④ 复制台账。<b>不会自动入库或修改旧账。</b></p>',
 '<div class="baw-panel"><div class="baw-grid">',
 '<label class="baw-field">整套实付总价（元） <b style="color:#bc3939">*</b><input id="baw-total" class="baw-input" type="number" min="0" step=".01" value="'+escapeHTML(state.total)+'" placeholder="如58.80"></label>',
 '<label class="baw-field">建议售价倍率（可改）<input id="baw-markup" class="baw-input" type="number" min="1" max="20" step=".1" value="'+escapeHTML(state.markup)+'"></label>',
 '<label class="baw-field baw-wide">整串折算系数（默认12，可改）<input id="baw-strand-factor" class="baw-input" type="number" min="1" max="200" step="1" value="'+escapeHTML(state.strandFactor)+'"><span class="baw-note">整串成本权重按约12颗普通珠折算，不代表市场行情。</span></label>',
 '<label class="baw-field baw-wide">品类、卡数、数量、形状（支持“碎石手串2串”“圆珠手串22颗”）<textarea id="baw-description" class="baw-text" placeholder="黄水晶｜17｜2｜圆珠&#10;黑发晶｜10｜1｜隔片">'+escapeHTML(state.description)+'</textarea></label>',
 '<label class="baw-field baw-wide">珠子照片（最多4张，可多选）<input id="baw-pictures" type="file" class="baw-input" accept="image/*" multiple></label>',
 '<div class="baw-actions baw-wide" style="margin:0"><button type="button" class="baw-btn primary" data-baw="camera">📷 直接拍照</button><button type="button" class="baw-btn" data-baw="paste-photo">粘贴图片</button><span class="baw-note">拍照可缩放、尝试点按对焦；图片支持裁剪和调整，保留原图。</span></div>',
 '<div class="baw-images baw-wide" id="baw-images">'+state.images.map((photo,i)=>'<div class="baw-image"><img alt="第'+(i+1)+'张照片" src="'+escapeHTML(photo.edited||photo.original)+'"><small>第'+(i+1)+'张 · '+escapeHTML(photo.source||"上传")+(photo.edited?" · 已编辑":" · 原图")+'</small><div class="baw-image-actions"><button type="button" data-baw="edit-image" data-index="'+i+'">编辑</button><button type="button" data-baw="restore-image" data-index="'+i+'" '+(!photo.edited?"disabled":"")+'>原图</button><button type="button" data-baw="remove-image" data-index="'+i+'">删除</button></div></div>').join("")+'</div>',
 '</div>',
 '<div class="baw-actions"><button type="button" class="baw-btn" data-baw="parse">整理描述并核对</button><button type="button" class="baw-btn primary" data-baw="ai">AI 核对图片与文字</button><button type="button" class="baw-btn" data-baw="add">＋ 添加一种</button></div>',
 '<details><summary class="baw-note">AI 接口设置（首次使用或重新打开后填口令）</summary><div class="baw-grid" style="margin-top:8px">',
 '<label class="baw-field baw-wide">接口地址<input id="baw-endpoint" class="baw-input" type="url" value="'+escapeHTML(state.endpoint||getURL())+'" placeholder="https://…/api/intake"></label>',
 '<label class="baw-field baw-wide">个人访问口令（仅保留在当前页面，不写入草稿）<input id="baw-token" class="baw-input" type="password" autocomplete="off" value="'+escapeHTML(state.token)+'"></label></div>',
 '<p class="baw-note">上传的图片会在点击 AI 核对后发送到你配置的接口及模型服务。云函数需要新增盲盒核对模式；尚未升级时，可以使用本地核对、对话补齐和分摊导出。照片只供外观参考，AI不能确定材质真伪或精确卡数。</p></details></div>',
 '<div class="baw-panel"><b>逐种核对明细</b><p class="baw-note">“品类权重”可以按你对不同珠子价值的判断修改，默认系数不是市场估价。</p><div id="baw-rows"></div></div>',
 '<div class="baw-panel"><b>补齐信息</b><div id="baw-chat" class="baw-chat"></div>',
 '<label class="baw-field" style="margin-top:9px">回复追问（如“第2种10卡、3颗、圆珠”）<textarea id="baw-reply" class="baw-text" placeholder="在这里补充信息，也可以直接修改上面对应的输入框"></textarea></label>',
 '<div class="baw-actions"><button class="baw-btn" type="button" data-baw="reply">提交补充并核对</button><button class="baw-btn" type="button" data-baw="ask">查看缺少项</button></div><div id="baw-status" aria-live="polite"></div></div>',
 '<div class="baw-panel"><label class="baw-note" style="display:block;margin-bottom:10px"><input id="baw-confirm" type="checkbox" '+(state.confirmed?"checked":"")+'> 我已核对每种珠子的品类、卡数、数量、形状、计量单位及权重</label><div class="baw-actions"><button type="button" data-baw="allocate" class="baw-btn primary">确认后生成成本台账</button><button type="button" data-baw="copy" class="baw-btn">复制台账</button><button type="button" data-baw="clear" class="baw-btn danger">清空本次草稿</button></div><div id="baw-output"></div></div>'
 ].join("");
 renderRows();renderChat();if(state.output)renderOutput();
}
function renderRows(){
 const box=el("baw-rows");if(!box)return;
 if(!state.rows.length){box.innerHTML='<p class="baw-note">暂无明细。填写描述后点击“整理”，或添加第一种珠子。</p>';return}
 box.innerHTML=state.rows.map((r,i)=>{
  const input=(label,key,placeholder,type="text")=>'<label class="baw-field">'+label+'<input class="baw-input" type="'+type+'" data-baw-field="'+key+'" value="'+escapeHTML(r[key])+'" placeholder="'+escapeHTML(placeholder)+'"></label>';
  const select='<label class="baw-field">珠子大类<select class="baw-select" data-baw-field="group">'+P().FAMILIES.map(g=>'<option value="'+escapeHTML(g)+'" '+(g===r.group?'selected':'')+'>'+escapeHTML(g)+'</option>').join("")+'</select></label>';
  const unit='<label class="baw-field">计量单位 *<select class="baw-select" data-baw-field="unit"><option value="颗" '+(r.unit!=="串"?"selected":"")+'>颗（按单颗）</option><option value="串" '+(r.unit==="串"?"selected":"")+'>串（按整串）</option></select></label>';
  const kind='<label class="baw-field">来源类型<select class="baw-select" data-baw-field="kind"><option value="散珠" '+(r.kind!=="手串"?"selected":"")+'>散珠</option><option value="手串" '+(r.kind==="手串"?"selected":"")+'>手串</option></select></label>';
  return '<div class="baw-row" data-baw-row="'+i+'"><div class="baw-actions" style="justify-content:space-between"><b>第 '+(i+1)+' 种</b><button type="button" class="baw-btn danger" data-baw="remove" data-index="'+i+'">删除</button></div><div class="baw-grid">'+
   input("珠子品类 *","name","如黄水晶")+input("卡数（碎石/直切整串可不适用）","card","如8、或不适用")+
   input("数量 *","qty","如2","number")+unit+input("形状 / 珠型 *","shape","如圆珠、碎石、直切")+kind+
   select+input("品类权重（可选）","weight","默认"+(P().WEIGHTS[r.group]??1),"number")+
   '<div class="baw-wide">'+input("备注（可选）","notes","可记品相、棉裂、款式")+'</div></div></div>';
 }).join("");
}
function renderChat(){
 const box=el("baw-chat");if(!box)return;
 box.innerHTML=state.messages.length?state.messages.slice(-15).map(m=>'<div class="baw-msg '+(m.role==="user"?"user":"")+'">'+escapeHTML(m.text)+'</div>').join(""):'<div class="baw-msg">先提供照片、整盒总价和各珠信息。我会核对名称、卡数、数量、形状，缺了就继续问；信息齐全前不会生成最终台账。</div>';
 box.scrollTop=box.scrollHeight;
}
function renderOutput(){
 const box=el("baw-output");if(!box||!state.output)return;
 const rows=state.output.split("\n").map(line=>line.split("\t"));
 box.innerHTML='<p class="baw-note">已按“元、分”精确分摊，表格中各成本小计合计等于整套实际支付总价；为处理1分钱尾差，同一种珠子可能拆成两行，但不是重复进货。建议售价是成本倍率试算，并非实时市场价。</p>'+
  '<div class="baw-scroll"><table>'+rows.map((cells,i)=>'<tr>'+cells.map(v=>'<'+(i?'td':'th')+'>'+escapeHTML(v)+'</'+(i?'td':'th')+'>').join("")+'</tr>').join("")+'</table></div>'+
  '<label class="baw-field" style="margin-top:10px">制表符台账（可直接粘贴到Excel/WPS）<textarea id="baw-final" class="baw-text" readonly>'+escapeHTML(state.output)+'</textarea></label>';
}
function check(){
 sync();
 const questions=P().questions(state.rows,state.total);
 if(questions.length){
  state.lastQuestion=questions[0];
  addMessage("还缺 "+questions.length+" 项：\n"+questions.slice(0,4).map((x,i)=>(i+1)+". "+x).join("\n")+(questions.length>4?"\n余下项目将在补齐后继续确认。":""));
  status("信息未齐全，暂时不能分摊。",true);
 }else{
  state.lastQuestion="";
  addMessage("信息齐全：共 "+state.rows.length+" 种、"+state.rows.filter(x=>x.unit!=="串").reduce((n,x)=>n+Number(x.qty),0)+" 颗与 "+state.rows.filter(x=>x.unit==="串").reduce((n,x)=>n+Number(x.qty),0)+" 串。请核对权重并勾选确认。");
  status("可以进行成本分摊。");
 }
 return questions;
}
function mergeLines(input){
 const incoming=P().parseLines(input);
 for(const r of incoming){
  const found=state.rows.find(x=>x.name&&r.name===x.name&&x.unit===r.unit&&(!r.card||!x.card||r.card===x.card)&&(!r.shape||!x.shape||r.shape===x.shape));
  if(found){for(const key of ["card","qty","shape","name","kind","unit"])if(!found[key]&&r[key])found[key]=r[key]}
  else state.rows.push(r);
 }
 return incoming.length;
}
function reply(){
 const t=str(el("baw-reply")?.value);if(!t){status("请先输入补充信息。",true);return}
 addMessage(t,"user");
 const parts=t.split(/[；;]+|(?=第\s*\d+\s*(?:种|个|条|行))/).map(str).filter(Boolean);
 for(const part of parts){
  const x=part.match(/第\s*(\d+)\s*(?:种|个|条|行)/);
  const target=x?state.rows[Number(x[1])-1]:state.rows.length===1?state.rows[0]:null;
  if(!target){mergeLines(part);continue}
  const card=part.match(/(?:卡数|卡)\s*(?:是|为|[:：])?\s*(\d+(?:\.\d+)?)|(\d+(?:\.\d+)?)\s*卡/);
  const qty=part.match(/(\d+)\s*(颗|粒|个|串)/),shape=P().shapeFor(part);
  if(card)target.card=card[1]||card[2];
  if(/没有卡数|无卡数|卡数不适用/.test(part))target.card="不适用";
  if(qty){target.qty=qty[1];target.unit=qty[2]==="串"?"串":"颗";if(target.unit==="串")target.kind="手串";}
  if(shape)target.shape=shape;
  if(/手串/.test(part))target.kind="手串";
  if(!target.name){
   const n=part.replace(/第\s*\d+\s*(?:种|条|行|个)/g,"").replace(/卡数?|数量|形状|是|为|\d+(?:\.\d+)?|颗|粒|串|，|,|。|:|：/g,"").trim();
   if(n&&!P().SHAPES.includes(n))target.name=n.slice(0,80);
  }
 }
 el("baw-reply").value="";
 clearOutput();renderRows();check();
}
function clearOutput(){state.output="";state.plan=null;state.confirmed=false;const box=el("baw-confirm");if(box)box.checked=false;if(el("baw-output"))el("baw-output").innerHTML="";persist()}
function allocate(){
 sync();
 if(P().questions(state.rows,state.total).length){check();return}
 if(!state.confirmed){status("请先核对明细，并勾选台账生成按钮上方的确认框。",true);return}
 try{
  const plan=P().allocate(state.total,state.rows,state.markup,state.strandFactor);
  state.plan=plan;state.output=P().toTSV(plan);persist();renderOutput();
  addMessage("分摊完成："+plan.groups+"种、"+plan.pieces+"颗、"+plan.strands+"串。总成本 ¥"+(plan.cents/100).toFixed(2)+"，与整套实付一致。单颗、单串建议售价按成本的 "+state.markup+" 倍试算。");
  status("已生成可复制台账；没有写入正式库存。");
 }catch(e){status(e.message,true)}
}
async function compress(file){
 if(!file?.type.startsWith("image/"))throw Error("请选择图片");
 if(file.size>14*1024*1024)throw Error("单张原图最多14MB");
 let bmp;
 if("createImageBitmap" in window)bmp=await createImageBitmap(file);
 else bmp=await new Promise((ok,fail)=>{const uri=URL.createObjectURL(file),im=new Image();im.onload=()=>{URL.revokeObjectURL(uri);ok(im)};im.onerror=()=>{URL.revokeObjectURL(uri);fail(Error("图片无法读取"))};im.src=uri});
 try{
  const w=bmp.width||bmp.naturalWidth,h=bmp.height||bmp.naturalHeight,f=Math.min(1,720/Math.max(w,h));
  const canvas=document.createElement("canvas");canvas.width=Math.max(1,Math.round(w*f));canvas.height=Math.max(1,Math.round(h*f));
  const ctx=canvas.getContext("2d");if(!ctx)throw Error("浏览器无法压缩图片");
  ctx.fillStyle="white";ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bmp,0,0,canvas.width,canvas.height);
  let out=canvas.toDataURL("image/jpeg",.67);
  if(out.length>420000){
   const c=document.createElement("canvas");const g=Math.min(1,520/Math.max(w,h));c.width=Math.max(1,Math.round(w*g));c.height=Math.max(1,Math.round(h*g));
   c.getContext("2d").drawImage(bmp,0,0,c.width,c.height);
   out=c.toDataURL("image/jpeg",.56);
  }
  if(out.length>520000)throw Error("压缩后图片仍过大，请换一张尺寸更小的");
  return out;
 }finally{bmp.close?.()}
}
async function photos(files){
 for(const file of [...files].slice(0,4-state.images.length))state.images.push(await compress(file));
 render();status("已添加 "+state.images.length+" 张本地参考照片；不自动上传，刷新后需要重新选择。");
}
function applyAI(data){
 if(!Array.isArray(data.items))throw Error("模型返回的商品列表无效");
 let added=0,updated=0;
 for(const suggestion of data.items.slice(0,60)){
  if(!suggestion||typeof suggestion!=="object")continue;
  const item=P().cleanRow(suggestion);
  if(!item.name&&!item.card&&!item.qty&&!item.shape)continue;
  const old=Number.isInteger(suggestion.index)?state.rows[suggestion.index]:state.rows.find(r=>r.name&&r.name===item.name);
  if(old){
   for(const key of ["name","card","qty","shape","notes"])if(!old[key]&&item[key])old[key]=item[key];
   if(old.group==="待确认品类"&&item.group!=="待确认品类")old.group=item.group;
   updated++;
  }else{state.rows.push(item);added++}
 }
 clearOutput();renderRows();
 const w=Array.isArray(data.warnings)?data.warnings.map(str).filter(Boolean).slice(0,5):[];
 if(w.length)addMessage("AI提醒：\n"+w.map(x=>"· "+x).join("\n"));
 if(data.question)addMessage(str(data.question));
 else if(Array.isArray(data.questions)&&data.questions.length)addMessage(data.questions.map(x=>"· "+str(x)).join("\n"));
 addMessage("AI给出 "+updated+" 条原行补充、新增 "+added+" 条待确认候选。已填写的字段没有被AI覆盖，仍请核对照片中的外观。");
 check();
}
async function callAI(){
 sync();
 let url;
 try{url=new URL(state.endpoint);if(url.protocol!=="https:"||url.username||url.password)throw Error()}catch{return status("先填写有效 HTTPS AI 接口地址。",true)}
 if(!state.token)return status("请先在 AI 接口设置里填写个人访问口令。口令不会存入账本。",true);
 if(!state.description&&!state.rows.length&&!state.images.length)return status("至少提供一张照片或一段珠子描述。",true);
 if(state.busy)return;state.busy=true;
 const button=overlay.querySelector('[data-baw="ai"]');button.disabled=true;
 status("正在请求模型核对，照片可能产生额外模型调用成本…");
 const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),28000);
 try{
  const res=await fetch(url.href,{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+state.token},
   body:JSON.stringify({mode:"blind_review",text:state.description.slice(0,4500),totalPrice:state.total,rows:state.rows,
    images:state.images.slice(0,4),question:state.lastQuestion,followup:state.messages.filter(m=>m.role==="user").slice(-6).map(m=>m.text)}),signal:abort.signal});
  const payload=await res.json().catch(()=>({error:"AI接口没有返回JSON"}));
  if(!res.ok)throw Error(payload.error||"AI请求HTTP "+res.status);
  if(payload.mode!=="blind_review")throw Error("云函数尚未启用盲盒图片核对接口，需要同步更新 CloudBase 的 index.js");
  applyAI(payload);status("AI 核对完毕，请人工确认照片与每行信息。");
 }catch(e){status((e.name==="AbortError"?"AI核对超时":e.message||String(e))+"。可继续本地补齐及分摊。",true)}
 finally{clearTimeout(timer);state.busy=false;button.disabled=false}
}
function handleButton(e){
 const button=e.target.closest("[data-baw]");if(!button)return;
 e.preventDefault();const action=button.dataset.baw;
 if(action==="close"){close();return}
 if(action==="parse"){
  sync();const count=mergeLines(state.description);clearOutput();renderRows();
  if(count)addMessage("已根据文字整理出 "+count+" 条候选明细；照片不能直接证明材质和卡数，仍需核对。");
  check();return;
 }
 if(action==="add"){sync();state.rows.push(P().cleanRow());clearOutput();renderRows();return}
 if(action==="remove"){const i=Number(button.dataset.index);if(i>=0&&i<state.rows.length){state.rows.splice(i,1);clearOutput();renderRows();check()};return}
 if(action==="remove-image"){const i=Number(button.dataset.index);if(i>=0&&i<state.images.length){state.images.splice(i,1);render()};return}
 if(action==="reply"){reply();return}
 if(action==="ask"){check();return}
 if(action==="allocate"){allocate();return}
 if(action==="ai"){callAI();return}
 if(action==="copy"){
  if(!state.output)return status("先补齐信息，点击“生成成本台账”。",true);
  if(navigator.clipboard?.writeText)navigator.clipboard.writeText(state.output).then(()=>status("台账已复制，可粘贴至WPS/Excel。")).catch(copyFallback);
  else copyFallback();return;
 }
 if(action==="clear"){
  if(!confirm("清空本次盲盒整理？不会影响已入库盲盒、原库存或其他账目。"))return;
  state=fresh();try{localStorage.removeItem(KEY)}catch{}render();
 }
}
function copyFallback(){
 const x=el("baw-final");if(!x)return status("请先生成表格",true);
 x.focus();x.select();let ok=false;try{ok=document.execCommand("copy")}catch{}
 status(ok?"已复制台账。":"当前浏览器未允许复制，请手动长按全选。",!ok);
}
function onInput(e){
 const target=e.target;
 if(target.matches("#baw-total,#baw-markup,#baw-strand-factor,#baw-description,#baw-endpoint,#baw-token")){sync();if(!target.matches("#baw-endpoint,#baw-token"))clearOutput();return}
 if(target.matches("[data-baw-field]")){
  const node=target.closest("[data-baw-row]"),i=Number(node?.dataset.bawRow);
  if(!state.rows[i])return;
  state.rows[i][target.dataset.bawField]=target.value;
  if(target.dataset.bawField==="name"&&state.rows[i].group==="待确认品类")state.rows[i].group=P().groupFor(target.value);
  clearOutput();
 }
}
function onChange(e){
 if(e.target.id==="baw-pictures"){photos(e.target.files).catch(err=>status(err.message||String(err),true));return}
 if(e.target.id==="baw-confirm"){state.confirmed=!!e.target.checked;persist();return}
 if(e.target.matches("[data-baw-field]")){
  const node=e.target.closest("[data-baw-row]"),i=Number(node?.dataset.bawRow);
  if(state.rows[i]){state.rows[i][e.target.dataset.bawField]=e.target.value;clearOutput()}
 }
}
function open(){
 createHost();lastFocus=document.activeElement;
 if(!state.rows.length&&!state.description)load();
 document.getElementById("local-shade")?.classList.remove("open");
 overlay.hidden=false;render();
 overlay.querySelector('[data-baw="close"]')?.focus();
}
function close(){sync();overlay.hidden=true;lastFocus?.focus?.({preventScroll:true})}
document.addEventListener("click",e=>{
 if(e.target.closest('[data-action="open-blind-ai"],[data-local="blind-ai-wizard"]')){e.preventDefault();open()}
});
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&overlay&&!overlay.hidden){e.stopPropagation();close()}});
window.BlindBoxAI={open,clearDraft:()=>{try{localStorage.removeItem(KEY)}catch{}state=fresh()}};
})();