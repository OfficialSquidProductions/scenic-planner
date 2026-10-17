/* iOS touch and Files adaptation; the complete Scenic editor remains bundled. */
(() => {
 if(!window.ScenicIPad)return;
 const state=window.ScenicIPad,sidebar=$('sidebar-panel'),inspector=$('properties-sidebar');
 document.documentElement.classList.add('ipad-app');
 if(state.isPhone)document.documentElement.classList.add('phone-app');
 const button=(id,text,label=text)=>{const b=document.createElement('button');b.id=id;b.textContent=text;b.setAttribute('aria-label',label);return b;};
 const properties=button('ipad-properties','Properties'),dismiss=button('ipad-close-panel','','Close panel');
 properties.setAttribute('aria-expanded','false');properties.setAttribute('aria-controls','properties-sidebar');
 $('workspace-menu').textContent='Scenes & items';$('workspace-menu').setAttribute('aria-label','Scenes and items');$('workspace-menu').setAttribute('aria-controls','sidebar-panel');
 $('workspace-menu').setAttribute('aria-expanded','false');
 $('workspace-menu').after(properties);document.body.append(dismiss);dismiss.hidden=true;
 function panels(){const isLibrary=sidebar.classList.contains('mobile-open'),isProperties=inspector.classList.contains('ipad-open');dismiss.hidden=!(isLibrary||isProperties);properties.setAttribute('aria-expanded',String(isProperties));$('workspace-menu').setAttribute('aria-expanded',String(isLibrary));}
 properties.onclick=()=>{sidebar.classList.remove('mobile-open');inspector.classList.toggle('ipad-open');panels();};
 $('workspace-menu').onclick=()=>{inspector.classList.remove('ipad-open');sidebar.classList.toggle('mobile-open');panels();};
 dismiss.onclick=()=>{sidebar.classList.remove('mobile-open');inspector.classList.remove('ipad-open');panels();};
 if(state.isPhone){
  $('workspace-menu').textContent='Scenes';
  const heading=document.createElement('div');heading.className='phone-panel-heading';
  const title=document.createElement('strong');title.textContent='Scenes & items';
  const closeLibrary=button('phone-close-scenes','Done','Close scenes and items');closeLibrary.onclick=dismiss.onclick;
  heading.append(title,closeLibrary);sidebar.prepend(heading);
  const closeProperties=button('phone-close-properties','Done','Close properties');closeProperties.onclick=dismiss.onclick;
  inspector.querySelector('.inspector-heading').append(closeProperties);
  // Move existing controls so their event handlers and editing state are retained.
  const crumb=document.querySelector('.project-crumb');crumb.querySelector('.muted').textContent='Production name';
  document.querySelector('.production-picker').prepend(crumb);
  const extra=document.createElement('div');extra.className='phone-project-actions';extra.append($('export'));
  $('import-shot-list').after(extra);
 }

 new MutationObserver(panels).observe(sidebar,{attributes:true,attributeFilter:['class']});
 const actions=document.createElement('div');actions.className='ipad-selection-tools';
 const additive=button('ipad-selection','Add to selection'),cancel=button('ipad-cancel','Cancel / deselect');
 additive.setAttribute('aria-pressed','false');actions.append(additive,cancel);$('properties-panel').prepend(actions);
 additive.onclick=()=>{state.addSelection=!state.addSelection;additive.classList.toggle('active',state.addSelection);additive.setAttribute('aria-pressed',String(state.addSelection));};
 cancel.onclick=()=>{if(drag)cancelDrag();wallStart=null;choose(null);setTool('select');state.addSelection=false;additive.classList.remove('active');additive.setAttribute('aria-pressed','false');};
 const originalHint=updateCanvasHint;
 updateCanvasHint=function(){originalHint();if($('canvas-hint').textContent.includes('Scroll to zoom'))$('canvas-hint').textContent='Drag to move or box select · Two fingers: pan & zoom · Properties: edit selection';};updateCanvasHint();
 $('open-project').setAttribute('aria-label','Import project…');$('import-shot-list').setAttribute('aria-label','Import shot list CSV');
 $('scene-canvas').setAttribute('aria-label','Interactive scene map. Tap a tool then tap to place. Drag to move. Two fingers pan and zoom.');
 document.querySelector('.sidebar-save-note').lastChild.textContent=state.isPhone?'Saved on this iPhone':'Saved on this iPad';
 $('guide').querySelector('p').textContent+=' On iPhone or iPad, tap a tool then tap the map to place it. Drag with one finger to move or box select. Use two fingers to pan and zoom. Scenes & items opens the library; Properties opens editing controls. Add to selection substitutes for Shift when selecting items. Use Pan to move with one finger.';
 document.querySelector('.changelog-footer').textContent='iOS beta updates arrive through TestFlight. The bundled release notes describe the shared Scenic editor.';
 // Use native Files pickers, retaining the editor’s existing parsers and validation.
 for(const [id,kind] of [['project-input','project'],['image-input','image'],['shot-list-input','shots']]){
  $(id).click=async()=>{try{const item=await ScenicDesktop.request('importFile',{kind});if(item)await receiveFile(item,kind);}catch(error){toast(error.message);}};
 }
 async function receiveFile(item,kind){
  const id=kind==='image'?'image-input':kind==='shots'?'shot-list-input':'project-input';
  const bytes=Uint8Array.from(atob(item.base64),c=>c.charCodeAt(0)),file=new File([bytes],item.name,{type:item.type});
  await $(id).onchange({target:{files:[file],value:''}});
 }
 state.receiveFile=receiveFile;
 // A second touch cancels a pending object drag before changing only the viewport.
 const points=new Map();let gesture=null,before=null,suppress=false;
 const local=e=>{const r=canvas.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top};};
 canvas.addEventListener('pointerdown',e=>{
  if(e.pointerType!=='touch')return;
  if(!points.size)before={workspace:JSON.stringify(workspaceData()),history:history.slice(),future:future.slice()};
  points.set(e.pointerId,local(e));
  if(points.size===2){
   if(drag)cancelDrag();
   if(JSON.stringify(workspaceData())!==before.workspace){loadWorkspace(JSON.parse(before.workspace));history=before.history;future=before.future;refresh();save();}
   wallStart=null;gesture={initial:ScenicIPadGestures.measure([...points.values()]),view:{...view}};suppress=true;
  }
  if(suppress){e.preventDefault();e.stopImmediatePropagation();canvas.setPointerCapture(e.pointerId);}
 },true);
 canvas.addEventListener('pointermove',e=>{
  if(e.pointerType!=='touch'||!points.has(e.pointerId))return;points.set(e.pointerId,local(e));
  if(suppress){e.preventDefault();e.stopImmediatePropagation();if(points.size===2&&gesture){view=ScenicIPadGestures.transform(gesture.initial,ScenicIPadGestures.measure([...points.values()]),gesture.view);updateZoom();invalidate();}}
 },true);
 function finish(e){if(e.pointerType!=='touch')return;points.delete(e.pointerId);if(suppress){e.preventDefault();e.stopImmediatePropagation();}if(!points.size){gesture=null;before=null;suppress=false;}}
 canvas.addEventListener('pointerup',finish,true);canvas.addEventListener('pointercancel',finish,true);
 const originalHit=ScenicTransforms.hit;
 ScenicTransforms.hit=(o,p,z)=>originalHit(o,p,z)||ScenicTransforms.handles(o,z).find(h=>Math.hypot(p.x-h.x,p.y-h.y)<=22/z)||null;
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&window.scenicReady)window.scenicFlush().catch(()=>{});});
})();
