/* Scene setting and camera/shot navigation for independent lighting plans. */
(() => {
 const layouts=ScenicModel.lightingLayouts;
 function perform(action,{cameraId=null,keepShots=false,record=true}={}){
  if(drag){toast('Finish moving the current item before switching lighting.');return false;}
  try{
   const before=JSON.stringify(workspaceData()),changed=action();if(!changed)return false;
   if(record){history.push(before);future=[];updateUndo();}
   selected=cameraId;selectedIds=new Set(cameraId?[cameraId]:[]);wallMultiSelect=false;stopPlayback();setTool('select');
   save();refresh();renderLibrary();if(!keepShots)showShots(false);return true;
  }catch(error){toast(error.message||'The lighting layout could not be changed.');return false;}
 }
 function activate(key,options={}){return perform(()=>layouts.activate(scene(),key),options);}
 function camera(camera){if(scene().shotLighting?.enabled&&camera?.type==='camera')return activate(layouts.forCamera(scene(),camera),{cameraId:camera.id,record:true});return false;}
 function inspector(){
  const data=scene().shotLighting;
  return `<div class="section-label">LIGHTING LAYOUTS</div><label class="toggle-label">Separate lighting per shot<input id="shot-lighting-enabled" aria-label="Separate lighting per shot" type="checkbox" ${data?.enabled?'checked':''}></label><p class="empty-hint">${data?.enabled?'Select a camera, a shot in Shot list, or a layout above the map. Shared lighting is the baseline for new shots. Each shot keeps its own lights, flags, positions and ambient light; shared changes do not replace existing shot layouts.':'All cameras use the shared scene layout. Enable to keep independent plans for shots and cameras. Turning this off restores the shared layout and keeps saved shot layouts.'}</p>${data?.layouts.length?`<p class="empty-hint">${data.layouts.length} saved shot ${data.layouts.length===1?'layout':'layouts'} retained${data.enabled?'':'; enable to edit them again'}.</p>`:''}`;
 }
 function bind(){
  const toggle=$('shot-lighting-enabled');if(toggle)toggle.onchange=()=>{const on=toggle.checked;if(!perform(()=>layouts.enable(scene(),on)))toggle.checked=!!scene().shotLighting?.enabled;};
 }
 function render(){
  const bar=$('lighting-layout-bar');if(!bar)return;const s=scene(),data=s.shotLighting;bar.hidden=!data?.enabled;
  if(!data?.enabled){bar.innerHTML='';return;}
  const choices=[{key:'shared',label:'Shared lighting'},...layouts.entries(s)];
  for(const saved of data.layouts)if(!choices.some(e=>e.key===saved.key))choices.push({key:saved.key,label:saved.label+' · saved / removed shot'});
  bar.innerHTML=`<label>Lighting layout <select id="active-lighting-layout" aria-label="Lighting layout">${choices.map(e=>`<option value="${esc(e.key)}" ${data.active===e.key?'selected':''}>${esc(e.label)}</option>`).join('')}</select></label><button id="export-shot-lighting" ${data.active==='shared'?'disabled':''}>Export selected shot</button><button id="export-shot-lighting-all">Export all shots · PDF</button><span>Lights & flags change; the set stays shared.</span>`;
  $('active-lighting-layout').onchange=e=>{activate(e.target.value,{keepShots:shotView});render();};
  $('export-shot-lighting').onclick=()=>exportMap();
  $('export-shot-lighting-all').onclick=async()=>{const button=$('export-shot-lighting-all');button.disabled=true;try{const result=await ScenicBatchExport.start(doc.projectId,'pdf');toast(result.message);}catch(e){toast(e.message);}finally{render();}};
 }
 function shotButton(shot){return scene().shotLighting?.enabled?`<button data-lighting-shot="${esc(shot.id)}" aria-label="Lighting for shot ${esc(shot.number)}" aria-pressed="${layouts.current(scene())==='shot:'+shot.id}">Lighting layout ↗</button>`:'';}
 function bindShots(){
  $('shot-list-content').querySelectorAll('[data-lighting-shot]').forEach(button=>button.onclick=e=>{e.stopPropagation();activate('shot:'+button.dataset.lightingShot,{keepShots:false});});
  $('shot-list-content').querySelectorAll('[data-shot-row]').forEach(row=>{
   const action=()=>{if(!scene().shotLighting?.enabled)return;const key=row.dataset.shotKind==='shot'?'shot:'+row.dataset.shotRow:layouts.forCamera(scene(),scene().objects.find(o=>o.id===row.dataset.shotRow)||{});activate(key,{keepShots:true});};
   row.onclick=e=>{if(!e.target.closest('button,input,a,select,textarea,summary,details,label')&&!window.getSelection()?.toString())action();};
   row.addEventListener('keydown',e=>{if(e.target===row&&(e.key==='Enter'||e.key===' ')){e.preventDefault();action();}});
  });
 }
 window.ScenicLightingUI={inspector,bind,render,camera,activate,shotButton,bindShots};render();renderInspector();renderShots();
})();
