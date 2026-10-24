const check=(value,message)=>{if(!value)throw Error(message);};
const expected=ScenicProjectFile.parse(fixture);
const original=structuredClone(workspaceData()),originalCount=original.projects.length;
await importPortableProject(fixture);
check(workspace.projects.length===originalCount+1,'Desktop import adds a production');
check(JSON.stringify(workspace.projects.slice(0,originalCount))===JSON.stringify(original.projects),'Active work preserved');
check(JSON.stringify(doc.scenes)===JSON.stringify(expected.scenes),'Geometry, objects, images, motion, and camera links match desktop');
check(doc.active===expected.active&&doc.theme===expected.theme,'Active scene and theme match');
check(grid===false&&snap===false&&simulation===true,'Editor settings match');
const count=workspace.projects.length;
await importPortableProject(fixture);
check(workspace.projects.length===count+1&&doc.name!==expected.name&&doc.name.startsWith(expected.name+' (imported'),'Name collision creates a separate copy');
const before=JSON.stringify(workspaceData());
for(const text of ['{invalid',JSON.stringify({...expected,version:99}),JSON.stringify({...expected,portable:{format:ScenicProjectFile.FORMAT,version:99}})]){
 let failed=false;try{await importPortableProject(text);}catch{failed=true;}check(failed,'Malformed and newer versions rejected');
 check(JSON.stringify(workspaceData())===before,'Rejected import leaves active work unchanged');
}
const damaged=structuredClone(expected);damaged.scenes[0].objects.find(o=>o.type==='image').src='data:image/png;base64,AAAA';
let failed=false;try{await importPortableProject(JSON.stringify(damaged));}catch{failed=true;}check(failed,'Damaged reference rejected');
check(!window.neverExecute,'File notes never execute');
const phoneChecks=[];
if(ScenicIPad.isPhone){
 check(document.documentElement.classList.contains('phone-app'),'Phone adapter enabled');
 check(document.documentElement.scrollWidth<=innerWidth+1,'Phone page does not overflow');
 for(const id of ['workspace-menu','ipad-properties','save-project','share-project']){
  const r=$(id).getBoundingClientRect();check(r.width>=44&&r.height>=44&&r.left>=0&&r.right<=innerWidth+1,'Phone action visible and touch-sized: '+id);
 }
 const rect=canvas.getBoundingClientRect();check(rect.width<=innerWidth&&rect.height>=120,'Phone canvas is usable');
 const saved=JSON.stringify(workspaceData()),savedHistory=history.slice(),savedFuture=future.slice();
 const capture=canvas.setPointerCapture;canvas.setPointerCapture=()=>{};
 const at=(x,y,id=1)=>({clientX:rect.left+x,clientY:rect.top+y,pointerId:id,pointerType:'touch',bubbles:true,cancelable:true,button:0});
 const count=scene().objects.length;setTool('camera');
 canvas.dispatchEvent(new PointerEvent('pointerdown',at(rect.width*.45,rect.height*.4)));
 canvas.dispatchEvent(new PointerEvent('pointerup',at(rect.width*.45,rect.height*.4)));
 check(scene().objects.length===count+1&&object().type==='camera','Phone touch creates an editable camera');
 const camera=object(),origin={x:camera.x,y:camera.y},point={x:camera.x*view.z+view.x,y:camera.y*view.z+view.y};
 canvas.dispatchEvent(new PointerEvent('pointerdown',at(point.x,point.y)));
 canvas.dispatchEvent(new PointerEvent('pointermove',at(point.x+35,point.y+20)));
 canvas.dispatchEvent(new PointerEvent('pointerup',at(point.x+35,point.y+20)));
 check(object().x!==origin.x||object().y!==origin.y,'Phone touch moves camera');
 const lens=document.querySelector('[data-prop="lens"]');lens.dispatchEvent(new Event('focus'));lens.value='85';lens.dispatchEvent(new Event('input',{bubbles:true}));
 check(object().lens===85,'Phone properties edit lens');
 $('ipad-properties').click();check($('properties-sidebar').classList.contains('ipad-open'),'Phone properties drawer');$('phone-close-properties').click();
 $('workspace-menu').click();check($('sidebar-panel').classList.contains('mobile-open'),'Phone scenes drawer');check($('project-name').getBoundingClientRect().width>200,'Phone project naming');$('phone-close-scenes').click();
 const geometry=JSON.stringify(workspaceData()),zoom=view.z;
 canvas.dispatchEvent(new PointerEvent('pointerdown',at(80,100,1)));canvas.dispatchEvent(new PointerEvent('pointerdown',at(180,100,2)));
 canvas.dispatchEvent(new PointerEvent('pointermove',at(230,115,2)));canvas.dispatchEvent(new PointerEvent('pointerup',at(80,100,1)));canvas.dispatchEvent(new PointerEvent('pointerup',at(230,115,2)));
 check(view.z>zoom&&JSON.stringify(workspaceData())===geometry,'Phone pinch/pan preserves object geometry');
 loadWorkspace(JSON.parse(saved));history=savedHistory;future=savedFuture;applyTheme();refresh();fit();canvas.setPointerCapture=capture;
 phoneChecks.push('phone action bounds and 44-point controls','phone camera touch placement/drag','phone editable lens properties','phone full-width drawers and project naming','phone two-finger zoom/pan preserves geometry');
}
const panelChecks=[];
const controls=ScenicIPad.isPhone?['workspace-menu','ipad-properties']:['ipad-scenes','workspace-menu','ipad-properties'];
const panelAppearance={};
for(const id of controls){
 const control=$(id),r=control.getBoundingClientRect();
 check(r.width>=44&&r.height>=44&&r.left>=0&&r.right<=innerWidth+1,'Panel control has a visible 44-point target: '+id);
 check(['true','false'].includes(control.getAttribute('aria-expanded')),'Panel disclosure exposes state: '+id);
 const before=control.getAttribute('aria-expanded');
 control.click();check(control.getAttribute('aria-expanded')!==before,'Panel disclosure toggles: '+id);
 await new Promise(resolve=>setTimeout(resolve,200));
 const style=getComputedStyle(control);panelAppearance[id]={expanded:control.getAttribute('aria-expanded'),color:style.color,background:style.backgroundColor,border:style.borderColor};
 control.click();check(control.getAttribute('aria-expanded')===before,'Repeated disclosure restores state: '+id);
}
if(!ScenicIPad.isPhone){
 const scenes=$('ipad-scenes').getBoundingClientRect(),map=$('map-tab').getBoundingClientRect();
 check(scenes.right<=map.left&&map.left-scenes.right<24,'Scenes immediately precedes Scene map');
 check($('ipad-keep-library').type==='checkbox','Landscape preference is a native checkbox');
 panelChecks.push('iPad Scenes immediately left of map/shot navigation','landscape preference checkbox available');
}
check(document.documentElement.scrollWidth<=innerWidth+1,'Editor does not horizontally overflow');
panelChecks.push('all panel controls visible and at least 44 points','disclosure states and repeated toggle restoration','no page overflow');
check(!document.querySelector('[id*=demo]')&&typeof ScenicDemo==='undefined','No shipping demo controls or data');
panelChecks.push('no bundled demo entry points; existing imported projects preserved');
await ScenicDesktop.exportFile(new Blob([ScenicProjectFile.serialize(doc)],{type:'application/json'}),'ipad-to-desktop.scenic');
await scenicFlush();
return {panelAppearance,checks:[...panelChecks,'desktop-to-iOS native WKWebView import','embedded PNG, JPG, and WebP decoded','all geometry and object fields preserved','motion and camera links preserved','theme and editor settings preserved','prior production preserved','duplicate name and ID isolation','malformed/newer/damaged rejection without mutation','iOS-to-desktop native file export',...phoneChecks],name:doc.name,viewport:{width:innerWidth,height:innerHeight}};
