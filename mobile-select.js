/* Touch devices get stable in-page picker instead of native select overlays.
   Existing select value, name and change handlers are preserved; no data mutation. */
(()=>{
"use strict";
const isTouch=()=>{try{return !!(matchMedia("(pointer:coarse)").matches||navigator.maxTouchPoints>0)}catch{return false}};
let layer=null,source=null;
const CSS=[
 "#ledger-touch-picker{position:fixed;inset:0;z-index:10050;background:#142319a8;display:flex;align-items:flex-end;justify-content:center;color:#24382e;font-family:system-ui,-apple-system,sans-serif}",
 "#ledger-touch-picker *{box-sizing:border-box}",
 "#ledger-touch-picker .panel{width:min(640px,100%);max-height:88vh;display:flex;flex-direction:column;border-radius:17px 17px 0 0;background:#fff;padding-bottom:env(safe-area-inset-bottom,0px);box-shadow:0 -12px 35px #0002}",
 "#ledger-touch-picker .topline{display:flex;align-items:center;justify-content:space-between;padding:15px 16px 11px;border-bottom:1px solid #e5eae6;gap:10px}",
 "#ledger-touch-picker .topline strong{font-size:17px;line-height:1.3}",
 "#ledger-touch-picker .close{border:0;border-radius:9px;background:#e9f1ea;color:#315e51;padding:9px 13px;font:inherit;cursor:pointer}",
 "#ledger-touch-picker .filter{border:0;border-bottom:1px solid #eee;width:100%;background:#fff;padding:12px 15px;font-size:16px;outline:none}",
 "#ledger-touch-picker .choices{overflow-y:auto;overscroll-behavior:contain;min-height:80px;padding:8px 11px 18px}",
 "#ledger-touch-picker .choice{width:100%;background:white;border:0;border-radius:10px;margin:1px 0;padding:12px;text-align:left;min-height:46px;color:#26382e;font:inherit;font-size:15px;display:flex;justify-content:space-between;gap:12px;align-items:center;overflow-wrap:anywhere;cursor:pointer}",
 "#ledger-touch-picker .choice[aria-selected=true]{background:#e8f2ea;color:#23543f;font-weight:650}",
 "#ledger-touch-picker .choice:disabled{opacity:.38;cursor:default}",
 "#ledger-touch-picker .empty{color:#718076;padding:20px;text-align:center}"
].join("\n");
function supported(s){
 return !!(s&&s.tagName==="SELECT"&&!s.disabled&&!s.multiple&&!(s.size>1)&&
   s.options.length>1&&isTouch()&&!s.closest("#ledger-touch-picker"));
}
function title(s){
 const l=s.labels?.[0]||s.closest(".field")?.querySelector("label")||s.closest("label")||s.parentElement?.querySelector("label");
 return String(s.getAttribute("aria-label")||s.dataset.selectTitle||l?.textContent||"请选择").trim().replace(/\s+/g," ").slice(0,65)||"请选择";
}
function close(){
 if(layer)layer.remove();layer=null;source=null;
}
function open(s){
 if(!supported(s))return;
 if(layer&&source===s)return;
 close();
 if(!document.getElementById("ledger-touch-picker-style")){
  const style=document.createElement("style");style.id="ledger-touch-picker-style";style.textContent=CSS;document.head.appendChild(style);
 }
 source=s;
 const options=[...s.options].map((o,i)=>({i,value:o.value,label:String(o.textContent||o.label||"").trim()||"（空白）",disabled:o.disabled||!!o.parentElement?.disabled,selected:o.selected,hidden:o.hidden})).filter(o=>!o.hidden);
 const overlay=document.createElement("div");
 overlay.id="ledger-touch-picker";overlay.setAttribute("role","dialog");overlay.setAttribute("aria-modal","true");
 overlay.setAttribute("aria-label",title(s));
 const panel=document.createElement("section");panel.className="panel";
 const head=document.createElement("div");head.className="topline";
 const label=document.createElement("strong");label.textContent=title(s);
 const cancel=document.createElement("button");cancel.type="button";cancel.className="close";cancel.textContent="取消";
 head.append(label,cancel);panel.append(head);
 const search=options.length>=14?document.createElement("input"):null;
 if(search){search.type="search";search.className="filter";search.placeholder="搜索选项…";search.autocomplete="off";panel.append(search)}
 const choices=document.createElement("div");choices.className="choices";choices.setAttribute("role","listbox");panel.append(choices);overlay.append(panel);
 function fill(filter=""){
  choices.replaceChildren();let visible=0;
  for(const o of options){
   if(filter&&!o.label.toLowerCase().includes(filter))continue;
   const b=document.createElement("button");b.type="button";b.className="choice";b.dataset.optionIndex=String(o.i);b.textContent=o.label;b.disabled=o.disabled;
   b.setAttribute("role","option");b.setAttribute("aria-selected",String(o.selected));
   if(o.selected){const tick=document.createElement("span");tick.textContent="✓";tick.setAttribute("aria-hidden","true");b.append(tick)}
   choices.append(b);visible++;
  }
  if(!visible){const empty=document.createElement("div");empty.className="empty";empty.textContent="没有匹配选项";choices.append(empty)}
 }
 fill();
 if(search)search.addEventListener("input",()=>fill(search.value.trim().toLowerCase()));
 overlay.addEventListener("click",event=>{
  event.stopPropagation();
  if(event.target===overlay||event.target===cancel){close();return}
  const button=event.target.closest("[data-option-index]");
  if(!button||button.disabled)return;
  const option=options.find(o=>o.i===Number(button.dataset.optionIndex));
  if(!option||!source?.isConnected){close();return}
  const sel=source,changed=sel.value!==option.value;
  close();
  if(changed){
   sel.value=option.value;
   sel.dispatchEvent(new Event("input",{bubbles:true}));
   sel.dispatchEvent(new Event("change",{bubbles:true}));
  }
 });
 overlay.addEventListener("pointerdown",e=>e.stopPropagation());
 document.body.append(overlay);layer=overlay;
}
function intercept(e){
 const s=e.target?.closest?.("select");if(!supported(s))return;
 e.preventDefault();e.stopPropagation();open(s);
}
for(const kind of ["pointerdown","touchstart","mousedown","click"])
 document.addEventListener(kind,intercept,{capture:true,passive:false});
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&layer){e.preventDefault();e.stopPropagation();close()}},true);
window.LedgerMobileSelect={open,close};
})();