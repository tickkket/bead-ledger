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
// Preserve the complete spoken product name (including style/pattern prefix).
// The taxonomy's standard accessory type remains a separate field.
function extractAccessoryName(input, matchedWord){
 let name=String(input||"").trim();
 if(!name)return "";
 name=name
  .replace(/[\r\n，,。；;]+/g," ")
  // Source platforms and their purchase verbs are not product names.
  // Do this BEFORE price parsing to preserve SKUs such as "14K金色".
  .replace(/(?:我)?(?:从|在|通过)?\s*(?:小红书|淘宝|拼多多|1688|闲鱼|咸鱼|抖音|微信|线下批发)(?:平台|直播间|店铺)?(?:上|里|的)?\s*(?:购买了|购买的|购买|购入了|购入的|购入|入手了|入手的|入手|买入了|买入的|买入|买了|买的|买|购得|拍下|下单了|下单|进了|进货|拿了|拿货|淘了|淘到)?/g," ")
  // Remove purchase action + quantity together, avoiding dangling "个".
  .replace(/(?:购买|购入|买入|入手|进货|下单|拿货|买了|拍下)(?:了|的)?\s*(?:一共|共|总共|数量)?\s*(?:\d+(?:\.\d+)?|[一二两三四五六七八九十百]+)\s*(?:个|件|包|对|套|副|串|条|根|支|枚|片|只|双|袋|组)(?=\s|$|(?:单价|总价|进价|买价|实付|售价|成本|花费|共计|合计))/g," ")
  // Without a platform, strip purchase verbs only at the start/end.
  .replace(/^\s*(?:(?:今天|昨天|刚刚|刚才|这次|这回|我|又|还|另外|还有)\s*)*(?:购买了|购买的|购买|购入了|购入的|购入|入手了|入手的|入手|买入了|买入的|买入|买了|买的|买|购得|拍下|下单了|下单|进了|进货|拿了|拿货|淘了|淘到)\s*/," ")
  .replace(/\s+(?:购买了|购买的|购买|购入了|购入的|购入|入手了|入手的|入手|买入了|买入的|买入|买了|买的|买|购得|拍下|下单了|下单|进了|进货|拿了|拿货|淘了|淘到)\s*$/," ")
  .replace(/(?:每个|每件|单个|单件|总)?(?:采购总价|进货总价|购入总价|总进价|总成本|建议售价|摆摊售价|实际价值|参考价值|进价|买价|拿货价|采购价|成本价|成本|实付|支付|花费|花了|共计|合计|总共|总价|实付总价|一共花了|总共花了|售价|卖价|定价|准备卖|打算卖|买入|购入)\s*(?:是|为|约|大概|[:：=])?\s*[¥￥]?\s*\d+(?:\.\d+)?\s*(?:元|块钱|块|圆)?/gi," ")
  .replace(/[¥￥]\s*\d+(?:\.\d+)?\s*(?:元|块钱|块|圆)?/g," ")
  .replace(/(?:单价|每(?:颗|个|件|对|包|串|只|条|组|套|片|支|根|枚|双|袋))\s*(?:是|为|:|：|¥|￥)?\s*[¥￥]?\s*\d+(?:\.\d+)?\s*(?:元|块钱|块|圆)?(?:\s*(?:\/|每|一)\s*(?:颗|个|件|对|包|串|只|条|组|套|片|支|根|枚|双|袋))?/g," ")
  .replace(/\d+(?:\.\d+)?\s*(?:元|块钱|块|圆)\s*(?:\/|每|一)\s*(?:颗|个|件|对|包|串|只|条|组|套|片|支|根|枚|双|袋)/g," ")
  .replace(/\d+(?:\.\d+)?\s*(?:元|块钱|块|圆)/g," ")
  .replace(/(?:一共|总共|共计|合计|共|数量|有)?\s*(?:\d+(?:\.\d+)?|[一二两三四五六七八九十百]+)\s*(?:个|件|包|对|套|副|串|条|根|支|枚|片|只|双|袋|组)(?=\s|$|(?:单价|总价|进价|买价|实付|售价|成本|花费|共计|合计))/g," ")
  // Never strip Chinese-number prefixes: 三片叶招财小滴流 is a product name.
  .replace(/(?:是|的|买的|购买的|入的|进的|入手的|拿货的)\s*$/g,"")
  // A quantity can appear before a named item (20个14K金色小滴流).
  .replace(/^\s*\d+(?:\.\d+)?\s*(?:个|件|包|对|套|副|串|条|根|支|枚|只|双|袋|组)(?=\S)/," ")
  .replace(/^[\s:：、·｜|—\-]+|[\s:：、·｜|—\-]+$/g,"")
  .replace(/\s{2,}/g," ").trim();
 return matchedWord&&name.toLowerCase().includes(matchedWord.toLowerCase())?name:"";
}
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
 const material=(text.match(/(?:925银|黄铜|钛钢|不锈钢|合金|18K金|14K金|镀金|镀银)/i)||[])[0]||"";
 const prefix=(material&&!color.includes(material)?material:"")+color;
 const name=extractAccessoryName(text,matched.synonym)||(prefix+normalizedType);
 return {kind:"metal",group,type:normalizedType,name,matched:matched.synonym};
}
const GROUP_NAMES=GROUPS.map(x=>x.name);
const TYPE_NAMES=[...new Set(GROUPS.flatMap(x=>x.types.map(t=>t[0])))];
function groupFor(type){const g=GROUPS.find(x=>x.types.some(t=>t[0]===type));return g?.name||""}
window.MetalAccessories={GROUPS,GROUP_NAMES,TYPE_NAMES,detect,groupFor};
})();