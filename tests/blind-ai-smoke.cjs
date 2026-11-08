/* Regression smoke test for the local AI blind-box UI.
 * Run: node tests/blind-ai-smoke.cjs
 * No third-party packages or API connection required.
 */
"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const base=path.resolve(__dirname,"..");
const alloc=fs.readFileSync(path.join(base,"blind-allocation.js"),"utf8");
const workflow=fs.readFileSync(path.join(base,"blind-ai-workflow.js"),"utf8");
const nodes=new Map();
const node=id=>{
 if(!nodes.has(id))nodes.set(id,{id,value:"",innerHTML:"",textContent:"",checked:false,style:{},scrollHeight:100,scrollTop:0,focus(){},select(){},matches(){return false}});
 return nodes.get(id);
};
function element(tag){
 return {tagName:tag,style:{},hidden:false,events:{},innerHTML:"",
  setAttribute(){},addEventListener(type,listener){this.events[type]=listener},remove(){},
  querySelector(sel){if(sel.startsWith("#"))return node(sel.slice(1));if(sel.startsWith('[data-baw="'))return {disabled:false,focus(){}};return null},
  append(){},focus(){}};
}
const document={
 head:{append(){}},body:{append(el){document._overlay=el}},
 activeElement:{focus(){}},createElement:element,addEventListener(){},getElementById(){return null}
};
const saved=new Map();
const localStorage={getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v),removeItem:k=>saved.delete(k)};
const window={};
const navigator={clipboard:{writeText(){return Promise.resolve();}}};
new Function("window",alloc)(window);
new Function("window","document","localStorage","navigator","confirm",workflow)(window,document,localStorage,navigator,()=>true);
window.BlindBoxAI.open();
const overlay=document._overlay;
assert.ok(overlay&&!overlay.hidden,"Blind-box dialog must open");
assert.equal(typeof overlay.events.click,"function","All buttons need a click handler");
function click(action,index=0){
 const button={dataset:{baw:action,index:String(index)},disabled:false};
 overlay.events.click({target:{closest:sel=>sel==="[data-baw]"?button:null},preventDefault(){}});
}
node("baw-total").value="120";
node("baw-description").value="白水晶6卡25颗圆珠\n紫水晶碎石手串2串";
node("baw-markup").value="2.5";
node("baw-strand-factor").value="12";
click("parse");
assert.match(node("baw-rows").innerHTML,/白水晶/);
assert.match(node("baw-rows").innerHTML,/紫水晶/);
assert.match(node("baw-chat").innerHTML,/信息齐全/);
overlay.events.change({target:{id:"baw-confirm",checked:true,matches(){return false}}});
click("allocate");
assert.match(node("baw-output").innerHTML,/120\.00/);
assert.match(node("baw-output").innerHTML,/成本小计/);
click("add");
assert.match(node("baw-rows").innerHTML,/第 3 种/);
click("ask");
assert.match(node("baw-status").textContent,/未齐全/);
console.log("PASS: open, button clicks, local parse, mixed units, allocation, add, missing-field prompts");
