(() => {
 const pending=new Map();let next=0,version=0,activeRequests=0,queue=[],observer,snapshot;
 const grid=document.getElementById('scene-grid'),status=document.getElementById('browser-status');
 const menu=document.getElementById('browser-scene-context'),duplicateButton=document.getElementById('browser-duplicate-scene');let contextTarget=null;
 function closeMenu(){menu.hidden=true;contextTarget=null;}
 duplicateButton.onclick=async()=>{const target=contextTarget;closeMenu();if(!target)return;try{if(!await request('duplicateScene',target))status.textContent='This scene could not be duplicated. Check the active production in Scenic.';}catch{status.textContent='Scenic could not duplicate this scene.';}};
 document.addEventListener('pointerdown',e=>{if(!e.target.closest('#browser-scene-context'))closeMenu();});
 window.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu();});
 function request(action,payload={}){
  if(window.ScenicDesktop)return window.ScenicDesktop.request(action,payload);
  return new Promise((resolve,reject)=>{if(!window.opener){reject(Error('Open the scene browser from Scenic.'));return;}const id=String(++next);pending.set(id,{resolve,reject});window.opener.postMessage({channel:'scenic-scene-browser',id,action,payload},location.origin==='null'?'*':location.origin);});
 }
 const exportButton=document.getElementById('browser-export-all'),exportFormat=document.getElementById('browser-export-format'),cancelButton=document.getElementById('browser-export-cancel');let exporting=false,poll,exportProduction;
 function exportState(data){if(!data?.running&&!exporting)return;status.textContent=data.message||'Exporting scenes…';}
 exportButton.onclick=async()=>{if(exporting||!snapshot)return;exporting=true;const productionId=exportProduction=snapshot.productionId;exportButton.disabled=exportFormat.disabled=true;cancelButton.hidden=false;
  poll=setInterval(()=>request('sceneExportStatus').then(exportState).catch(()=>{}),350);
  try{const result=await request('exportAllScenes',{productionId,format:exportFormat.value});status.textContent=result?.message||'Export finished.';}catch(error){status.textContent=error.message||'The scenes could not be exported.';}finally{clearInterval(poll);exporting=false;exportButton.disabled=exportFormat.disabled=false;cancelButton.hidden=true;}
 };
 cancelButton.onclick=()=>{if(exportProduction)request('cancelAllSceneExport',{productionId:exportProduction}).catch(error=>{status.textContent=error.message;});};
 function pump(){
  while(activeRequests<2&&queue.length){const item=queue.shift();if(item.version!==version)continue;activeRequests++;
   request('scenePreview',{productionId:item.productionId,sceneId:item.id}).then(image=>{
    if(item.version!==version)return;
    if(typeof image==='string'&&image.startsWith('data:image/jpeg;base64,')){item.image.src=image;item.image.hidden=false;item.label.textContent='';}
    else item.label.textContent='Preview unavailable';
   }).catch(()=>{if(item.version===version)item.label.textContent='Preview unavailable';}).finally(()=>{activeRequests--;pump();});
  }
 }
 function render(data){
  if(!data||!Array.isArray(data.scenes))return;closeMenu();const scroll=snapshot?.productionId===data.productionId?grid.scrollTop:0;snapshot=data;version++;queue=[];observer?.disconnect();grid.replaceChildren();if(!exporting)status.textContent='';
  document.documentElement.dataset.theme=data.theme==='dark'?'dark':'light';document.title=data.name+' · Scenes · Scenic';
  exportButton.textContent=data.shotExport?'Export all shots':'Export all';const png=exportFormat.querySelector?.('option[value="png"]');if(png)png.disabled=!!data.shotExport;if(data.shotExport)exportFormat.value='pdf';exportFormat.title=data.shotExport?'One page per shot in '+data.shotExport:'Every scene in this production';
  document.getElementById('browser-production').textContent=data.name+(data.shotExport?' · '+data.shotExport+' · shot layouts':'');document.getElementById('browser-count').textContent=data.scenes.length+' '+(data.scenes.length===1?'scene':'scenes');
  const items=new Map();
  observer=new IntersectionObserver(entries=>{for(const entry of entries){if(entry.isIntersecting){const item=items.get(entry.target);if(item){queue.push(item);observer.unobserve(entry.target);}}}pump();},{root:grid,rootMargin:'240px'});
  for(const scene of data.scenes){
   const button=document.createElement('button');button.className='scene-card';button.setAttribute('aria-current',String(scene.id===data.active));button.setAttribute('aria-label','Scene '+scene.number+': '+scene.title);
   const preview=document.createElement('span');preview.className='scene-preview';const label=document.createElement('span');label.textContent='Loading preview…';const image=document.createElement('img');image.alt='';image.hidden=true;preview.append(label,image);
   const caption=document.createElement('span');caption.className='scene-card-caption';const number=document.createElement('span');number.className='scene-card-number';number.textContent=String(scene.number).padStart(2,'0');const title=document.createElement('strong');title.className='scene-card-title';title.textContent=scene.title;caption.append(number,title);button.append(preview,caption);grid.append(button);
   button.oncontextmenu=e=>{e.preventDefault();contextTarget={productionId:data.productionId,sceneId:scene.id};menu.hidden=false;menu.style.left=Math.max(0,Math.min(e.clientX,innerWidth-190))+'px';menu.style.top=Math.max(0,Math.min(e.clientY,innerHeight-60))+'px';duplicateButton.focus();};
   button.onkeydown=e=>{if(e.key==='ContextMenu'||e.shiftKey&&e.key==='F10'){e.preventDefault();const r=button.getBoundingClientRect();button.oncontextmenu({preventDefault(){},clientX:r.right,clientY:r.top});}};
   items.set(button,{version,productionId:data.productionId,id:scene.id,image,label});observer.observe(button);
   button.onclick=async()=>{try{if(await request('selectScene',{productionId:data.productionId,sceneId:scene.id})){for(const card of grid.children)card.setAttribute('aria-current',String(card===button));}else status.textContent='This scene is no longer in the active production. Reopen Scenes from Scenic.';}catch{status.textContent='Scenic could not switch scenes. Try reopening the scene browser.';}};
  }
  grid.scrollTop=scroll;
 }
 window.ScenicSceneBrowserWindow={render};
 window.addEventListener('message',event=>{if(event.source!==window.opener||event.origin!==location.origin||event.data?.channel!=='scenic-scene-browser')return;if(event.data.snapshot)render(event.data.snapshot);else{const p=pending.get(event.data.id);if(p){pending.delete(event.data.id);event.data.error?p.reject(Error(event.data.error)):p.resolve(event.data.result);}}});
 window.addEventListener('pagehide',()=>{if(!window.ScenicDesktop&&window.opener)window.opener.postMessage({channel:'scenic-scene-browser',action:'sceneBrowserClosed'},location.origin==='null'?'*':location.origin);});
 request('sceneBrowserReady').then(render).catch(()=>{status.textContent='Open this window using the four-pane button beside Scenes in Scenic.';});
})();
