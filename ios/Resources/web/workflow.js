/* Workspace, library, movement, and architectural controls. */
let workspace=ScenicModel.workspaceFrom(doc,uid()),playback=null,contextScene=null,libraryQuery='',pendingDelete=null;
doc=workspace.projects[0];
function workspaceData(){doc.editorSettings={grid,snap,simulation};const index=workspace.projects.findIndex(p=>p.projectId===doc.projectId);if(index>=0)workspace.projects[index]=doc;workspace.activeProject=doc.projectId;return workspace;}
function loadWorkspace(data){workspace=ScenicModel.workspaceFrom(data,uid());doc=workspace.projects.find(p=>p.projectId===workspace.activeProject);applyEditorSettings();selected=null;selectedIds.clear();wallMultiSelect=false;stopPlayback();wallStart=null;images.clear();}
function applyEditorSettings(){if(doc.editorSettings){({grid,snap,simulation}=doc.editorSettings);$('simulation').checked=simulation;$('snap').checked=snap;$('canvas-mode').textContent=simulation?'LIGHTING PREVIEW':'SCENE LAYOUT';}}
function blankScene(){return {id:uid(),title:'UNTITLED SCENE',subtitle:'New scene',notes:'',ambient:30,objects:[]};}
function newProject(){snapshot();const first=blankScene();const p={version:1,projectId:uid(),name:'Untitled production',theme:doc.theme,active:first.id,scenes:[first]};workspaceData().projects.push(p);doc=p;selected=null;selectedIds.clear();wallMultiSelect=false;stopPlayback();setTool('select');showShots(false);fit();commit();$('project-name').focus();$('project-name').select();}
function renderProjects(){
 const select=$('production-select');select.innerHTML=workspaceData().projects.map(p=>`<option value="${esc(p.projectId)}">${esc(p.name)} · ${p.scenes.length} ${p.scenes.length===1?'scene':'scenes'}</option>`).join('');select.value=doc.projectId;
 select.onchange=()=>{workspaceData();const next=workspace.projects.find(p=>p.projectId===select.value);if(!next||next===doc)return;doc=next;applyEditorSettings();selected=null;selectedIds.clear();wallMultiSelect=false;stopPlayback();setTool('select');showShots(false);applyTheme();fit();commit();};
}
function deleteScene(id){const target=doc.scenes.find(s=>s.id===id);if(!target)return;snapshot();doc.scenes=doc.scenes.filter(s=>s.id!==id);if(!doc.scenes.length)doc.scenes.push(blankScene());if(doc.active===id)doc.active=doc.scenes[0].id;selected=null;selectedIds.clear();wallMultiSelect=false;stopPlayback();hideContextMenu();setTool('select');fit();commit();toast('Scene deleted · Undo to restore');}
function renderScenes(){
 $('scenes').innerHTML=doc.scenes.map((s,i)=>`<button class="scene-row ${s.id===doc.active?'active':''}" data-scene="${s.id}" title="Right-click for scene actions"><span class="scene-icon">${String(i+1).padStart(2,'0')}</span><span><strong>${esc(s.subtitle||s.title.replace(/^(INT\.|EXT\.)\s*/,'').split('—')[0].trim())}</strong><small>${s.shotList?.length?`${ScenicShotList.coverage(s).checked}/${ScenicShotList.coverage(s).total} checked · ${s.objects.filter(o=>o.type==='camera').length} cameras`:`${s.objects.filter(o=>o.type==='camera').length} shots · ${s.objects.filter(o=>o.type==='light').length} lights`}</small></span><span class="scene-more">›</span></button>`).join('');
 document.querySelectorAll('[data-scene]').forEach(b=>{b.onclick=()=>activateScene(b.dataset.scene);b.oncontextmenu=e=>{e.preventDefault();contextScene=b.dataset.scene;const menu=$('scene-context');menu.hidden=false;menu.style.left=Math.min(e.clientX,innerWidth-190)+'px';menu.style.top=Math.min(e.clientY,innerHeight-60)+'px';$('context-delete-scene').focus();};b.onkeydown=e=>{if(e.key==='ContextMenu'||e.shiftKey&&e.key==='F10'){e.preventDefault();const r=b.getBoundingClientRect();b.oncontextmenu({preventDefault(){},clientX:r.right,clientY:r.top});}};});
}
function activateScene(id){if(!doc.scenes.some(s=>s.id===id))return false;doc.active=id;selected=null;selectedIds.clear();wallMultiSelect=false;stopPlayback();setTool('select');showShots(false);fit();commit();return true;}
function hideContextMenu(){$('scene-context').hidden=true;contextScene=null;}
function askDeleteProject(){pendingDelete=doc.projectId;$('delete-production-name').textContent=doc.name;$('delete-production-detail').textContent=`This removes all ${doc.scenes.length} scenes in this production. You can undo this until Scenic closes.`;$('settings').close();$('delete-production').showModal();}
function deleteProject(){if(pendingDelete!==doc.projectId)return;snapshot();workspaceData();workspace.projects=workspace.projects.filter(p=>p.projectId!==pendingDelete);if(!workspace.projects.length){const first=blankScene();workspace.projects.push({version:1,projectId:uid(),name:'Untitled production',theme:doc.theme,active:first.id,scenes:[first]});}doc=workspace.projects[0];pendingDelete=null;selected=null;selectedIds.clear();wallMultiSelect=false;stopPlayback();$('delete-production').close();setTool('select');applyTheme();fit();commit();toast('Production deleted · Undo to restore');}
const normalizeLibrarySearch=text=>String(text).toLowerCase().replace(/[’']/g,'');
function renderLibrary(mode=libraryMode){
 if(!['walls','props','set','lights'].includes(mode))mode=null;
 const previousMode=libraryMode;libraryMode=mode;const panel=$('library'),oldScroll=panel.scrollTop,query=normalizeLibrarySearch(libraryQuery.trim()),browsing=!!mode||!!query,showFloor=mode==='walls'&&!query||!!query&&normalizeLibrarySearch('floor tile road carpet').includes(query);
 panel.classList.toggle('catalog-menu',browsing);
 $('library-heading').innerHTML=mode?`<button id="library-back" class="library-back" aria-label="Back to Build your scene">←</button><h2>${({walls:'Walls/Floor',props:'Props',set:'Set',lights:'Lights',gear:'Gear'})[mode]}</h2><span class="tiny">CLICK OR DRAG</span>`:'<h2>Build your scene</h2><span class="tiny">CLICK OR DRAG</span>';
 if(!browsing){panel.innerHTML=[['camera','Camera'],['actor','Talent']].map(([n,label])=>`<button data-tool="${n}" aria-label="Place ${label}">${svg(n)}<span>${label}</span></button>`).join('')+[['walls','Walls/Floor','room-square'],['props','Props','laptop'],['set','Set','sofa'],['lights','Lights','led-panel']].map(([category,label,asset])=>`<button data-category="${category}" aria-label="Open ${label} library">${assetIcon(ScenicCatalog.get(asset))}<span>${label} <b>↗</b></span></button>`).join('');
 }else{
  const items=ScenicCatalog.items.filter(i=>i.category!=='gear').filter(i=>query?normalizeLibrarySearch(`${i.name} ${i.group==='Doors & windows'?'':i.group} ${i.category}`).includes(query):i.category===mode),groups=[...new Set(items.map(i=>query?({walls:'Walls/Floor',props:'Props',set:'Set',lights:'Lights',gear:'Gear'})[i.category]+' · '+i.group:i.group))];
  panel.innerHTML=`<div class="catalog-tabs">${['walls','props','set','lights'].map(c=>`<button data-category="${c}" aria-pressed="${mode===c}">${({walls:'Walls/Floor',props:'Props',set:'Set',lights:'Lights',gear:'Gear'})[c]}</button>`).join('')}</div><p class="catalog-hint">${query?`${items.length+Number(showFloor)} ${items.length+Number(showFloor)===1?'result':'results'} across Walls/Floor, Props, Set & Lights.`:mode==='walls'?'Place a floor tile or room, then drag its handles to resize.':'Choose an item, then click the map.'}</p>`+(mode==='walls'&&!query?`<button class="draw-wall" data-tool="wall">${svg('wall')}<span>Draw a straight wall</span><small>Click a start and end point · W</small></button>`:'')+(showFloor?`<button class="draw-wall" data-tool="floor">${svg('floor')}<span>Floor tile</span><small>Scalable color or image · always beneath other objects</small></button>`:'')+groups.map(group=>`<section class="catalog-group"><h3>${esc(group)}</h3><div class="catalog-grid">${items.filter(i=>(query?({walls:'Walls/Floor',props:'Props',set:'Set',lights:'Lights',gear:'Gear'})[i.category]+' · '+i.group:i.group)===group).map(i=>{const unavailable=i.id==='sun'&&scene().objects.some(o=>o.kind==='sun');return `<button data-asset="${i.id}" aria-label="Place ${i.name}" ${unavailable?'disabled':''}>${assetIcon(i)}<span>${i.name}</span><small>${i.id==='sun'?unavailable?'Already in this scene':'One per scene · time of day':i.category==='lights'?'Lighting preset':formatLength(i.width)+' × '+formatLength(i.height)}</small></button>`;}).join('')}</div></section>`).join('')+(items.length||showFloor?'':'<p class="catalog-empty">No items found. Try “door”, “lamp”, or “laptop”.</p>');
 }
 panel.querySelectorAll('[data-tool]').forEach(b=>b.onclick=()=>{showShots(false);setTool(b.dataset.tool);});
 panel.querySelectorAll('[data-asset]').forEach(b=>b.onclick=()=>{showShots(false);setTool('asset:'+b.dataset.asset);});
 panel.querySelectorAll('[data-category]').forEach(b=>b.onclick=()=>{setTool('select',{keepLibrary:true});renderLibrary(b.dataset.category);});
 if($('library-back'))$('library-back').onclick=()=>{libraryQuery='';$('library-search').value='';renderLibrary(null);setTool('select',{keepLibrary:true});};
 panel.scrollTop=previousMode===mode?oldScroll:0;
}
function toggleField(label,prop,value){return `<label class="toggle-label">${label}<input aria-label="${label}" data-prop="${prop}" type="checkbox" ${value?'checked':''}></label>`;}
function openingInspector(o){const kind=ScenicModel.openingKind(o);return `<div class="section-label">${kind==='door'?'DOOR':'WINDOW'} PLACEMENT</div><p class="empty-hint">${o.wallId?'Attached to wall. Moves with the wall.':'Drag near a wall to snap into place.'}</p><button id="snap-opening" class="text-button">Snap to nearest wall</button><div class="field-row">${lengthField('Opening width','width',o.width,9,5000)}</div>${kind==='door'?toggleField('Door open','open',o.open)+selectField('Hinge side','hinge',o.hinge||'Left',['Left','Right'])+selectField('Opens toward','swingSide',o.swingSide||'Side A',['Side A','Side B'])+'<p class="empty-hint">The swing arc shows Side A. Choose Side B to reverse the opening direction.</p>':toggleField('Curtains closed','curtains',o.curtains)+'<p class="empty-hint">Uncovered windows admit light. Closed curtains block the opening.</p>'}`;}
function timeLabel(hour){let minutes=Math.round(hour*60),h=Math.floor(minutes/60)%24,m=minutes%60;return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;}
function localShootDate(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
function solarReadout(o){
 const state=ScenicModel.sunState(o);if(state.error)return state.error;
 let text=`${timeLabel(o.time)} · ${state.azimuth.toFixed(1)}° bearing · ${state.altitude.toFixed(1)}° elevation`;
 if(!state.daylight)text+=' · Sun below horizon';
 if(o.solarReal){const offset=`UTC${state.offset>=0?'+':''}${state.offset}`;text+=`\n${o.shootDate} · ${o.timeZone} (${offset})`;
  text+=state.events.polar?'\n'+state.events.polar:`\nSunrise ${state.events.sunrise.join(', ')||'—'} · Sunset ${state.events.sunset.join(', ')||'—'}`;
  if(state.ambiguous)text+=`\nRepeated local time · ${(o.dstOccurrence||'Earlier').toLowerCase()} occurrence`;
 }return text;
}
function sunInspector(o){
 const geographic=o.solarReal;
 return `${toggleField('Sun enabled','enabled',o.enabled)}${toggleField('Use shoot location & date','solarReal',geographic)}${range('Preview brightness','power',o.power,0,100,'%')}
 ${geographic?`<div class="section-label">SHOOT LOCATION</div><div class="field-row">${input('Latitude · N + / S −','latitude',o.latitude??'','number','min="-90" max="90" step="0.000001" data-nullable="true" placeholder="40.7128"')}${input('Longitude · E + / W −','longitude',o.longitude??'','number','min="-180" max="180" step="0.000001" data-nullable="true" placeholder="-74.0060"')}</div>
 ${input('Shoot date','shootDate',o.shootDate||'','date','min="1900-01-01" max="2100-12-31"')}${input('Shoot time zone','timeZone',o.timeZone||'','text','list="solar-zones" placeholder="America/New_York" spellcheck="false"')}<datalist id="solar-zones">${['America/New_York','America/Chicago','America/Denver','America/Los_Angeles','America/Phoenix','Europe/London','Europe/Paris','Asia/Kolkata','Asia/Tokyo','Australia/Sydney','Pacific/Auckland','UTC'].map(z=>`<option value="${z}"></option>`).join('')}</datalist>
 ${input('Local shoot time','time',timeLabel(o.time),'time','step="60" data-clock="true"')}${range('Time of day','time',o.time,0,23+59/60,'time')}${selectField('If local time repeats','dstOccurrence',o.dstOccurrence||'Earlier',['Earlier','Later'])}${range('True north · clockwise from map up','northAngle',o.northAngle||0,0,360,'°')}<p class="empty-hint">North: 0° = map up, 90° = map right. Align this with your location plan or imported image. Bearings use true north.</p>`:
 `${range('Time of day','time',o.time,0,24,'time')}<div class="field-row">${input('Sunrise · hour','sunrise',o.sunrise,'number','min="0" max="23.75" step="0.25"')}${input('Sunset · hour','sunset',o.sunset,'number','min="0.25" max="24" step="0.25"')}</div>${range('Rises from · compass','riseDirection',o.riseDirection,0,360,'°')}${range('Sets toward · compass','setDirection',o.setDirection,0,360,'°')}`}
 <p class="sun-readout" aria-live="polite">${esc(solarReadout(o))}</p>${geographic?'':'<p class="empty-hint">Manual sun study. Enable shoot location & date for geographic sun calculations.</p>'}`;
}

function movementInspector(o){const marks=o.marks||[],next=ScenicModel.markLabel(marks.length);return `<div class="section-label">MOVEMENT · A → B → C</div><p class="empty-hint">Record A, move the object, then record B. Each recorded position stays on the map.</p><div class="movement-list">${marks.map((m,i)=>`<div class="movement-row"><button data-go-mark="${i}" aria-label="Go to position ${ScenicModel.markLabel(i)}"><b>${ScenicModel.markLabel(i)}</b><span>${formatLength(m.x)}, ${formatLength(m.y)}</span></button><button data-remove-mark="${i}" aria-label="Remove position ${ScenicModel.markLabel(i)}">×</button><input data-mark-note="${i}" aria-label="Position ${ScenicModel.markLabel(i)} notes" value="${esc(m.notes||'')}" placeholder="Action or movement notes"></div>`).join('')}</div><div class="property-actions"><button id="record-mark" ${marks.length>=100?'disabled':''}>Record ${next}</button><button id="place-mark" ${marks.length>=100?'disabled':''}>Place ${next} on map</button></div>${marks.length?toggleField('Show movement path','showRoute',o.showRoute!==false):''}${marks.length>1?`${range('Preview duration','pathDuration',o.pathDuration||5,1,60,' s')}<button id="play-path" class="movement-play">${playback?.id===o.id?'Stop preview':'▶ Preview movement'}</button>`:''}`;}
function recordMark(o,p=o){if(!ScenicModel.movable(o)||(o.marks||[]).length>=100)return;snapshot();o.marks=o.marks||[];o.marks.push({x:p.x,y:p.y,rotation:o.rotation||0,notes:''});o.x=p.x;o.y=p.y;o.showRoute=true;stopPlayback();setTool('select');commit();}
function breakRoom(){
 const room=object();if(room?.type!=='room')return;
 const result=ScenicModel.splitRoom(scene().objects,room.id,uid);
 if(!result){toast('This room cannot be separated within the scene’s size or item limits.');return;}
 snapshot();scene().objects=result.objects;choose(result.walls[0].id);setTool('select');commit();
 toast(`Room separated into ${result.walls.length} walls · Undo to restore`);
}
function bindExtraInspector(){const o=object();if(!o)return;
 bindCameraShot();
 if(o.type==='floor'){
  $('upload-floor-image').onclick=()=>{floorImageTarget=o;$('floor-image-input').value='';$('floor-image-input').click();};
  if(o.src)$('remove-floor-image').onclick=()=>{floorImageRequest++;snapshot();delete o.src;commit();};
 }
 if(o.type==='wall'&&$('select-multiple-walls'))$('select-multiple-walls').onclick=beginWallSelection;
 if(o.type==='wallGroup'&&$('ungroup-walls'))$('ungroup-walls').onclick=ungroupSelectedWalls;
 if(o.type==='room'&&$('break-room'))$('break-room').onclick=breakRoom;
 if($('snap-opening'))$('snap-opening').onclick=()=>{snapshot();if(!ScenicModel.snapOpening(o,scene().objects,Infinity))toast('Draw a wall at least as wide as this opening first');commit();};
 if($('record-mark'))$('record-mark').onclick=()=>recordMark(o);
 if($('place-mark'))$('place-mark').onclick=()=>{setTool('mark:'+o.id);toast('Click the map for position '+ScenicModel.markLabel((o.marks||[]).length));};
 document.querySelectorAll('[data-go-mark]').forEach(b=>b.onclick=()=>{snapshot();const m=o.marks[+b.dataset.goMark];Object.assign(o,{x:m.x,y:m.y,rotation:m.rotation});stopPlayback();setTool('select');commit();});
 document.querySelectorAll('[data-remove-mark]').forEach(b=>b.onclick=()=>{snapshot();o.marks.splice(+b.dataset.removeMark,1);stopPlayback();commit();});
 document.querySelectorAll('[data-mark-note]').forEach(el=>{let recorded=false;el.onfocus=()=>recorded=false;el.oninput=()=>{if(!recorded){snapshot();recorded=true;}o.marks[+el.dataset.markNote].notes=el.value;save();};});
 if($('play-path'))$('play-path').onclick=()=>{if(playback?.id===o.id)stopPlayback();else{showShots(false);playback={id:o.id,start:performance.now(),duration:(o.pathDuration||5)*1000};}renderInspector();invalidate();};
}
function afterObjectChange(o,prop,previous){if(!o)return;stopPlayback();
 if(o.type==='camera'&&['lens','sensorWidth','viewDistance'].includes(prop)){
  o.fov=ScenicModel.cameraView(o).fov;
  const readout=document.querySelector('.camera-view-readout');if(readout)readout.textContent=cameraViewReadout(o);
 }

 if(o.type==='wallGroup'&&previous&&['x','y','width','height','rotation'].includes(prop)){updateWallGroupProperty(o,previous);return;}
 if(ScenicModel.openingKind(o)){
  if(['x','y','rotation'].includes(prop))ScenicModel.snapOpening(o,scene().objects,Math.max(36,18/view.z));
  ScenicModel.syncOpenings(scene().objects);
 }
 if(o.type==='room'){if(prop==='keepProportions')roomAspectRatio=o.width/o.height;if(o.keepProportions&&['width','height'].includes(prop)){const previous=roomAspectRatio||1;if(prop==='width')o.height=o.width/previous;else o.width=o.height*previous;const factor=Math.min(1,5000/o.width,5000/o.height);o.width*=factor;o.height*=factor;}ScenicModel.syncOpenings(scene().objects);updateTransformReadout(o);}
 if(o.type==='image'){
  if(prop==='keepProportions')imageAspectRatio=o.width/o.height;
  if(o.keepProportions!==false&&['width','height'].includes(prop)){
   if(prop==='width')o.height=o.width/imageAspectRatio;else o.width=o.height*imageAspectRatio;
   const factor=Math.min(1,5000/o.width,5000/o.height);o.width*=factor;o.height*=factor;
   const grow=Math.max(1,1.5/o.width,1.5/o.height);o.width*=grow;o.height*=grow;
  }updateTransformReadout(o);
 }
 if(o.type==='wall')ScenicModel.syncOpenings(scene().objects);
 updateRGB(o,prop);
 if(o.kind==='sun'){
  o.sunrise=Math.min(o.sunrise,o.sunset-.25);o.sunset=Math.max(o.sunset,o.sunrise+.25);
  if(prop==='solarReal'){
   if(o.solarReal){o.shootDate=o.shootDate||localShootDate();o.timeZone=o.timeZone||Intl.DateTimeFormat().resolvedOptions().timeZone;o.latitude=o.latitude??null;o.longitude=o.longitude??null;o.northAngle=o.northAngle||0;o.dstOccurrence=o.dstOccurrence||'Earlier';o.time=Math.min(o.time,23+59/60);}renderInspector();
  }
  const r=document.querySelector('.sun-readout');if(r)r.textContent=solarReadout(o);
  if(prop==='time')for(const field of document.querySelectorAll('[data-prop="time"]'))field.value=field.dataset.clock?timeLabel(o.time):o.time;
 }
}
function displayObject(o){if(!playback||!o.marks?.length)return o;if(playback.mode!=='scene'&&playback.id!==o.id)return o;if(playback.mode==='scene'&&o.marks.length<2)return o;return {...o,...ScenicModel.motionPose(o,ScenicModel.playbackElapsed(playback,performance.now()))};}
function setupWorkflow(){
 setupControls();
 setupShotImport();
 $('new-project').onclick=newProject;$('library-search').oninput=e=>{libraryQuery=e.target.value;renderLibrary();$('library').scrollTop=0;};
 $('context-delete-scene').onclick=()=>deleteScene(contextScene);document.addEventListener('pointerdown',e=>{if(!e.target.closest('#scene-context'))hideContextMenu();});window.addEventListener('keydown',e=>{if(e.key==='Escape')hideContextMenu();});
 const openSettings=()=>{$('settings-theme').value=doc.theme;$('settings').showModal();};$('settings-button').onclick=openSettings;$('close-settings').onclick=()=>$('settings').close();
 $('report-bug').onclick=async()=>{try{if(window.ScenicDesktop)await window.ScenicDesktop.request('reportBug');else window.location.href='mailto:alexanderhosier@squidproductions.org?subject=Scenic%20bug%20report';}catch{toast('Could not open email. Contact alexanderhosier@squidproductions.org.');}};
 $('settings-theme').onchange=e=>{doc.theme=e.target.value;applyTheme();save();};$('settings-guide').onclick=()=>{$('settings').close();$('guide').showModal();};$('delete-project').onclick=askDeleteProject;$('cancel-delete-production').onclick=()=>$('delete-production').close();$('confirm-delete-production').onclick=deleteProject;
 for(const side of ['left','right']){
  const handle=$(side+'-resizer'),key='scenic-'+side+'-width';let start=null;
  const limit=()=>{const other=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--'+(side==='left'?'right':'left')+'-width'))||(side==='left'?268:230);return Math.max(side==='left'?190:220,Math.min(side==='left'?560:430,innerWidth-other-282));};
  const setWidth=width=>{const value=Math.max(side==='left'?190:220,Math.min(limit(),width));document.documentElement.style.setProperty('--'+side+'-width',value+'px');handle.setAttribute('aria-valuenow',value);localStorage.setItem(key,value);};
  const stored=Number(localStorage.getItem(key));if(stored)setWidth(stored);window.addEventListener('resize',()=>{if(innerWidth>900)setWidth(parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--'+side+'-width'))||(side==='left'?230:268));});
  handle.onpointerdown=e=>{start={x:e.clientX,width:(side==='left'?document.querySelector('.sidebar'):document.querySelector('.inspector')).getBoundingClientRect().width};handle.setPointerCapture(e.pointerId);document.body.classList.add('resizing');};
  handle.onpointermove=e=>{if(start)setWidth(start.width+(e.clientX-start.x)*(side==='left'?1:-1));};
  handle.onpointerup=handle.onpointercancel=()=>{start=null;document.body.classList.remove('resizing');};
  handle.onkeydown=e=>{if(['ArrowLeft','ArrowRight','Home'].includes(e.key)){e.preventDefault();e.stopPropagation();const width=(side==='left'?document.querySelector('.sidebar'):document.querySelector('.inspector')).getBoundingClientRect().width;setWidth(e.key==='Home'?(side==='left'?230:268):width+(e.key==='ArrowRight'?24:-24)*(side==='left'?1:-1));}};
 }
}
let pendingShotImport=null;
function shotImportPlan(){const p=pendingShotImport;return ScenicShotList.planImport(doc,p.scenes,p.selected,p.targets);}
function updateShotImportSummary(){
 const pending=pendingShotImport;if(!pending)return;
 const plan=shotImportPlan(),count=plan.entries.filter(e=>e.selected).reduce((n,e)=>n+e.source.shotList.length,0);
 $('shot-import-summary').textContent=`${plan.selectedCount} selected ${plan.selectedCount===1?'scene':'scenes'} · ${count} ${count===1?'shot':'shots'} from ${pending.filename} into “${doc.name}”.`;
 $('shot-import-changes').textContent=`${plan.newScenes} new ${plan.newScenes===1?'scene':'scenes'} · ${plan.updatedScenes} existing ${plan.updatedScenes===1?'scene':'scenes'} to update · ${plan.updatedShots} ${plan.updatedShots===1?'shot':'shots'} to update · ${plan.newShots} ${plan.newShots===1?'shot':'shots'} to add · ${plan.retainedShots} previous ${plan.retainedShots===1?'shot':'shots'} to keep`;
 $('shot-import-error').textContent=!plan.selectedCount?'Select at least one scene to import.':plan.errors.join(' ');
 $('confirm-shot-import').disabled=!plan.selectedCount||plan.errors.length>0;
}
function renderShotImport(){
 const plan=shotImportPlan();
 $('shot-import-preview').innerHTML=plan.entries.map(({source,matches,target,selected})=>`<div class="shot-import-row"><label class="shot-import-choice"><input type="checkbox" data-import-scene="${esc(source.id)}" ${selected?'checked':''}><span><strong>${esc(source.title)}</strong><small>${source.shotList.length} incoming ${source.shotList.length===1?'shot':'shots'} · ${matches.length?'Update existing scene':'New blank scene'}</small></span></label>${matches.length>1?`<label class="shot-import-target">Scene to update<select data-import-target="${esc(source.id)}" aria-label="Scene to update for ${esc(source.title)}"><option value="">Choose existing scene…</option>${matches.map(s=>`<option value="${esc(s.id)}" ${target?.id===s.id?'selected':''}>${esc(s.title)} · ${s.objects.filter(o=>o.type==='camera').length} cameras</option>`).join('')}</select></label>`:target?`<span class="shot-import-destination">${esc(target.title)}</span>`:''}</div>`).join('');
 document.querySelectorAll('[data-import-scene]').forEach(el=>el.onchange=()=>{if(el.checked)pendingShotImport.selected.add(el.dataset.importScene);else pendingShotImport.selected.delete(el.dataset.importScene);updateShotImportSummary();});
 document.querySelectorAll('[data-import-target]').forEach(el=>el.onchange=()=>{pendingShotImport.targets[el.dataset.importTarget]=el.value;updateShotImportSummary();});
 updateShotImportSummary();
}
function setupShotImport(){
 $('import-shot-list').onclick=()=>$('shot-list-input').click();
 $('shot-list-input').onchange=async e=>{
  const file=e.target.files[0];if(!file)return;
  try{
   if(file.size>10*1024*1024)throw Error('Choose a shot list smaller than 10 MB.');
   const scenes=ScenicShotList.importCSV(await file.text(),uid);
   pendingShotImport={projectId:doc.projectId,filename:file.name,scenes,selected:new Set(scenes.map(s=>s.id)),targets:{}};
   renderShotImport();$('shot-import').showModal();
  }catch(error){pendingShotImport=null;toast(error.message||'Could not read this shot list.');}
  finally{e.target.value='';}
 };
 for(const [id,select] of [['shot-import-all',true],['shot-import-none',false]])$(id).onclick=()=>{
  if(!pendingShotImport)return;
  pendingShotImport.selected=new Set(select?pendingShotImport.scenes.map(s=>s.id):[]);
  document.querySelectorAll('[data-import-scene]').forEach(el=>{el.checked=select;});updateShotImportSummary();
 };
 $('cancel-shot-import').onclick=()=>{$('shot-import').close();pendingShotImport=null;};
 $('shot-import').addEventListener('close',()=>{pendingShotImport=null;});
 $('confirm-shot-import').onclick=()=>{
  const pending=pendingShotImport;if(!pending)return;
  if(doc.projectId!==pending.projectId){toast('The production changed. Import the shot list again.');$('shot-import').close();return;}
  try{
   const merged=ScenicShotList.mergeImport(doc,pending.scenes,pending.selected,pending.targets);
   snapshot();doc.scenes=merged.scenes;doc.active=merged.active;selected=null;selectedIds.clear();wallMultiSelect=false;stopPlayback();setTool('select');showShots(false);fit();commit();$('shot-import').close();pendingShotImport=null;
   toast(`Shot list imported · ${merged.plan.newScenes} ${merged.plan.newScenes===1?'scene':'scenes'} added · ${merged.plan.updatedScenes} ${merged.plan.updatedScenes===1?'scene':'scenes'} updated`);
  }catch(error){$('shot-import-error').textContent=error.message;$('confirm-shot-import').disabled=true;}
 };
}
function shotDetails(shot){return `<dl class="source-shot-details">${ScenicShotList.columns.filter(([,key])=>typeof shot[key]==='string'&&shot[key]!=='').map(([label,key])=>`<div><dt>${esc(label)}</dt><dd>${esc(shot[key])}</dd></div>`).join('')}</dl>`;}
function cameraShotInspector(camera){
 const shots=scene().shotList||[];if(!shots.length)return '<p class="empty-hint">Import a Production Desk shot list CSV to link this camera to planned coverage.</p>';
 const shot=shots.find(s=>s.id===camera.shotId);
 return `<div class="section-label">PRODUCTION DESK SHOT</div><label class="field">Link to shot<select id="camera-shot-link"><option value="">Unlinked camera</option>${shots.map(s=>`<option value="${esc(s.id)}" ${s.id===camera.shotId?'selected':''}>${esc(s.number+' · '+(s.description||s.size||'Shot')+(s.status.toLowerCase()==='omitted'?' · Omitted':''))}</option>`).join('')}</select></label><p class="empty-hint">Linking applies the shot’s supported lens and framing. Original details stay below; your map position and notes stay yours.</p>${shot?`<label class="toggle-label">Coverage checked<input id="camera-shot-checked" type="checkbox" ${shot.checked?'checked':''}></label><details class="source-shot"><summary>Original shot ${esc(shot.number)} · ${esc(shot.camera?'Camera '+shot.camera:'Camera details')}</summary>${shotDetails(shot)}</details>`:''}`;
}
function bindCameraShot(){
 const camera=object();if(camera?.type!=='camera')return;
 if($('camera-shot-link'))$('camera-shot-link').onchange=e=>{
  const shot=(scene().shotList||[]).find(s=>s.id===e.target.value);snapshot();ScenicShotList.linkCamera(camera,shot);camera.fov=ScenicModel.cameraView(camera).fov;commit();
 };
 if($('camera-shot-checked'))$('camera-shot-checked').onchange=e=>{const shot=scene().shotList?.find(s=>s.id===camera.shotId);if(!shot)return;snapshot();shot.checked=e.target.checked;commit();};
}
function renderShots(){
 const current=scene(),shots=current.shotList||[];
 if(!shots.length){renderCameraSetups();return;}
 const stats=ScenicShotList.coverage(current),cams=current.objects.filter(o=>o.type==='camera');
 $('shot-list-heading').innerHTML=`<h2>Plan every angle.</h2><p>${esc(current.title)} · ${shots.length} imported shots · ${cams.length} camera setups</p>`;$('shot-list-content').innerHTML=`<div class="coverage-summary" role="status"><strong>${stats.checked} / ${stats.total} coverage checked</strong><span>${stats.linked} linked to cameras · ${stats.total-stats.linked} need a camera</span><progress aria-label="Shot coverage checked" max="${stats.total||1}" value="${stats.checked}"></progress></div><p class="empty-hint">Place a camera on the scene map, then select it and choose Link to shot in Properties. Check coverage as you verify each setup. Omitted shots are excluded from the totals; Production Desk status stays as imported.</p><div class="imported-shots">${shots.map(shot=>{
  const linked=ScenicShotList.linkedCameras(current,shot);
  return `<article class="imported-shot ${shot.checked?'coverage-checked':''}"><div class="imported-shot-heading"><label class="shot-coverage-check"><input type="checkbox" data-shot-checked="${esc(shot.id)}" aria-label="Coverage checked for shot ${esc(shot.number)}" ${shot.checked?'checked':''}><strong>${esc(shot.number)}</strong></label><span class="shot-source-status">${esc(shot.status||'Planned')} · ${esc(shot.priority||'No priority')}</span></div><h3>${esc(shot.description||'Untitled shot')}</h3><p class="shot-source-specs">${esc([shot.size,shot.camera&&'Camera '+shot.camera,shot.lens&&shot.lens+' mm',shot.movement,shot.equipment].filter(Boolean).join(' · '))}</p><div class="shot-linked-cameras">${linked.length?linked.map(c=>`<button data-edit-camera="${esc(c.id)}">${esc(c.name)} ↗</button>`).join(''):'<span class="missing-camera">No camera linked</span>'}</div><details class="source-shot"><summary>All original shot details</summary>${shotDetails(shot)}</details></article>`;
 }).join('')}</div>${cams.some(c=>!c.shotId)?`<div class="section-label">UNLINKED CAMERA SETUPS</div><div class="shot-linked-cameras">${cams.filter(c=>!c.shotId).map(c=>`<button data-edit-camera="${esc(c.id)}">${esc(c.name)} · Link in Properties ↗</button>`).join('')}</div>`:''}`;
 document.querySelectorAll('[data-edit-camera]').forEach(b=>b.onclick=()=>{showShots(false);choose(b.dataset.editCamera);});
 document.querySelectorAll('[data-shot-checked]').forEach(el=>el.onchange=()=>{const shot=shots.find(s=>s.id===el.dataset.shotChecked);if(!shot)return;snapshot();shot.checked=el.checked;commit();});
 $('export-shots').onclick=()=>download(new Blob([ScenicShotList.exportCSV(current)],{type:'text/csv;charset=utf-8'}),'scenic-shot-list.csv');
}
init();
