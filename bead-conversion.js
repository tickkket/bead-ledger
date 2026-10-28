/* Free local bead length/quantity/cost estimation. No API. */
(function(){
"use strict";
function sizeMm(raw){
 const s=String(raw||"").replace(/\s+/g,"");
 let m=s.match(/(?:卡)?(\d+(?:\.\d+)?)[-~～至到—–](\d+(?:\.\d+)?)(?:mm|毫米|厘|卡|珍珠|贝珠)?/i);
 if(m){const a=+m[1],b=+m[2];return a>0&&b>0&&a<=100&&b<=100?Math.max(a,b):null}
 m=s.match(/(?:卡\s*|直径|珠径)?(\d+(?:\.\d+)?)(?:mm|毫米|厘|卡)/i);
 if(m){const d=+m[1];return d>0&&d<=100?d:null}
 return null;
}
function lengthCm(raw){
 const s=String(raw||"");
 const m=s.match(/(\d+(?:\.\d+)?)\s*(?:cm|厘米|公分)/i);
 const val=m?Number(m[1]):null;
 return val>0&&val<=1000?val:null;
}
function whole(v){return Number.isInteger(Number(v))&&Number(v)>0&&Number(v)<=100000?Number(v):null}
function estimate(params){
 const diameterMm=sizeMm(params.size||params.text||"");
 const length=lengthCm(params.length||params.text||"");
 const strands=whole(params.strands)||1;
 // 380mm / 5mm = 76; rounded to a whole bead. Real strands can have gaps, knots or unequal sizing.
 const theoreticalPerStrand=diameterMm&&length?Math.max(1,Math.round(length*10/diameterMm)):null;
 const spokenTotal=whole(params.spokenTotal);
 const source=spokenTotal?"口述颗数":theoreticalPerStrand?"珠径与串长估算":"未提供";
 const beadTotal=spokenTotal||(theoreticalPerStrand?theoreticalPerStrand*strands:null);
 return {diameterMm,lengthCm:length,strandCount:strands,theoreticalPerStrand,beadTotal,source,approximate:spokenTotal?!!params.spokenApprox:true};
}
function convert(unit,strands,beadTotal){
 const s=whole(strands),b=whole(beadTotal);
 if(unit==="串")return s;
 if(unit==="颗")return b;
 return null;
}
function price(total,quantity){
 const a=Number(total),b=Number(quantity);
 return Number.isFinite(a)&&a>=0&&Number.isFinite(b)&&b>0?a/b:null;
}
window.BeadConversion={sizeMm,lengthCm,whole,estimate,convert,price};
})();