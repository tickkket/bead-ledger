/* Local accessory taxonomy. Names and group labels are user-editable in forms. */
(function(){
"use strict";
const GROUPS=[
 {name:"基础连接件",types:[
  ["开口圈",["开口圈","单圈","连接圈","跳圈"]],["闭口圈",["闭口圈","闭合圈"]],["定位珠",["定位珠","定位扣珠","定位扣"]],["定位管",["定位管","压线管","压接管","压线珠管"]],
  ["龙虾扣",["龙虾扣","龙虾钩"]],["包扣",["包扣","包头扣"]],["万能扣",["万能扣"]],["夹扣",["夹扣","夹头扣"]],
  ["空吊",["空吊","空托吊"]],["托针",["托针"]],["九字针",["九字针","9字针","九字","9字","九字钉"]],
  ["T字针",["T字针","t字针","T针","t针","丁字针"]],["球针",["球针","球头针"]],
  ["耳钩",["耳钩","耳勾"]],["耳夹",["耳夹","耳夹配件"]],["戒托",["戒托","戒指托","戒圈托"]],
  ["扣头",["扣头","搭扣"]],["磁吸扣",["磁吸扣","磁扣"]],["弹簧扣",["弹簧扣"]],["连接扣",["连接扣"]]
 ]},
 {name:"隔珠隔片与连接饰件",types:[
  ["带吊隔片",["带吊隔片","带吊隔珠","挂吊隔片"]],["通孔隔圈",["通孔隔圈","通孔隔环","通孔圈"]],
  ["四通隔珠",["四通隔珠","4通隔珠","四通隔片","4通隔片","四通珠","4通珠"]],
  ["四通",["四通","4通","四孔"]],["单通",["单通","1通","一通","单孔连接珠"]],
  ["多通",["多通","三通","3通","五通","5通","六通","6通","多孔连接珠"]],
  ["隔珠",["隔珠","金属隔珠","隔珠配件"]],["隔片",["隔片","隔片配件"]],
  ["魔盒",["魔盒","魔盒配件"]],["隔圈",["隔圈","间隔圈"]]
 ]},
 {name:"吊坠与装饰配件",types:[
  ["小滴流",["小滴流","滴流","小滴溜","滴溜"]],["流苏",["流苏","流苏吊饰","流苏坠"]],
  ["流苏帽",["流苏帽","流苏盖"]],["吊坠",["吊坠","金属吊饰","挂坠"]],
  ["挂件配饰",["挂件配饰","挂件配件"]]
 ]},
 {name:"链条与管件",types:[
  ["延长链",["延长链","加长链","尾链","延伸链"]],["盒子链",["盒子链","盒仔链","方盒链"]],
  ["弯管",["弯管","弯管配件","弧形管"]],
  ["项链链条",["项链链条","项链裸链","项链链坯","项链配件","项链链身","项链金属链"]],
  ["链条",["链条","链子","金属链","裸链"]],
  ["项链",["项链"]]
 ]}
];
const ALIASES=[];
for(const group of GROUPS)for(const [type,words] of group.types){
 for(const synonym of words)ALIASES.push({group:group.name,type,synonym});
}
ALIASES.sort((a,b)=>b.synonym.length-a.synonym.length||b.type.length-a.type.length);
const materialWords=/不锈钢|合金|金属|黄铜|铜制|银色|金色|玫瑰金|镀金|镀银|14k|18k|925银|钢色|钛钢/i;
const gemstoneWords=/天然石|晶石|水晶|白水晶|紫水晶|黄水晶|粉水晶|珍珠|翡翠|和田玉|玛瑙|玉髓|萤石|碧玺|绿松石|青金石|拉长石|月光石|菩提|木珠|水晶珠|石榴石|海蓝宝/;
const supplyWords=/弹力线|水晶线|鱼线|铜丝|钢丝|包装袋|礼盒|绒布袋|胶水|耗材|工具/;
function detect(input){
 const text=String(input||"").trim();
 if(!text)return null;
 if(supplyWords.test(text)&&!/(?:金属配件|连接配件|饰品配件)/.test(text))return null;
 const matched=ALIASES.find(x=>text.toLowerCase().includes(x.synonym.toLowerCase()));
 if(!matched){return /金属配件|五金配件|饰品金属配件/.test(text)?{kind:'metal',group:'',type:'',name:'金属配件',matched:''}:null}
 const explicitMetal=materialWords.test(text)||/(?:配件|连接件|五金|镀层)/.test(text);
 // Natural-stone bead shapes can overlap with metal separators and curved tubes.
 if(gemstoneWords.test(text)&&!explicitMetal){
  if(["弯管","隔片","隔珠","隔圈","通孔隔圈","项链"].includes(matched.type))return null;
  if(/(?:成品|现成).{0,6}(?:项链|耳夹)/.test(text))return null;
 }
 const color=(text.match(/(?:玫瑰金色|玫瑰金|香槟金|古铜色|古银色|14K金色|18K金色|金色|银色|黑色|白K色|白金色|黄铜色)/i)||[])[0]||"";
 const normalizedType=matched.type==="四通"&&/隔(?:珠|片)/.test(text)?"四通隔珠":matched.type;
 const group=GROUPS.find(x=>x.types.some(t=>t[0]===normalizedType))?.name||matched.group;
 const name=(color&& !normalizedType.includes(color)?color:"")+normalizedType;
 return {kind:"metal",group,type:normalizedType,name,matched:matched.synonym};
}
const GROUP_NAMES=GROUPS.map(x=>x.name);
const TYPE_NAMES=[...new Set(GROUPS.flatMap(x=>x.types.map(t=>t[0])))];
function groupFor(type){const g=GROUPS.find(x=>x.types.some(t=>t[0]===type));return g?.name||""}
window.MetalAccessories={GROUPS,GROUP_NAMES,TYPE_NAMES,detect,groupFor};
})();