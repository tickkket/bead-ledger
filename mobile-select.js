/* Stable touch selects: no overlay, no MutationObserver, no timers or
   interception of native touch/pointer events. The original select is the
   authoritative form field; buttons simply set its value and fire events. */
(()=>{
"use strict";
const touch=()=>{try{return !!(matchMedia("(pointer:coarse)").matches||navigator.maxTouchPoints>0)}catch{return false}};
if(!touch())return;
// Escape hatch for devices with unusual input handling. No inventory data is touched.
const mode=new URL(location.href).searchParams.get("select_mode");
try{
 if(mode==="native")localStorage.setItem("bead-ledger-select-mode","native");
 else if(mode==="buttons")localStorage.removeItem("bead-ledger-select-mode");
 if(localStorage.getItem("bead-ledger-select-mode")==="native")return;
}catch(e){}
const style=document.createElement("style");
style.id="ledger-select-stable-v59";
style.textContent=[
 "select.ledger-stable-native{display:none!important}",
 ".ledger-stable-wrap{width:100%;min-width:0;position:relative;margin-bottom:5px}",
 ".ledger-stable-trigger{display:flex;justify-content:space-between;align-items:center;gap:8px;text-align:left;width:100%;min-height:42px;border:1px solid #dcded8;border-radius:10px;background:#fff;color:#263b30;padding:10px 12px;font:inherit;cursor:pointer;touch-action:manipulation}",
 ".ledger-stable-trigger[aria-expanded=true]{border-radius:10px 10px 0 0;border-color:#6f9b7d;background:#f4f8f5}",
 ".ledger-stable-trigger:disabled{opacity:.5}",
 ".ledger-stable-trigger .ledger-stable-caret{flex-shrink:0;color:#6c8472}",
 ".ledger-stable-list{border:1px solid #baccc0;border-top:0;border-radius:0 0 10px 10px;background:white;padding:5px;max-height:38vh;overflow-y:auto;overscroll-behavior:contain}",
 ".ledger-stable-list[hidden]{display:none!important}",
 ".ledger-stable-row{display:block;width:100%;min-height:44px;padding:11px 10px;margin:0;border:0;border-radius:8px;text-align:left;background:#fff;color:#263b31;font:inherit;font-size:15px;cursor:pointer;touch-action:manipulation;overflow-wrap:anywhere}",
 ".ledger-stable-row[aria-selected=true]{background:#e5f0e8;color:#276148;font-weight:650}",
 ".ledger-stable-row:disabled{opacity:.45}",
 ".ledger-stable-filter{width:100%;font-size:16px;padding:9px 11px;margin:3px 0 6px;border:1px solid #d4e0d7;border-radius:8px;outline:0}",
 ".ledger-stable-wrap.ledger-stable-open{grid-column:1/-1}",
 ".field.ledger-stable-expanded{grid-column:1/-1}",
 "html.ledger-stable-native-mode select.ledger-stable-native{display:block!important}",
 "html.ledger-stable-native-mode .ledger-stable-wrap{display:none!important}"
].join("\n");
document.head.append(style);
const LABEL=s=>{
 const o=s.selectedOptions?.[0]||s.options[s.selectedIndex];
 return String(o?.textContent||o?.label||"请选择").trim()||"请选择";
};
function close(s){
 const wrap=s?._ledgerStable;
 if(!wrap?.isConnected)return;
 const list=wrap.querySelector(".ledger-stable-list");
 if(list)list.hidden=true;
 wrap.classList.remove("ledger-stable-open");
 wrap.querySelector(".ledger-stable-trigger")?.setAttribute("aria-expanded","false");
 wrap.closest(".field")?.classList.remove("ledger-stable-expanded");
}
function update(s){
 const wrap=s?._ledgerStable;
 if(!wrap?.isConnected)return;
 const value=wrap.querySelector(".ledger-stable-current");
 if(value&&value.textContent!==LABEL(s))value.textContent=LABEL(s);
 const button=wrap.querySelector(".ledger-stable-trigger");
 if(button&&button.disabled!==!!s.disabled)button.disabled=!!s.disabled;
 const invisible=!!(s.hidden||s.style.display==="none");
 if(wrap.hidden!==invisible)wrap.hidden=invisible;
}
function choose(s,index){
 if(!s?.isConnected)return;
 const option=s.options[index];if(!option||option.disabled||option.parentElement?.disabled)return;
 const changed=s.selectedIndex!==index;
 close(s);
 s.selectedIndex=index;
 update(s);
 if(changed){
  s.dispatchEvent(new Event("input",{bubbles:true}));
  s.dispatchEvent(new Event("change",{bubbles:true}));
 }
}
function open(s){
 const wrap=s?._ledgerStable;
 if(!wrap?.isConnected||s.disabled)return;
 document.querySelectorAll(".ledger-stable-wrap").forEach(w=>{if(w!==wrap&&w._select)close(w._select)});
 const list=wrap.querySelector(".ledger-stable-list");
 if(!list)return;
 const expanding=list.hidden;
 if(!expanding){close(s);return}
 list.replaceChildren();
 const filter=s.options.length>=14?document.createElement("input"):null;
 const rows=document.createElement("div");
 if(filter){
  filter.type="search";filter.className="ledger-stable-filter";filter.autocomplete="off";filter.placeholder="搜索选项…";
  list.append(filter);
 }
 list.append(rows);
 function populate(q=""){
  rows.replaceChildren();
  for(let i=0;i<s.options.length;i++){
   const o=s.options[i];
   if(o.hidden||q&&!String(o.textContent||o.label||"").toLowerCase().includes(q))continue;
   const button=document.createElement("button");button.type="button";
   button.className="ledger-stable-row";button.textContent=String(o.textContent||o.label||"（空白）");
   button.disabled=!!(o.disabled||o.parentElement?.disabled);
   button.setAttribute("aria-selected",String(s.selectedIndex===i));
   button.addEventListener("click",event=>{event.preventDefault();event.stopPropagation();choose(s,i)});
   rows.append(button);
  }
 }
 populate();
 if(filter)filter.addEventListener("input",()=>populate(filter.value.trim().toLowerCase()));
 list.hidden=false;
 wrap.classList.add("ledger-stable-open");
 wrap.querySelector(".ledger-stable-trigger")?.setAttribute("aria-expanded","true");
 wrap.closest(".field")?.classList.add("ledger-stable-expanded");
}
function enhance(){
 for(const s of document.querySelectorAll("select")){
  if(s.closest(".ledger-stable-wrap")||s.multiple||s.size>1||s.dataset.ledgerPickerSkip==="true")continue;
  if(s._ledgerStable?.isConnected){update(s);continue}
  const wrap=document.createElement("div");wrap.className="ledger-stable-wrap";wrap._select=s;
  const trigger=document.createElement("button");trigger.type="button";trigger.className="ledger-stable-trigger";
  trigger.setAttribute("aria-haspopup","listbox");trigger.setAttribute("aria-expanded","false");
  const value=document.createElement("span");value.className="ledger-stable-current";
  const arrow=document.createElement("span");arrow.className="ledger-stable-caret";arrow.textContent="▾";
  trigger.append(value,arrow);
  const list=document.createElement("div");list.className="ledger-stable-list";list.hidden=true;
  wrap.append(trigger,list);
  s.insertAdjacentElement("afterend",wrap);s._ledgerStable=wrap;s.classList.add("ledger-stable-native");
  trigger.addEventListener("click",event=>{event.preventDefault();event.stopPropagation();open(s)});
  update(s);
 }
}
document.addEventListener("click",event=>{
 if(event.target.closest(".ledger-stable-wrap"))return;
 document.querySelectorAll(".ledger-stable-wrap.ledger-stable-open").forEach(w=>{if(w._select)close(w._select)});
});
document.addEventListener("change",event=>{if(event.target?.tagName==="SELECT")update(event.target)});
document.addEventListener("keydown",event=>{if(event.key==="Escape")document.querySelectorAll(".ledger-stable-wrap.ledger-stable-open").forEach(w=>{if(w._select)close(w._select)})});
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",enhance,{once:true});else enhance();
window.LedgerMobileSelect={enhance,open,close,choose};
})();