/* Jewelry ledger free local assistant: no AI API, remote request, or key. */
(function(){
"use strict";
const E=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const T=s=>String(s??"").trim(), N=s=>Number(s), $=s=>document.getElementById(s);
let photoFile=null, resultRows=[],meta={}, busy=false;
const style=document.createElement("style");
style.textContent="#local-assist{position:fixed;right:12px;bottom:87px;z-index:30;border:0;border-radius:28px;padding:12px 15px;background:#315e51;color:white;box-shadow:0 6px 22px #142d2730;font-weight:650}#local-shade{position:fixed;inset:0;display:none;z-index:95;background:#13221ca8;align-items:center;justify-content:center;padding:10px}#local-shade.open{display:flex}#local-sheet{background:#fdfdfb;border-radius:17px;width:min(740px,100%);max-height:95dvh;overflow:auto;padding:17px;color:#28362c}#local-sheet textarea{resize:vertical;min-height:115px}#local-sheet label{font-weight:600;font-size:12px;display:block;margin:11px 0 5px}.local-field{border-radius:9px;border:1px solid #d8ded8;background:white;padding:10px;width:100%;color:#27352d;font:inherit}.local-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:9px 0}.local-btn{border:1px solid #d7ded8;background:white;border-radius:9px;padding:9px 11px;color:#315e51;cursor:pointer}.local-btn.main{background:#315e51;border-color:#315e51;color:#fff}.local-btn:disabled{opacity:.55}.local-help{font-size:12px;color:#69776d;line-height:1.6;margin:6px 0}.local-result{font-size:12px;color:#315e51;white-space:pre-wrap;line-height:1.6;margin:10px 0}#local-tsv{font:12px/1.55 monospace;min-height:155px}#local-market{display:none}#local-history>div{border:1px solid #e0e6df;background:white;border-radius:10px;margin-top:7px;padding:10px;font-size:12px;line-height:1.65}#local-status{margin:7px 0;white-space:pre-wrap}#local-sheet .local-narrow{flex:1;min-width:130px}@media(max-width:600px){#local-shade{align-items:flex-end;padding:0}#local-sheet{max-height:95dvh;border-radius:18px 18px 0 0;padding:14px}#local-assist{bottom:85px}}";
document.head.append(style);
const button=document.createElement("button");button.id="local-assist";button.type="button";button.textContent="✦ 智能进货";document.body.append(button);
const shade=document.createElement("div");shade.id="local-shade";
shade.innerHTML=[
'<section id="local-sheet" role="dialog" aria-modal="true" aria-label="免费本地进货整理">',
'<div class="local-row" style="justify-content:space-between"><strong style="font-size:18px">✦ 本地智能进货助手</strong><button type="button" class="local-btn" data-local="close">关闭</button></div>',
'<div class="local-help">永久免费，不需要 API Key、不调用 AI 接口，普通记账仍可断网用。通过本地词库和规则理解常见的珠子名称、数量、卡数和品相；不会凭空补全缺少的珠子或报价。</div>',
'<div class="local-row"><button type="button" class="local-btn main" data-local="tab-daily">日常进货</button><button type="button" class="local-btn" data-local="tab-text">盲盒整理</button><button type="button" class="local-btn" data-local="tab-market">行情记录</button></div><div id="local-daily"><div class="local-help">素串、半成品、散珠、配件、耗材和外购成品都可以记。直接用平时说话的方式输入，识别后核对库存单位和进价，再确认保存。买来的成品会标记为外购，绝不算手作。</div><label>说说这次买了什么</label><textarea class="local-field" id="daily-description" placeholder="例如：小红书进了一串珍珠半成品，4-5mm，38cm，约80颗，进价29块"></textarea><div class="local-row"><button type="button" class="local-btn main" data-daily="preview">识别这笔进货</button><button type="button" class="local-btn" data-daily="clear">清空</button></div><div id="daily-preview" style="display:none"></div></div>',
'<div id="local-text" style="display:none">',
'<label>描述盲盒 / 粘贴表格</label>',
'<textarea id="local-desc" class="local-field" placeholder="今天小红书盲盒实付28元，共12颗，挑出8颗优选。黄水晶卡17无棉无裂1颗，黑发晶卡10微棉2颗，剩下4颗是福利珠……"></textarea>',
'<div class="local-row"><button class="local-btn" data-local="parse">整理成表格</button><button class="local-btn" data-local="copy">复制表格</button><button class="local-btn" data-local="import">填入盲盒</button></div>',
'<label>或者上传表格截图（免费本机 OCR）</label><input id="local-photo" class="local-field" type="file" accept="image/*">',
'<div class="local-row"><button class="local-btn" data-local="ocr">识别图片文字</button><span class="local-help">首次需联网下载开源 OCR 文件；以后能否离线识别取决于缓存。国内网络可能无法访问组件 CDN；复杂表格要人工校对。</span></div>',
'<label>识别 / 整理结果（可编辑，再确认入库）</label>',
'<textarea id="local-tsv" class="local-field" spellcheck="false" placeholder="标准格式的制表符表格将在这里显示"></textarea>',
'<div id="local-parsed" class="local-result"></div>',
'<div class="local-help">只明确写出的品类和颗数会自动生成，没说清楚的数量会提示补充。卡数保留规格，不当克重；历史成本不随行情变化。</div>',
'</div>',
'<div id="local-market">',
'<div class="local-help">行情来源是你自己记录的实际采购报价或可核对的商家报价，绝不冒充“自动联网最新价”。多条样本形成你自己的参考行情，过期和异常价格会提示。</div>',
'<div class="local-row"><div class="local-narrow"><label>品类</label><input id="local-kind" class="local-field" list="local-categories" placeholder="例：黄水晶"></div><div class="local-narrow"><label>品相</label><select id="local-grade" class="local-field"><option value="优选">优选</option><option value="精品">精品</option><option value="普通">普通</option><option value="瑕疵">瑕疵</option></select></div></div>',
'<datalist id="local-categories"></datalist>',
'<div class="local-row"><div class="local-narrow"><label>参考克价最低（元/g）</label><input id="local-low" class="local-field" type="number" min="0.01" step="any" placeholder="3.5"></div><div class="local-narrow"><label>参考克价最高（元/g）</label><input id="local-high" class="local-field" type="number" min="0.01" step="any" placeholder="5"></div></div>',
'<div class="local-row"><div class="local-narrow"><label>来源/平台（必填）</label><input id="local-source" class="local-field" list="local-sources" placeholder="例：1688 某家店"></div><div class="local-narrow"><label>报价日期</label><input id="local-date" type="date" class="local-field"></div></div>',
'<datalist id="local-sources"><option value="小红书"></option><option value="淘宝"></option><option value="拼多多"></option><option value="1688"></option><option value="线下批发"></option><option value="采购实付"></option></datalist>',
'<label>报价链接或可核对的原始依据（可留空）</label><input id="local-url" class="local-field" placeholder="https://... / 订单编号或截图描述">',
'<div class="local-row"><button class="local-btn main" data-local="add-price">保存这条报价并更新参考区间</button><button class="local-btn" data-local="pick-market">从已有珠子选择品类</button></div>',
'<div class="local-row"><div class="local-narrow"><label>查看品类</label><input id="local-filter" class="local-field" list="local-categories" placeholder="全部"></div><button class="local-btn" data-local="refresh">刷新记录</button></div>',
'<div id="local-history"></div>',
'</div>',
'<div id="local-status" class="local-result" aria-live="polite" role="status"></div>',
'</section>'
].join("");
document.body.append(shade);
const say=(s,isError=false)=>{const el=$("local-status");el.textContent=s;el.style.color=isError?"#b64c49":"#315e51"};
function refreshLists(){
 const all=new Set([...(typeof BEAD_GROUPS!=="undefined"?Object.values(BEAD_GROUPS).flat():[]),...state.materials.filter(m=>m.kind==="bead").map(m=>m.subtype),...state.markets.map(m=>m.category),...(state.marketSamples||[]).map(m=>m.category)]);
 $("local-categories").innerHTML=[...all].filter(Boolean).sort((a,b)=>String(a).localeCompare(String(b),"zh")).map(x=>'<option value="'+E(x)+'"></option>').join("");
}
button.onclick=()=>{refreshLists();$("local-date").value=today();shade.classList.add("open");tab("daily");renderQuotes();};
function tab(name){$("local-daily").style.display=name==="daily"?"":"none";$("local-text").style.display=name==="text"?"":"none";$("local-market").style.display=name==="market"?"":"none";for(const [action,key] of [["tab-daily","daily"],["tab-text","text"],["tab-market","market"]]){const btn=shade.querySelector("[data-local="+action+"]");if(btn){btn.classList.toggle("main",name===key);}}say("");}
const terms=()=>[...new Set([...Object.values(BEAD_GROUPS).flat(),...state.materials.filter(x=>x.kind==="bead").map(x=>x.subtype),...state.markets.map(x=>x.category),"黑发晶","红胶花","黄水晶","钻切黄水","黄水","白月光","紫方糖","紫萤石","特色蓝底黑点珠","蓝底黑点珠","金丝檀","黑玛瑙","天河石"])].filter(Boolean).sort((a,b)=>b.length-a.length);
// Parse flexible spoken purchase prices, not bead sizes, lengths, or counts.
function parseSpokenPrice(input){
 const text=String(input||"").replace(/[，,。；;\n]/g," ").replace(/￥/g,"¥");
 const num="(\\d+(?:\\.\\d{1,3})?)",unit="(?:块钱|人民币|RMB|元|块|圆)";
 const choices=[];
 const add=(regex,rank)=>{for(const m of text.matchAll(regex)){
  const price=Number(m[1]);if(!Number.isFinite(price)||price<0||price>10000000)continue;
  const after=text.slice(m.index+m[0].length,m.index+m[0].length+10);
  if(/^\s*(?:颗|个|串|cm|毫米|mm|厘|克|g\b|米|件)/i.test(after))continue;
  choices.push({price,rank,index:m.index});
 }};
 const label="(?:进货总价|采购总价|购入总价|买入总价|进货价格|进货价|进价|购入价|采购价|购买价|买入价|拿货价|成本价|到手价|入手价|实付(?:金额|总价)?|实际付款|付款金额|支付金额|一共花(?:了)?|总共花(?:了)?|花费金额|一共付(?:了)?|付了|花了|花费|总价|合计金额|多少钱|价格|价钱)";
 const join="(?:\\s*(?:是|为|共|大约|约|差不多|只要|才|要|一共|合计|:|：|=|¥|人民币|RMB))*\\s*";
 add(new RegExp(label+join+"(?:¥\\s*)?"+num+"\\s*(?:"+unit+")?","gi"),100);
 add(new RegExp("(?:花(?:掉)?|付(?:款)?|买入|购入|入手|拿货|购得|买的|买了)"+join+"(?:¥\\s*)?"+num+"\\s*(?:"+unit+")?","gi"),72);
 add(new RegExp(num+"\\s*(?:"+unit+")?\\s*(?:买入|购入|入手|到手|买的|买了|拿下|包邮|成交|购买)","gi"),80);
 add(new RegExp("¥\\s*"+num,"gi"),65);
 add(new RegExp(num+"\\s*"+unit,"gi"),60);
 const standalone=text.match(/(?:^|\s)(\d+(?:\.\d+)?)\s*$/);
 if(standalone)choices.push({price:Number(standalone[1]),rank:25,index:text.length-standalone[1].length});
 choices.sort((a,b)=>b.rank-a.rank||a.index-b.index);
 return choices.length?choices[0].price:null;
}
function extractNumbers(raw){
 let total=null,premium=null,welfare=null,cost=null;
 const pick=(re)=>{const m=raw.match(re);return m?Number(m[1]):null;};
 cost=parseSpokenPrice(raw);
 total=pick(/(?:总共|一共|共计|共|总数|合计)\s*(\d+)\s*颗/);
 premium=pick(/(?:挑(?:出|了)?|选(?:出|了)?|优选(?:珠)?(?:共|有)?|留下)\s*(\d+)\s*颗(?:优选珠|优选)?/);
 welfare=pick(/(?:剩下|其余|剩余|另外|福利珠(?:有|共)?)[^\d]{0,8}(\d+)\s*颗(?:福利珠)?/);
 const welfare2=pick(/(\d+)\s*颗(?:为|是|做)?福利珠/);
 if(welfare===null&&welfare2!==null)welfare=welfare2;
 return {total,premium,welfare,cost};
}
function cleanChunk(raw){
 return T(raw.replace(/^(?:(?:今天|这次|刚刚|我)?(?:从)?(?:小红书|淘宝|1688|拼多多)?(?:直播间)?(?:盲盒)?(?:买了|买的|购买了|我买了|我挑了|挑了|优选|里面有|有|一共|共计|共)?(?:的)?\s*)+/,""));
}
function findBeads(fragment){
 const termsList=terms();const hits=[];
 const lower=fragment.toLowerCase();
 for(const x of termsList){let pos=lower.indexOf(x.toLowerCase());if(pos<0)continue;
 if(hits.some(h=>pos>=h.start&&pos<h.end || (pos<x.length+h.start&&pos+h.term.length>h.start)))continue;
 hits.push({term:x,start:pos,end:pos+x.length});
 }
 return hits.sort((a,b)=>a.start-b.start);
}
function gradeOf(text){if(/明显瑕疵|大裂|贯穿裂|破损|掉角|磕碰|崩口/.test(text))return "瑕疵";if(/微裂|微棉|孔边微黑|单面光/.test(text))return "普通";if(/体透|无棉|无裂|光泽(?:良好|好)|通透|品相好/.test(text))return "优选";return "普通";}
function analyze(raw){
 const input=T(raw);if(!input)throw Error("先输入盲盒描述或粘贴表格");
 const summary=extractNumbers(input),rows=[],warnings=[],parts=input.replace(/\r/g,"").replace(/[。；;、，,]/g,"\n").split(/\n/).map(T).filter(Boolean);
 // Allow a pasted Excel TSV table to use the proven built-in parser first.
 if(input.includes("\t")&&/品类|珠子名称|名称/.test(parts[0]||"")){
  try{const p=parseBlindTable(input);const out=[...p.premium.map(r=>({...r,qty:1,status:"优选"})),...p.welfare.map(r=>({...r,qty:r.qty,status:"福利"}))];return {rows:out,summary:{total:p.count,premium:p.premium.length,welfare:p.welfare.reduce((s,x)=>s+x.qty,0),cost:null},warnings:[],mode:"table"};}catch(e){warnings.push("表格未能自动完全匹配："+e.message+"；改用文字解析")}
 }
 for(const part of parts){
  if(/^编号[\s\t]/.test(part))continue;
  const hits=findBeads(part);
  if(hits.length===0)continue;
  for(let i=0;i<hits.length;i++){
   const h=hits[i],end=i+1<hits.length?hits[i+1].start:part.length,span=part.slice(h.start,end),context=part.slice(Math.max(0,h.start-6),end);
   const spec=(span.match(/卡\s*\d+(?:\.\d+)?/i)||span.match(/\d+(?:\.\d+)?\s*(?:mm|毫米|厘)/i)||[])[0]||"";
   const weights=(span.match(/(?:克重|重量|单颗)\s*[：:]?\s*(\d+(?:\.\d+)?)\s*(?:g|克)/i)||[])[1]||"";
   const qtyHit=span.match(/(?:数量\s*[：:]?\s*|x\s*)(\d+)\s*颗?/i)||span.match(/(\d+)\s*颗(?:优选)?/);
   const qty=qtyHit?Number(qtyHit[1]):1;
   const flaw=(span.match(/(?:孔边微黑|无棉无裂|无棉|无裂|微棉|微裂|体透|光泽(?:良好|好)|单面光|带闪片|有棉|有裂|瑕疵|崩口|带棉|透亮)(?:[^\d,，。；;]{0,7})?/g)||[]).join("、");
   const status=/福利珠|福利/.test(context)?"福利":"优选";
   const price=(span.match(/\d+(?:\.\d+)?\s*(?:~|～|至|-|–)\s*\d+(?:\.\d+)?\s*元\s*\/\s*g/i)||[])[0]||"";
   if(!Number.isInteger(qty)||qty<1||qty>300){warnings.push(h.term+"数量不合理，请手动核对");continue}
   rows.push({name:h.term,subtype:h.term,spec:spec.replace(/\s+/g,""),weight:weights,grade:gradeOf(span),flaw:flaw||T(span.replace(h.term,"").replace(spec,"").replace(/\d+颗/g,"")).slice(0,70),qty,status,wholesaleRange:price,stallRange:"",onlineRange:""});
  }
 }
 if(summary.welfare!==null&&!rows.some(x=>x.status==="福利")){
  rows.push({name:"未分类福利珠",subtype:"未分类福利珠",spec:"",weight:"",grade:"普通",flaw:"尚未细分品类",qty:summary.welfare,status:"福利",wholesaleRange:"",stallRange:"",onlineRange:""});
 }
 const qtyAll=rows.reduce((a,x)=>a+x.qty,0),pQty=rows.filter(x=>x.status==="优选").reduce((a,x)=>a+x.qty,0),wQty=rows.filter(x=>x.status==="福利").reduce((a,x)=>a+x.qty,0);
 if(summary.total!==null&&summary.total!==qtyAll)warnings.push("整盒说的是"+summary.total+"颗，但可识别明细只有"+qtyAll+"颗，请补齐剩余的品类/数量，切勿直接入库");
 if(summary.premium!==null&&summary.premium!==pQty)warnings.push("你说优选"+summary.premium+"颗，现识别"+pQty+"颗，请先补齐");
 if(summary.welfare!==null&&summary.welfare!==wQty)warnings.push("你说福利"+summary.welfare+"颗，现识别"+wQty+"颗");
 if(!rows.length)warnings.push("没有匹配到具体品类，请试着按“黄水晶卡17无棉无裂1颗”的格式描述，或粘贴表格");
 if(input.length>10000)warnings.push("描述较长，请核对是否漏行");
 return {rows,summary,warnings,mode:"description"};
}
const columns=["名称","品类","卡数","克数","品相","瑕疵","数量","优选/福利","该品类市面批发克价参考","摆摊建议售价","线上市面零售价参考"];
function toTable(rows){const safe=x=>String(x??"").replace(/[\t\r\n]+/g," ").trim();return [columns.join("\t"),...rows.map(r=>[r.name,r.subtype,r.spec,r.weight,r.grade,r.flaw,r.qty,r.status,r.wholesaleRange,r.stallRange,r.onlineRange].map(safe).join("\t"))].join("\n")}
function statusOf(result){
 const count=result.rows.reduce((a,x)=>a+x.qty,0),p=result.rows.filter(x=>x.status==="优选").reduce((a,x)=>a+x.qty,0),w=count-p;
 return "识别"+result.rows.length+"行，共"+count+"颗（优选"+p+"，福利"+w+"）。"+(result.summary.cost===null?"整盒实付价待填写。":"整盒实付价参考 ¥"+result.summary.cost+"（保存前核对）。")+(result.warnings.length?"\n需要核对：\n• "+result.warnings.join("\n• "):"\n已识别的字段仍需人工核对，特别是克数、规格和瑕疵。");
}
function parse(){meta=analyze($("local-desc").value);resultRows=meta.rows;$("local-tsv").value=toTable(meta.rows);$("local-parsed").textContent=statusOf(meta);say("文字/表格整理完成。不会自动记账。")}
async function copy(){const t=T($("local-tsv").value);if(!t)throw Error("还没有表格");try{await navigator.clipboard.writeText(t);say("已复制，可粘贴到 Excel 或 WPS。")}catch(e){$("local-tsv").focus();$("local-tsv").select();say("复制权限不可用，已选中文本，请长按复制。")}}
function validateBeforeImport(){
 const t=T($("local-tsv").value);if(!t)throw Error("请先整理盲盒，或直接贴入标准表格");
 const p=parseBlindTable(t),count=p.count,premium=p.premium.length,welfare=p.welfare.reduce((a,x)=>a+x.qty,0);
 const hints=meta?.summary||{};let problems=[];
 if(hints.total!==null&&hints.total!==undefined&&hints.total!==count)problems.push("整盒总数"+hints.total+"，但表格是"+count+"颗");
 if(hints.premium!==null&&hints.premium!==undefined&&hints.premium!==premium)problems.push("优选珠应为"+hints.premium+"颗，目前表格是"+premium+"颗");
 if(hints.welfare!==null&&hints.welfare!==undefined&&hints.welfare!==welfare)problems.push("福利珠应为"+hints.welfare+"颗，目前表格是"+welfare+"颗");
 if(problems.length)throw Error(problems.join("；")+"。先补全表格，再导入，避免自动误判库存。");
 return p;
}
function importToLedger(){
 const p=validateBeforeImport();blindForm();const el=$("editor");
 el.querySelector('[name="blindTable"]').value=$("local-tsv").value;
 if(meta.mode==="description"&&meta.summary.cost!==null&&meta.summary.cost!==undefined)el.querySelector('[name="total"]').value=meta.summary.cost;
 if(meta.summary.total!==null&&meta.summary.total!==undefined)el.querySelector('[name="totalQty"]').value=meta.summary.total;
 else el.querySelector('[name="totalQty"]').value=p.count;
 blindPaste();
 shade.classList.remove("open");
 say("已填入盲盒表单。确认整盒总价、总数与优选/福利后再入库。");
}

function parseQuick(raw){
 const text=T(raw).replace(/[，。；;\n]/g," ");
 const total=parseSpokenPrice(text);
 const dimension=text.match(/(?:卡\s*)?(\d+(?:\.\d+)?)\s*(?:[-~～到至—–])\s*(\d+(?:\.\d+)?)\s*(?:mm|毫米|厘|珍珠)/i);
 const size=dimension?dimension[1]+"–"+dimension[2]+"mm":(text.match(/卡\s*\d+(?:\.\d+)?/i)||text.match(/\d+(?:\.\d+)?\s*(?:mm|毫米)/i)||[])[0]||"";
 const length=text.match(/(\d+(?:\.\d+)?)\s*(?:cm|厘米|公分)(?:\s*(?:长|长度))?/i);
 const pieces=text.match(/(?:大概|约|差不多|估计|大约|近|左右)?\s*(\d+)\s*颗/);
 const count=pieces?Number(pieces[1]):null;
 const approx=!!pieces&&(/大概|大约|约|差不多|估计|左右|近/.test(text.slice(Math.max(0,pieces.index-7),pieces.index+pieces[0].length+3)));
 const strand=(text.match(/(\d+)\s*串/)||[])[1];const strandCount=strand?Number(strand):(/一串|1串/.test(text)?1:null);
 const category=(text.match(/(?:淡水珍珠|海水珍珠|贝珠|仿珍珠|珍珠|米珠)/)||[])[0];
 if(!category)throw Error("口语快速入库目前支持含“珍珠、贝珠”等品类的半成品珠串。其他物料可用“新增物料”或批量表格。");
 if(!text.includes("半成品")&&!strandCount)throw Error("请写明是半成品珠串或者“一串”，避免误把成品饰品记为散珠。");
 if(total===null||!Number.isFinite(total)||total<0)throw Error("没有明确识别到实际购入价。可说“进价29块”“花了29元”或“29买的”等。");
 if(count!==null&&(!Number.isInteger(count)||count<1||count>10000))throw Error("颗数不在合理范围，请核对");
 const descriptor=length?length[1]+"cm":null;
 return {category,total,count,approx,size,length:descriptor,strandCount:strandCount||1,raw:T(raw),source:(text.match(/小红书|淘宝|拼多多|1688|抖音|微信/)||[])[0]||""};
}
function quickPreview(){
 const p=parseQuick($("local-desc").value);meta.quick=p;
 let box=$("quick-box");if(!box){box=document.createElement("section");box.id="quick-box";box.className="local-help";box.style.cssText="padding:12px;border:1px solid #dce5dc;background:#fff;border-radius:11px;margin:10px 0";$("local-desc").after(box);}
 box.innerHTML='<strong>快速入库确认</strong><div style="margin:10px 0">品类：'+E(p.category)+' · '+E(p.size||"规格未填")+' · '+E(p.length||"串长未填")+'<br>购入：'+p.strandCount+'串，实付 ¥'+p.total.toFixed(2)+'；'+(p.count?'约 '+p.count+' 颗':'未提供颗数')+'</div>'+
 '<label>库存记账单位</label><select id="quick-unit" class="local-field"><option value="beads" '+(p.count?'selected':'')+'>按颗（估算颗数）</option><option value="strands" '+(!p.count?'selected':'')+'>按串（一串记为1个库存单位）</option></select>'+
 '<label>实际录入数量（可核对修改）</label><input id="quick-qty" class="local-field" type="number" min="1" step="1" value="'+(p.count||p.strandCount)+'">'+
 '<label>本批实付总价（元）</label><input id="quick-total" class="local-field" type="number" min="0" step="any" value="'+p.total+'">'+
 '<label>采购平台</label><input id="quick-source" class="local-field" list="local-sources" value="'+E(p.source)+'">'+
 '<div id="quick-cost" class="local-result"></div><button class="local-btn main" data-local="quick-save">确认并保存到物料库存</button>';
 const select=$("quick-unit"),qty=$("quick-qty"),price=$("quick-total");
 const update=()=>{const val=select.value==="beads"?(p.count||1):p.strandCount;qty.value=val;refreshQuickCost()};
 select.onchange=update;qty.oninput=refreshQuickCost;price.oninput=refreshQuickCost;refreshQuickCost();
 say("已识别半成品珠串。请核对数量、单位和实付价，再点击“确认并保存”。");
}
function refreshQuickCost(){
 const q=Number($("quick-qty")?.value),total=Number($("quick-total")?.value),unit=$("quick-unit")?.value==="beads"?"颗":"串";
 if(!$("quick-cost"))return;
 $("quick-cost").textContent=q>0&&Number.isFinite(total)&&total>=0?"预计单位成本 ¥"+(total/q).toFixed(4)+"/"+unit+"（数量估算时成本也是估算值）":"请填有效数量和实际总价";
}
async function saveQuick(){
 const p=meta.quick;if(!p)throw Error("请先点击口语快速入库");
 const qty=Number($("quick-qty")?.value),total=Number($("quick-total")?.value),mode=$("quick-unit")?.value;
 if(!Number.isInteger(qty)||qty<=0||qty>10000)throw Error("库存数量必须为1至10000的正整数");
 if(!Number.isFinite(total)||total<0||!Number.isFinite(total))throw Error("请填写正确实付总价");
 if(mode!=="beads"&&mode!=="strands")throw Error("请选库存单位");
 const unit=mode==="beads"?"颗":"串";
 const notes=[p.strandCount+"串半成品珠串",p.length?"串长 "+p.length:"",p.size?"珠径 "+p.size:"",p.count?"口述约 "+p.count+"颗":"",p.approx?"颗数估算，未逐颗清点":"",p.raw].filter(Boolean).join("；");
 const data={id:uid(),kind:"bead",name:p.category+"半成品珠串",beadGroup:"珍珠/贝珠",subtype:p.category,spec:[p.size,p.length].filter(Boolean).join(" · "),weight:0,grade:"普通",flaw:"",qty,initialQty:qty,unit,unitCost:round(total/qty,8),totalPurchaseCost:total,qtyApprox:mode==="beads"&&p.approx,approxBeadCount:p.count||null,strandLengthCm:p.length?Number(p.length.replace("cm","")):null,strandCount:p.strandCount,purchaseDate:today(),source:T($("quick-source").value),notes,image:"",createdAt:new Date().toISOString(),isWelfare:false};
 if(!confirm("确定以 "+qty+unit+" 入库「"+data.name+"」？本批实付 ¥"+total.toFixed(2)+"，单位成本约 ¥"+(total/qty).toFixed(4)+"。"+(data.qtyApprox?"\n⚠ 颗数为估算，建议清点后盘点调整。":"")))return;
 await commit(()=>{state.materials.push(data);usageAdd([data])},"已快速入库："+qty+unit+" "+data.name);
 shade.classList.remove("open");
}

async function ocrImage(){
 if(!photoFile)throw Error("请先上传清晰的截图");
 say("正在准备免费 OCR：首次使用需联网加载开源识别程序和中文模型，费用为0元；以后能否离线识别取决于浏览器缓存。图片在手机本机处理，不会上传给识别服务。");
 if(!window.Tesseract){
  if(!navigator.onLine)throw Error("首次使用截图识别需要联网下载 OCR 组件。文字及表格导入无需联网。");
  const script=document.createElement("script");
  script.src="https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";
  await new Promise((ok,fail)=>{script.onload=ok;script.onerror=()=>fail(Error("当前网络无法加载开源 OCR；国内网络访问此 CDN 可能不稳定。仍可复制表格文字直接导入。"));document.head.append(script);});
 }
 const worker=await window.Tesseract.createWorker("chi_sim+eng",1,{
   logger:m=>{if(m.progress!==undefined)say("本地 OCR："+Math.round(m.progress*100)+"% · "+m.status);}
 });
 try{
  const output=await worker.recognize(photoFile),text=T(output.data.text);
  if(!text)throw Error("没识别出文字，请换正面清晰的截图");
  $("local-desc").value=text;
  $("local-parsed").textContent="已识别截图内容。请逐列核对文字、卡数和单价，再点整理成表格。";
  tab("text");say("文字已在设备端提取，并填入描述框。未调用任何付费 AI API。");
 }finally{await worker.terminate();}
}
function canonical(s){return T(s).replace(/（[^）]*）|\([^)]*\)/g,"").toLowerCase();}
function activeSamples(cat){return (state.marketSamples||[]).filter(x=>canonical(x.category)===canonical(cat));}
function median(v){if(!v.length)return 0;v=[...v].sort((a,b)=>a-b);return v.length%2?v[(v.length-1)/2]:(v[v.length/2-1]+v[v.length/2])/2;}
function recomputeMarket(cat){
 const ref=activeSamples(cat).filter(x=>{const days=(Date.now()-Date.parse(x.date+"T00:00:00"))/86400000;return days>=-1&&days<=90;});
 if(!ref.length)return {updated:false,reason:"该品类90天内没有报价，参考行情不变（提示过期）"};
 const norm=ref.map(x=>({lo:x.low/(GRADE_FACTOR[x.grade]||1),hi:x.high/(GRADE_FACTOR[x.grade]||1)}));
 const low=median(norm.map(x=>x.lo)),high=median(norm.map(x=>x.hi)),mid=(low+high)/2;
 const list=state.markets;const key=canonical(cat);let market=list.find(x=>canonical(x.category)===key);
 const now=today();
 if(market){if(!Array.isArray(state.marketHistory))state.marketHistory=[];state.marketHistory.push({category:market.category,gramPrice:market.gramPrice,updatedAt:market.updatedAt,source:"旧参考价",changedAt:new Date().toISOString()});}
 else{market={id:uid(),category:cat,platformPrice:0};list.push(market)}
 market.gramPrice=round(mid,4);market.gradePrices={};
 for(const [g,ratio] of Object.entries(GRADE_FACTOR))market.gradePrices[g]=round(mid*ratio,4);
 market.low=round(low,4);market.high=round(high,4);market.updatedAt=now;market.refCount=ref.length;market.sourceType="本地报价样本";return {updated:true,low,high,count:ref.length};
}
function renderQuotes(){
 const text=T($("local-filter").value);
 const rows=(state.marketSamples||[]).filter(x=>!text||canonical(x.category)===canonical(text)).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,35);
 const selected=text?activeSamples(text):[];
 const aged=selected.length&&selected.every(x=>(Date.now()-Date.parse(x.date+"T00:00:00"))/86400000>90);
 let html='<div class="local-help">已保存 '+(state.marketSamples||[]).length+' 条个人采集报价。'+(text?(" 当前品类 "+selected.length+" 条"+(aged?"；全部超过90天，请更新来源报价":"")):" 可填品类来查看样本与异常。")+'</div>';
 if(!rows.length)html+='<div class="local-help">暂无记录。你可以把采购付款截图、供应商公开报价或自己的实付记录整理后手动登记。</div>';
 html+=rows.map(x=>'<div><div><strong>'+E(x.category)+'</strong> · '+E(x.grade)+' · ¥'+Number(x.low).toFixed(2)+'～'+Number(x.high).toFixed(2)+'/g</div><div>'+E(x.date)+' · '+E(x.source)+'</div><div>'+E(x.note||"")+'</div><div class="local-row"><button class="local-btn" data-local="delete-price" data-id="'+E(x.id)+'">撤销这条报价</button></div></div>').join("");
 $("local-history").innerHTML=html;
}
async function addPrice(){
 const category=T($("local-kind").value),grade=T($("local-grade").value),source=T($("local-source").value),date=T($("local-date").value),note=T($("local-url").value),low=N($("local-low").value),high=N($("local-high").value);
 if(!category||!source||!date)throw Error("请填写品类、来源和报价日期");
 if(!Number.isFinite(low)||!Number.isFinite(high)||low<=0||high<low||high>10000)throw Error("请核对报价范围，必须是人民币元/克且最低价不高于最高价");
 if(date>today())throw Error("报价日期不能是未来日期");
 const olds=activeSamples(category),recent=olds.filter(x=>Date.parse(x.date)>=Date.now()-90*86400000);
 const centers=recent.map(x=>(x.low+x.high)/2/(GRADE_FACTOR[x.grade]||1));
 const incoming=(low+high)/2/(GRADE_FACTOR[grade]||1),normal=median(centers);
 if(normal&&(incoming>normal*2.5||incoming<normal/2.5)){if(!confirm("这条报价偏离近90天历史中位值超过2.5倍，可能是单位/品相或价格录入错误。确认仍然保存？"))return}
 if(!confirm("这是你确实看到或支付的【散珠批发人民币元/克】报价，而不是单颗售价、整串价或零售成品价，对吗？"))return;
 const sample={id:uid(),category,grade,low,high,source,date,note,createdAt:new Date().toISOString()};
 await commit(()=>{if(!Array.isArray(state.marketSamples))state.marketSamples=[];state.marketSamples.push(sample);recomputeMarket(category);},"已保存报价样本并更新参考行情");
 refreshLists();$("local-filter").value=category;renderQuotes();say("已记入个人行情库，供之后估价和成本预警使用。报价来源为你填写的数据，并非系统联网实时行情。");
}
async function deletePrice(id){
 const x=(state.marketSamples||[]).find(o=>o.id===id);if(!x)return;
 if(!confirm("确定删除该条个人报价？更新后会重新根据近90天样本计算；历史采购成本不变。"))return;
 await commit(()=>{state.marketSamples=state.marketSamples.filter(y=>y.id!==id);const update=recomputeMarket(x.category);if(!update.updated){const market=state.markets.find(m=>canonical(m.category)===canonical(x.category));if(market&&market.sourceType==="本地报价样本")market.refCount=0;}},"报价已撤销");
 renderQuotes();say("已撤销报价并更新样本情况。");
}
function chooseCategory(){
 const items=[...new Set(state.materials.filter(x=>x.kind==="bead").map(x=>x.subtype).filter(Boolean))];
 if(!items.length){say("先在物料库录入珠子，或者直接输入品类。");return}
 $("local-kind").value=items[0];say("已选第一种已录入珠子，可从输入框下拉或搜索修改。");
}
async function run(task){if(busy)return;busy=true;shade.querySelectorAll("[data-local]").forEach(x=>x.disabled=true);try{await task()}catch(e){say(e.message||String(e),true)}finally{busy=false;shade.querySelectorAll("[data-local]").forEach(x=>x.disabled=false)}}
$("local-photo").onchange=e=>{photoFile=e.target.files?.[0]||null;say(photoFile?"已选图片："+photoFile.name:"")};
shade.addEventListener("click",e=>{const b=e.target.closest("[data-local]");if(!b)return;const action=b.dataset.local;if(action==="close"){if(!busy)shade.classList.remove("open");return}if(action==="tab-daily"){tab("daily");return}if(action==="tab-text"){tab("text");return}if(action==="tab-market"){tab("market");return}const handlers={quick:quickPreview,"quick-save":saveQuick,parse,copy,import:importToLedger,ocr:ocrImage,"add-price":addPrice,"delete-price":()=>deletePrice(b.dataset.id),"pick-market":chooseCategory,refresh:renderQuotes};if(handlers[action])run(handlers[action]);});
window.LocalAssistantPriceParser=parseSpokenPrice;
})();