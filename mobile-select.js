/* Touch-safe inline selectors for bead ledger (v58).
   Standard <details>/<summary> and regular buttons replace unreliable
   Android native select popups and earlier full-screen touch overlays.
   The hidden original select remains the authoritative form field. */
(()=>{
"use strict";
const touch=()=>{try{return !!(matchMedia("(pointer:coarse)").matches||navigator.maxTouchPoints>0)}catch{return false}};
if(!touch())return;
const KEY="bead-ledger-use-native-select";
const nativeMode=()=>{try{return localStorage.getItem(KEY)==="1"}catch{return false}};
const CSS=[
 "select.ledger-inline-native{display:none!important}",
 ".ledger-inline-choices{display:block;width:100%;min-width:0;margin:0 0 6px;color:#26392f;font:inherit}",
 ".ledger-inline-choices summary{list-style:none;display:flex;justify-content:space-between;align-items:center;gap:9px;min-height:41px;width:100%;border:1px solid #dcded8;background:white;border-radius:10px;padding:10px 11px;cursor:pointer;font:inherit;touch-action:manipulation;overflow-wrap:anywhere}",
 ".ledger-inline-choices summary::-webkit-details-marker{display:none}",
 ".ledger-inline-choices summary:after{content:'▾';flex-shrink:0;color:#667b70}",
 ".ledger-inline-choices[open] summary{border-color:#6a9a82;border-radius:10px 10px 0 0;background:#f4f8f5}",
 ".ledger-inline-choices[open] summary:after{content:'▴'}",
 ".ledger-inline-list{border:1px solid #b9cdc0;border-top:0;border-radius:0 0 10px 10px;background:white;max-height:38vh;overflow:auto;overscroll-behavior:contain;padding:5px;box-shadow:0 5px 12px #15291a10}",
 ".ledger-inline-list button{display:flex;justify-content:space-between;align-items:center;gap:8px;text-align:left;width:100%;min-height:45px;padding:11px 10px;border:0;border-radius:7px;background:white;color:#283c31;font:inherit;font-size:15px;cursor:pointer;touch-action:manipulation;overflow-wrap:anywhere}",
 ".ledger-inline-list button[aria-selected=true]{background:#e4f0e7;color:#275c43;font-weight:600}",
 ".ledger-inline-list button:disabled{opacity:.4}",
 ".ledger-inline-list .ledger-inline-empty{font-size:13px;color:#7b897c;padding:15px}",
 ".ledger-inline-filter{width:100%;font-size:16px;padding:10px 11px;border:1px solid #d7e4da;border-radius:8px;margin:3px 0 7px;outline:none}",
 ".field.ledger-inline-expanded{grid-column:1 / -1}",
 "html.ledger-select-native select.ledger-inline-native{display:block!important}",
 "html.ledger-select-native .ledger-inline-choices{display:none!important}"
].join("\n");
const style=document.createElement("style");style.id="ledger-select-style-v58";style.textContent=CSS;document.head.append(style);
let queued=false;
function description(s){
 const selected=s.selectedOptions?.[0]||s.options[s.selectedIndex];
 return String(selected?.textContent||selected?.label||"请选择").trim()||"请选择";
}
function update(s){
 const details=s._ledgerInline;
 if(!details?.isConnected)return;
 const title=details.querySelector("summary .ledger-inline-current");
 const text=description(s);
 if(title&&title.textContent!==text)title.textContent=text;
 const hidden=!!(s.hidden||s.disabled||s.style.display==="none");
 if(details.hidden!==hidden)details.hidden=hidden;
}
function choose(s,index){
 if(!s?.isConnected||s.disabled)return;
 const op=s.options[index];
 if(!op||op.disabled||op.parentElement?.disabled)return;
 const changed=s.selectedIndex!==index;
 const details=s._ledgerInline;
 if(details)details.open=false;
 const parent=details?.closest(".field");
 parent?.classList.remove("ledger-inline-expanded");
 s.selectedIndex=index;
 update(s);
 if(changed){
  s.dispatchEvent(new Event("input",{bubbles:true}));
  s.dispatchEvent(new Event("change",{bubbles:true}));
 }
}
function optionsFor(s,list,filter=""){
 list.replaceChildren();
 const matches=[...s.options].map((op,i)=>({op,i})).filter(({op})=>!op.hidden&&String(op.textContent||op.label||"").toLowerCase().includes(filter));
 if(!matches.length){const msg=document.createElement("p");msg.className="ledger-inline-empty";msg.textContent="没有匹配的选项";list.append(msg);return}
 const fragment=document.createDocumentFragment();
 for(const {op,i} of matches){
  const b=document.createElement("button");b.type="button";b.textContent=String(op.textContent||op.label||"（空白）");
  b.disabled=!!(op.disabled||op.parentElement?.disabled);
  b.setAttribute("aria-selected",String(s.selectedIndex===i));
  if(s.selectedIndex===i){const tick=document.createElement("span");tick.textContent="✓";tick.setAttribute("aria-hidden","true");b.append(tick)}
  b.addEventListener("click",event=>{event.preventDefault();event.stopPropagation();choose(s,i)});
  fragment.append(b);
 }
 list.append(fragment);
}
function build(s){
 if(s._ledgerInline?.isConnected)return update(s);
 if(s.multiple||s.size>1||s.dataset.ledgerPickerSkip==="true")return;
 const details=document.createElement("details");details.className="ledger-inline-choices";
 details.setAttribute("aria-label","选择："+(s.getAttribute("aria-label")||s.labels?.[0]?.textContent||"选项").trim());
 const summary=document.createElement("summary");const current=document.createElement("span");current.className="ledger-inline-current";
 summary.append(current);details.append(summary);
 const list=document.createElement("div");list.className="ledger-inline-list";details.append(list);
 const label=s.closest("label");
 // Keep the substitute inside any enclosing label so conditional display:none
 // (e.g. bead-only/metal-only fields) still hides the entire control.
 s.insertAdjacentElement("afterend",details);
 s._ledgerInline=details;
 s.classList.add("ledger-inline-native");
 details.addEventListener("toggle",()=>{
  const root=details.closest(".field");
  if(details.open){
   document.querySelectorAll("details.ledger-inline-choices[open]").forEach(x=>{if(x!==details)x.open=false});
   root?.classList.add("ledger-inline-expanded");
   list.replaceChildren();
   if(s.options.length>=14){
    const filter=document.createElement("input");filter.type="search";filter.className="ledger-inline-filter";
    filter.placeholder="搜索选项…";filter.autocomplete="off";
    filter.addEventListener("input",()=>{optionsFor(s,options,filter.value.trim().toLowerCase())});
    const options=document.createElement("div");list.append(filter,options);optionsFor(s,options);
   }else optionsFor(s,list);
  }else root?.classList.remove("ledger-inline-expanded");
 });
 update(s);
}
function enhance(){
 if(nativeMode()){document.documentElement.classList.add("ledger-select-native");return}
 document.documentElement.classList.remove("ledger-select-native");
 for(const s of document.querySelectorAll("select"))if(!s.closest(".ledger-inline-choices"))build(s);
}
function schedule(){
 if(queued)return;queued=true;
 queueMicrotask(()=>{queued=false;enhance()});
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",enhance,{once:true});
else enhance();
const observer=new MutationObserver(records=>{
 // Only new/replaced nodes and changes to real native select elements. Ignore
 // options and button mutations inside our own details to avoid redraw loops.
 if(records.some(r=>
   r.type==="attributes"&&r.target?.tagName==="SELECT" ||
   r.type==="childList"&&!r.target?.closest?.(".ledger-inline-choices")
 ))schedule();
});
observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:["disabled","hidden","style"]});
document.addEventListener("change",e=>{if(e.target?.tagName==="SELECT")update(e.target)});
document.addEventListener("input",e=>{if(e.target?.tagName==="SELECT")update(e.target)});
window.LedgerMobileSelect={enhance,choose,open:s=>{const d=s?._ledgerInline;if(d)d.open=true},close:()=>document.querySelectorAll("details.ledger-inline-choices[open]").forEach(d=>d.open=false)};
})();