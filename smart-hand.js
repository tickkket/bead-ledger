(function(){
"use strict";
const root=document.getElementById("local-hand");if(!root)return;
const q=id=>document.getElementById(id);
let photo="",busy=false;
const types=[["","请选择作品类型"],["bracelet","手链 / 手串"],["necklace","项链"],["stud","耳钉"],["clip","耳夹"],["ring","戒指"],["wire","绕线作品"]];
root.innerHTML='<div class="di-grid">'+
'<div class="di-field di-full"><label>作品名称 *</label><input id="hand-name" class="local-field" placeholder="例如：紫水晶绕线手链"></div>'+
'<div class="di-field"><label>作品类型 *</label><select id="hand-type" class="local-field">'+types.map(x=>'<option value="'+x[0]+'">'+x[1]+'</option>').join("")+'</select></div>'+
'<div class="di-field"><label id="hand-size-label">手围 / 链长 / 戒号</label><input id="hand-size" class="local-field"></div>'+
'<div class="di-field"><label>售价（元）</label><input id="hand-price" class="local-field" type="number" min="0" step="any" placeholder="可填0"></div>'+
'<div class="di-field"><label>制作件数</label><input id="hand-count" class="local-field" type="number" min="1" step="1" value="1"></div>'+
'<div class="di-full"><label>作品照片 *</label><div class="di-photo-grid"><div class="di-photo-cell"><label>相册选图</label><input id="hand-photo" class="di-file" type="file" accept="image/*"></div><div class="di-photo-cell"><button type="button" class="local-btn main" data-hand="camera">📷 网页拍照</button><button type="button" class="local-btn" data-hand="edit">编辑图片</button></div></div><img id="hand-photo-preview" alt="作品照片" style="display:none;width:90px;height:90px;object-fit:cover;border-radius:9px;margin-top:8px"></div>'+
'<div class="di-full"><label>每件用料（口语描述）</label><textarea id="hand-materials" class="local-field" rows="2" placeholder="例如：用了6颗白水晶、2颗珍珠、1个龙虾扣"></textarea></div>'+
'<div class="di-full"><label>做工备注（可选）</label><input id="hand-notes" class="local-field"></div>'+
'<div class="di-full"><button type="button" class="local-btn main" data-hand="continue">下一步：核对物料和成本</button><div id="hand-status" class="local-result" aria-live="polite"></div></div></div>';
const status=t=>q("hand-status").textContent=t;
function updateKind(){
 const type=q("hand-type").value,size=q("hand-size");
 q("hand-size-label").textContent=craftSizeLabel(type);
 size.placeholder=type==="bracelet"?"例如 15.5":type==="necklace"?"例如 42":type==="ring"?"例如 12号":"可不填";
 size.closest(".di-field").style.display=["stud","clip","wire"].includes(type)?"none":"";
}
q("hand-type").addEventListener("change",updateKind);updateKind();
async function edit(image){
 if(busy)return;
 busy=true;
 try{const result=await window.BeadPhotoEditor.open(image);if(result){photo=result;q("hand-photo-preview").src=result;q("hand-photo-preview").style.display="block";status("");}}
 catch(err){status("图片编辑失败："+err.message)}
 finally{busy=false}
}
q("hand-photo").addEventListener("change",async e=>{
 const file=e.target.files?.[0];if(!file)return;
 try{await edit(await shrinkImage(file))}
 catch(err){status("图片读取失败："+err.message)}
 finally{e.target.value=""}
});
root.addEventListener("click",async e=>{
 const action=e.target.closest("[data-hand]")?.dataset.hand;if(!action)return;
 if(action==="camera"){if(busy)return;try{await window.BeadPhotoAccess.camera(edit)}catch(err){status(err.message)}return}
 if(action==="edit"){if(!photo){status("请先添加作品图片");return}await edit(photo);return}
 if(action!=="continue"||busy)return;
 try{
  const type=q("hand-type").value,name=q("hand-name").value.trim(),size=q("hand-size").value.trim();
  const qty=Number(q("hand-count").value),price=q("hand-price").value.trim();
  const narrative=q("hand-materials").value.trim(),notes=q("hand-notes").value.trim();
  if(!name)throw Error("请填写作品名称");
  if(!CRAFT_TYPE_LABEL[type])throw Error("请选择作品类型");
  if(!photo)throw Error("请添加作品图片");
  if(["bracelet","necklace"].includes(type)&&!(Number(size)>0))throw Error("手链需填写手围、项链需填写链长（cm）");
  if(type==="ring"&&!size)throw Error("请填写戒号或戒围");
  if(!Number.isInteger(qty)||qty<1)throw Error("制作件数应为正整数");
  if(price!==""&&(!Number.isFinite(Number(price))||Number(price)<0))throw Error("请填写正确售价");
  if(!narrative)throw Error("请口述每件手作使用的物料与数量");
  document.getElementById("local-shade")?.classList.remove("open");
  productForm(null,"hand");
  const form=document.getElementById("editor");if(!form)throw Error("作品编辑表单未打开");
  for(const pair of [["name",name],["craftType",type],["craftSize",size],["producedQty",String(qty)],["price",price||"0"],["materialNarrative",narrative],["notes",notes]]){
   const el=form.querySelector('[name="'+pair[0]+'"]');if(el)el.value=pair[1];
  }
  refreshCraftSize();ui.images.main=photo;updatePreview("main");
  window.HandMaterialAssist?.apply();
  toast("请选择用料的具体库存批次并核对成本，再保存");
  status("");
 }catch(err){status(err.message||String(err))}
});
})();