/* Stable touch picker. Native <select> stays as the actual form field.
   On touch devices a separate HTML button displays choices, so Android's
   native select popup is never invoked or cancelled by touch interceptors. */
(()=>{
 "use strict";
 const touch=()=>{try{return matchMedia("(pointer:coarse)").matches||navigator.maxTouchPoints>0}catch{return false}};
 if(!touch())return;
 const KEY="bead-ledger-use-native-select";
 let modal=null,activeSelect=null,scheduled=false;
 const css=[
  "select.ledger-touch-source{display:none!important}",
  ".ledger-touch-launcher{display:flex;align-items:center;justify-content:space-between;gap:8px;min-height:41px;width:100%;border:1px solid #dcded8;background:#fff;color:#26392f;border-radius:10px;padding:10px 12px;text-align:left;font:inherit;font-size:inherit;cursor:pointer;touch-action:manipulation}",
  ".ledger-touch-launcher[hidden]{display:none!important}",
  ".ledger-touch-launcher:disabled{opacity:.55}",
  ".ledger-touch-launcher:focus-visible{outline:2px solid #315e51;outline-offset:2px}",
  ".ledger-touch-launcher .ledger-touch-arrow{color:#728079;flex-shrink:0}",
  "#ledger-touch-overlay{position:fixed;inset:0;z-index:2147483000;background:#13221aab;display:flex;align-items:flex-end;justify-content:center;font-family:system-ui,-apple-system,'PingFang SC',sans-serif;color:#263b31}",
  "#ledger-touch-overlay *{box-sizing:border-box}",
  "#ledger-touch-overlay .ledger-touch-sheet{width:min(600px,100%);max-height:88dvh;max-height:88vh;background:#fff;border-radius:18px 18px 0 0;display:flex;flex-direction:column;padding-bottom:env(safe-area-inset-bottom,0px);box-shadow:0 -8px 32px #0003}",
  "#ledger-touch-overlay .ledger-touch-top{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:14px 16px;border-bottom:1px solid #e4ebe5}",
  "#ledger-touch-overlay .ledger-touch-top strong{font-size:16px;line-height:1.35}",
  "#ledger-touch-overlay .ledger-touch-cancel{border:0;border-radius:9px;background:#edf3ee;color:#315e51;padding:9px 12px;font:inherit;cursor:pointer}",
  "#ledger-touch-overlay .ledger-touch-filter{margin:0;padding:12px 16px;border:0;border-bottom:1px solid #e7ebe8;width:100%;font-size:16px;background:#fff;color:#26392f;outline:none}",
  "#ledger-touch-overlay .ledger-touch-list{min-height:60px;overflow-y:auto;overscroll-behavior:contain;padding:7px 10px 18px}",
  "#ledger-touch-overlay .ledger-touch-option{width:100%;display:flex;justify-content:space-between;align-items:center;gap:12px;border:0;border-radius:10px;background:#fff;color:#26392f;padding:13px 12px;min-height:47px;text-align:left;font:inherit;font-size:15px;cursor:pointer;touch-action:manipulation;overflow-wrap:anywhere}",
  "#ledger-touch-overlay .ledger-touch-option[aria-selected='true']{background:#e9f2eb;color:#285a45;font-weight:650}",
  "#ledger-touch-overlay .ledger-touch-option:disabled{opacity:.4}",
  "#ledger-touch-overlay .ledger-touch-empty{text-align:center;padding:20px;color:#78857b}",
  "html.ledger-native-mode select.ledger-touch-source{display:block!important}",
  "html.ledger-native-mode .ledger-touch-launcher{display:none!important}"
 ].join("\n");
 function isNative(){
  try{return localStorage.getItem(KEY)==="1"}catch{return false}
 }
 function textLabel(s){
  const option=s.selectedOptions?.[0]||s.options?.[s.selectedIndex];
  return String(option?.textContent||option?.label||"请选择").trim()||"请选择";
 }
 function title(s){
  const label=s.labels?.[0]||s.closest(".field")?.querySelector("label")||s.closest("label")||s.parentElement?.querySelector("label");
  return String(s.getAttribute("aria-label")||label?.textContent||"请选择").trim().replace(/\s+/g," ").slice(0,65)||"请选择";
 }
 function update(s){
  const b=s.nextElementSibling;
  if(!b?.classList.contains("ledger-touch-launcher")||b._sourceSelect!==s)return;
  const label=b.querySelector(".ledger-touch-current");
  if(label&&label.textContent!==textLabel(s))label.textContent=textLabel(s);
  // Assigning the *same* boolean attribute can still enqueue MutationObserver
  // records on Android/Chromium. Guard updates to prevent re-entrant redraw loops.
  const disabled=!!(s.disabled||s.options.length===0);
  const hidden=!!(s.hidden||s.style.display==="none");
  if(b.disabled!==disabled)b.disabled=disabled;
  if(b.hidden!==hidden)b.hidden=hidden;
 }
 function enhance(){
  if(isNative()){document.documentElement.classList.add("ledger-native-mode");return}
  document.documentElement.classList.remove("ledger-native-mode");
  for(const s of document.querySelectorAll("select")){
   if(s.closest("#ledger-touch-overlay")||s.dataset.ledgerPickerSkip==="true")continue;
   let b=s.nextElementSibling;
   if(!b?.classList.contains("ledger-touch-launcher")||b._sourceSelect!==s){
    b=document.createElement("button");
    b.type="button";b.className="ledger-touch-launcher";b._sourceSelect=s;
    b.setAttribute("aria-haspopup","listbox");
    const label=document.createElement("span");label.className="ledger-touch-current";
    const arrow=document.createElement("span");arrow.className="ledger-touch-arrow";arrow.textContent="▾";arrow.setAttribute("aria-hidden","true");
    b.append(label,arrow);
    b.addEventListener("click",event=>{
     event.preventDefault();event.stopPropagation();open(s);
    });
    s.insertAdjacentElement("afterend",b);
    s.classList.add("ledger-touch-source");
   }
   update(s);
  }
 }
 function schedule(){
  if(scheduled)return;
  scheduled=true;
  queueMicrotask(()=>{scheduled=false;enhance()});
 }
 function close(){
  if(modal)modal.remove();
  modal=null;activeSelect=null;
 }
 function choose(index){
  const s=activeSelect;
  if(!s?.isConnected){close();return}
  const item=s.options[index];
  if(!item||item.disabled||item.parentElement?.disabled){return}
  const changed=s.selectedIndex!==index;
  close();
  s.selectedIndex=index;
  update(s);
  if(changed){
   s.dispatchEvent(new Event("input",{bubbles:true}));
   s.dispatchEvent(new Event("change",{bubbles:true}));
  }
  schedule();
 }
 function open(s){
  if(!s?.isConnected||s.disabled||s.options.length===0)return;
  close();
  activeSelect=s;
  const items=[...s.options].map((o,i)=>({index:i,text:String(o.textContent||o.label||"").trim()||"（空白）",disabled:o.disabled||!!o.parentElement?.disabled,hidden:o.hidden})).filter(o=>!o.hidden);
  if(!items.length){activeSelect=null;return}
  const overlay=document.createElement("div");overlay.id="ledger-touch-overlay";overlay.setAttribute("role","dialog");overlay.setAttribute("aria-modal","true");
  const sheet=document.createElement("div");sheet.className="ledger-touch-sheet";
  const head=document.createElement("div");head.className="ledger-touch-top";
  const heading=document.createElement("strong");heading.textContent=title(s);
  const cancel=document.createElement("button");cancel.type="button";cancel.className="ledger-touch-cancel";cancel.textContent="取消";
  cancel.addEventListener("click",event=>{event.preventDefault();event.stopPropagation();close()});
  head.append(heading,cancel);sheet.append(head);
  let filter=null;
  if(items.length>=14){
   filter=document.createElement("input");filter.type="search";filter.className="ledger-touch-filter";filter.placeholder="搜索选项…";filter.autocomplete="off";
   sheet.append(filter);
  }
  const list=document.createElement("div");list.className="ledger-touch-list";list.setAttribute("role","listbox");sheet.append(list);
  function showOptions(q=""){
   list.replaceChildren();
   let count=0;
   for(const item of items){
    if(q&&!item.text.toLowerCase().includes(q))continue;
    const b=document.createElement("button");b.type="button";b.className="ledger-touch-option";
    b.disabled=item.disabled;b.setAttribute("role","option");b.setAttribute("aria-selected",String(s.selectedIndex===item.index));
    const t=document.createElement("span");t.textContent=item.text;b.append(t);
    if(s.selectedIndex===item.index){const tick=document.createElement("span");tick.textContent="✓";tick.setAttribute("aria-hidden","true");b.append(tick)}
    // Direct button handlers: no dependence on a bubbled click reaching the backdrop.
    b.addEventListener("click",ev=>{ev.preventDefault();ev.stopPropagation();choose(item.index)});
    // Older Android WebViews sometimes lose synthetic click after scrolling overlays.
    // Accept a stationary touchend; ignore drags so scrolling doesn't select a row.
    let start=null;
    b.addEventListener("touchstart",ev=>{const p=ev.touches?.[0];if(p)start={x:p.clientX,y:p.clientY}},{passive:true});
    b.addEventListener("touchend",ev=>{
     const p=ev.changedTouches?.[0];if(!p||!start)return;
     const moved=Math.hypot(p.clientX-start.x,p.clientY-start.y);
     if(moved>12)return;
     ev.preventDefault();ev.stopPropagation();choose(item.index);
    },{passive:false});
    list.append(b);count++;
   }
   if(!count){const empty=document.createElement("div");empty.className="ledger-touch-empty";empty.textContent="没有匹配选项";list.append(empty)}
  }
  showOptions();
  if(filter)filter.addEventListener("input",()=>showOptions(filter.value.trim().toLowerCase()));
  overlay.append(sheet);
  overlay.addEventListener("click",ev=>{if(ev.target===overlay)close();ev.stopPropagation()});
  document.body.append(overlay);modal=overlay;
 }
 function backToNative(){
  try{localStorage.setItem(KEY,"1")}catch{}
  document.documentElement.classList.add("ledger-native-mode");
  close();
 }
 const style=document.createElement("style");style.id="ledger-touch-style-v56";style.textContent=css;document.head.append(style);
 // No native-select pointer interception. A visible button receives a normal tap/click.
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",enhance,{once:true});
 else enhance();
 if("MutationObserver" in window){
  const observer=new MutationObserver(records=>{
   // Ignore mutations to our generated proxy buttons. Only actual select
   // attribute changes or added/removed DOM nodes require enhancement.
   if(records.some(r=>r.type==="childList"||
     (r.type==="attributes"&&r.target?.tagName==="SELECT")))schedule();
  });
  observer.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:["disabled","hidden","style"]});
 }
 document.addEventListener("change",ev=>{if(ev.target?.tagName==="SELECT")update(ev.target)});
 document.addEventListener("input",ev=>{if(ev.target?.tagName==="SELECT")update(ev.target)});
 document.addEventListener("keydown",ev=>{if(ev.key==="Escape"&&modal){ev.preventDefault();close()}},true);
 window.LedgerMobileSelect={enhance,open,close,choose,backToNative};
})();