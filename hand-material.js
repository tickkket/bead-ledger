/* Offline handmade-material phrase parser and optional browser speech recognition. */
(function(){
"use strict";
const units="颗|个|粒|枚|米|厘米|串|件|套|包|克|毫升|张|卷|根|片";
const cnMap={零:0,一:1,二:2,两:2,三:3,四:4,五:5,六:6,七:7,八:8,九:9};
function numberOf(t){
 const x=String(t||"").trim();
 if(/^\d+(?:\.\d+)?$/.test(x))return Number(x);
 if(x==="十")return 10;
 if(x.includes("十")){const [a,b]=x.split("十");return (a?cnMap[a]:1)*10+(b?cnMap[b]:0);}
 if(x in cnMap)return cnMap[x];return NaN;
}
function clean(text){return String(text||"").replace(/^(?:我(?:这(?:次|条|个)|们)?(?:做|制作|用了|用|加|放|串|搭配)(?:了)?|用(?:了)?|加(?:了)?|放(?:了)?|其中(?:有|用了)?|配了|需要|一共(?:用|用了)?|以及|还有|再加上|再用)\s*/g,"").replace(/[。！!]/g,"").trim()}
function parse(input){
 const raw=String(input||"").trim();
 if(!raw)return {items:[],warnings:["请先说明每件手作使用的材料和数量，例如：用了6颗珍珠、2颗黄水晶、1个龙虾扣。"]};
 const chunks=raw.replace(/(?:再加上|再加入|并且|还有|以及|另外|加上|搭配)/g,"，").split(/[，,、；;\n+＋]/g).map(clean).filter(Boolean);
 const patternNum="(\\d+(?:\\.\\d+)?|[一二两三四五六七八九十]+)";
 const first=new RegExp("^"+patternNum+"\\s*("+units+")\\s*(.+)$","i");
 const last=new RegExp("^(.+?)\\s*"+patternNum+"\\s*("+units+")(?:\\s*(?:左右|大约|约))?$","i");
 const items=[],warnings=[];
 for(const chunk of chunks.slice(0,30)){
  let m=chunk.match(first),term="",qty,unit="";
  if(m){qty=numberOf(m[1]);unit=m[2];term=m[3];}
  else {m=chunk.match(last);if(m){term=m[1];qty=numberOf(m[2]);unit=m[3]}}
  if(!m){const one=clean(chunk).replace(/^(?:的|用|了)/,"").trim();if(one&&one.length<=25){term=one;qty=null;unit="";warnings.push("「"+one+"」未识别数量，请手填用量和单位。")}else warnings.push("无法识别片段：「"+chunk.slice(0,45)+"」");}
  term=String(term||"").replace(/^(?:的|一共|用|了|一些|若干|珠子|材料|配件)\s*/,"").replace(/(?:装饰|作为主体|点缀|串成|做了|的珠子|的珠)$/,"").trim();
  if(!term||term.length>60){warnings.push("无效物料名称：「"+chunk.slice(0,35)+"」");continue;}
  if(qty!==null&&(!Number.isFinite(qty)||qty<=0||qty>10000)){warnings.push("数量不正确：「"+chunk.slice(0,35)+"」");continue;}
  if(unit==="粒")unit="颗";if(unit==="枚")unit="个";if(unit==="根"||unit==="片")unit="个";
  items.push({term,qty:qty===null?"":qty,unit,original:chunk});
 }
 if(chunks.length>30)warnings.push("一次最多解析30条材料，请分开整理。");
 return {items,warnings};
}
function rankMaterial(m,term){
 const t=String(term||"").toLowerCase().trim();
 const name=String(m.name||"").toLowerCase(),type=String(m.subtype||"").toLowerCase(),spec=String(m.spec||"").toLowerCase();
 if(!t)return 0;
 if(t===name||t===type)return 50;
 if(type.includes(t)||name.includes(t))return 35;
 if(t.includes(type)&&type.length>1)return 20;
 if(spec.includes(t))return 10;
 return 0;
}
function options(term){
 const all=state.materials.filter(x=>x.kind!=="tool");
 return all.sort((a,b)=>rankMaterial(b,term)-rankMaterial(a,term)||Number(b.qty>0)-Number(a.qty>0)||String(a.name).localeCompare(String(b.name),"zh"));
}
function apply(){
 const root=document.getElementById("editor");if(!root||root.querySelector('[name="type"]')?.value!=="hand")return;
 if(root.querySelector('[name="materialNarrative"]')?.disabled)return;
 const text=root.querySelector('[name="materialNarrative"]').value;
 const result=parse(text);
 if(!result.items.length){toast(result.warnings.join("；")||"没有找到材料");return;}
 const old=Array.from(root.querySelectorAll("[data-bom-row]")).some(e=>e.querySelector('[name="component"]')?.value);
 if(old&&!confirm("这将替换当前已选中的配方物料。建议先保存或复制描述。继续吗？"))return;
 ui.bomRows=result.items.map(x=>({id:"",qty:x.qty,term:x.term,requestUnit:x.unit}));
 const container=root.querySelector("#bom-rows");
 container.innerHTML=ui.bomRows.map((x,i)=>bomRow(x,i)).join("");
 const status=root.querySelector("#hand-parse-status");
 status.textContent="已理解 "+result.items.length+" 种用料。请逐项选择具体进货批次（含规格、库存和进价），不要直接保存未匹配的项目。"+(result.warnings.length?"\n待确认："+result.warnings.join("；"):"");
 status.style.whiteSpace="pre-wrap";
 previewCost();
}
function dictate(){
 const cls=window.SpeechRecognition||window.webkitSpeechRecognition;
 if(!cls){toast("当前浏览器没有可用的语音输入，请直接输入或使用手机键盘的麦克风语音输入");return;}
 const root=document.getElementById("editor"),input=root?.querySelector('[name="materialNarrative"]');if(!input)return;
 if(input.disabled)return;
 const recog=new cls();recog.lang="zh-CN";recog.continuous=false;recog.interimResults=false;recog.maxAlternatives=1;
 const btn=root.querySelector('[data-action="hand-dictate"]');
 if(btn){btn.disabled=true;btn.textContent="🎤 正在听…"}
 recog.onresult=e=>{const phrase=Array.from(e.results).map(x=>x[0]?.transcript||"").join("，");input.value=[input.value,phrase].filter(Boolean).join(input.value?"，":"");toast("语音已转文字，请核对后点击「识别用料」")};
 recog.onerror=e=>{toast("语音识别未完成："+e.error+"。可以直接文字输入或使用键盘麦克风。")};
 recog.onend=()=>{if(btn){btn.disabled=false;btn.textContent="🎤 语音输入"}};
 try{recog.start()}catch(e){toast("语音输入启动失败，请改用手打");recog.onend()}
}
window.HandMaterialAssist={parse,rankMaterial,options,apply,dictate};
})();