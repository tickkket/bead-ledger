(function(){
"use strict";
let query="";
const escapeHtml=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function entries(){
 return state.materials.map(item=>({kind:"material",item:item})).concat(state.products.map(item=>({kind:"product",item:item})));
}
function find(query){
 const terms=query.toLowerCase().trim().split(/\s+/).filter(Boolean);if(!terms.length)return [];
 return entries().filter(x=>{
  const p=x.item;
  const hay=[p.name,p.subtype,p.beadGroup,p.spec,p.shape,p.source,p.notes,p.craftType,p.craftSize,x.kind,p.type==="out"?"外购成品":"手作成品"].join(" ").toLowerCase();
  return terms.every(t=>hay.includes(t));
 });
}
function mount(){
 const slot=document.getElementById("ledger-global-search-slot");if(!slot)return;
 slot.innerHTML='<div style="margin:8px;padding:9px;background:white;border:1px solid #d6e1d8;border-radius:10px"><input id="ledger-query" type="search" placeholder="搜索物料、成品、规格和备注" style="width:65%;padding:9px" value="'+escapeHtml(query)+'"><button type="button" data-ledger-search="clear" class="btn small">清除</button><div id="ledger-results"></div></div>';
 draw();
}
function draw(){
 const node=document.getElementById("ledger-results");if(!node)return;
 const items=find(query);
 node.innerHTML=!query?"":items.length?items.slice(0,12).map(x=>'<div style="padding:7px;border-top:1px solid #eee">'+escapeHtml(x.item.name)+' · '+(x.kind==="material"?"物料":"成品")+' <button class="btn small" data-action="'+(x.kind==="material"?"edit-material":"edit-product")+'" data-id="'+escapeHtml(x.item.id)+'">查看</button></div>').join(""):'<small>无匹配记录</small>';
}
document.addEventListener("input",event=>{if(event.target.id==="ledger-query"){query=event.target.value;draw()}});
document.addEventListener("click",event=>{if(event.target.closest('[data-ledger-search="clear"]')){query="";mount()}});
window.LedgerSearch={mount,find};
mount();
})();