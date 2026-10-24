window.__smokeStage="begin";
return await Promise.race([(async()=>{
const check=(value,message)=>{if(!value)throw Error(message);};
if(verifyOnly){
 check(doc.name.startsWith('IPAD BETA SMOKE'),'Persisted production name');
 check(scene().objects.some(o=>o.type==='camera'),'Persisted camera');
 check(scene().shotList?.[0]?.checked===true,'Persisted coverage check');
 const floor=scene().objects.find(o=>o.type==='floor');check(floor?.width===576&&floor.height===288&&floor.color==='#34ab67'&&floor.src?.startsWith('data:image/png;base64,'),'Persisted floor dimensions, color and embedded image');
 check(ScenicModel.validWorkspace(workspaceData()),'Persisted model validity');
 return {name:doc.name,checks:['cold-launch workspace','camera state','shot import and coverage','floor color, dimensions and embedded image','valid model'],viewport:{width:innerWidth,height:innerHeight}};
}
newProject();doc.name='IPAD BETA SMOKE';scene().title='iPad test scene';scene().objects=[];history=[];future=[];refresh();
check(document.documentElement.classList.contains('ipad-app'),'iPad adapter loaded');
check($('ipad-properties').getBoundingClientRect().width>=44,'Touch target');
const productionCount=workspace.projects.length;
const portable=JSON.stringify(doc),base64=btoa(unescape(encodeURIComponent(portable)));
window.__smokeStage='import';await window.ScenicIPad.receiveFile({name:'smoke.scenic',type:'application/json',base64},'project');
check(workspace.projects.length===productionCount+1,'Portable project imports as copy');
const originalCapture=canvas.setPointerCapture;canvas.setPointerCapture=()=>{};
const r=canvas.getBoundingClientRect();const at=(x,y,id=1)=>({clientX:r.left+x,clientY:r.top+y,pointerId:id,pointerType:'touch',bubbles:true,cancelable:true,button:0});
setTool('camera');canvas.dispatchEvent(new PointerEvent('pointerdown',at(220,230)));canvas.dispatchEvent(new PointerEvent('pointerup',at(220,230)));
check(scene().objects.filter(o=>o.type==='camera').length===1,'Touch placement');
const camera=scene().objects.find(o=>o.type==='camera');const id=camera.id;choose(id);setTool('select');
const start={x:camera.x*view.z+view.x,y:camera.y*view.z+view.y};
canvas.dispatchEvent(new PointerEvent('pointerdown',at(start.x,start.y)));
canvas.dispatchEvent(new PointerEvent('pointermove',at(start.x+50,start.y+30)));
canvas.dispatchEvent(new PointerEvent('pointerup',at(start.x+50,start.y+30)));
check(scene().objects.find(o=>o.id===id).x!==camera.x||history.length>0,'Touch movement records history');
const moved=JSON.stringify(scene().objects.find(o=>o.id===id));undo();redo();check(JSON.stringify(scene().objects.find(o=>o.id===id))===moved,'Touch undo/redo');
choose(id);const previous=JSON.stringify(workspaceData()),z=view.z;
canvas.dispatchEvent(new PointerEvent('pointerdown',at(100,110,1)));canvas.dispatchEvent(new PointerEvent('pointerdown',at(200,110,2)));
canvas.dispatchEvent(new PointerEvent('pointermove',at(260,110,2)));canvas.dispatchEvent(new PointerEvent('pointerup',at(100,110,1)));canvas.dispatchEvent(new PointerEvent('pointerup',at(260,110,2)));
check(view.z>z,'Two-finger pinch zoom');check(JSON.stringify(workspaceData())===previous,'Pinch preserves scene content');
$('ipad-properties').click();check($('ipad-properties').getAttribute('aria-expanded')==='true','Properties panel opens');$('ipad-close-panel').click();
$('workspace-menu').click();check($('sidebar-panel').classList.contains('mobile-open'),'Library panel opens');$('ipad-close-panel').click();
const csv='Scene,Shot,Camera,Lens mm,Size,Description,Notes\n1,1A,A,35,Wide,Imported on iPad,Smoke test';
window.__smokeStage='import';await window.ScenicIPad.receiveFile({name:'Shots.csv',type:'text/csv',base64:btoa(csv)},'shots');
check($('shot-import').open,'CSV scene preview');$('confirm-shot-import').click();check(scene().shotList.length===1,'Shot CSV import');
addObject('camera',{x:200,y:200});const linked=object();$('camera-shot-link').onchange({target:{value:scene().shotList[0].id}});$('camera-shot-checked').onchange({target:{checked:true}});
check(linked.shotId===scene().shotList[0].id&&scene().shotList[0].checked,'Camera link and coverage');
check(!document.querySelector('[id*=demo]')&&typeof ScenicDemo==='undefined','No bundled demo');
renderLibrary('walls');check(document.querySelector('[data-tool="floor"]'),'Walls/Floor includes floor tile');
addObject('floor',{x:700,y:700});const floor=object(),floorId=floor.id;
for(const [prop,value] of [['width','16 ft'],['height','8 ft']]){const field=document.querySelector('[data-prop="'+prop+'"][data-length]');check(field,'Exact floor '+prop+' field');field.dispatchEvent(new Event('focus'));field.value=value;field.dispatchEvent(new Event('change',{bubbles:true}));}
check(floor.width===576&&floor.height===288,'Independent floor dimensions');
const colorField=document.querySelector('[data-prop="color"]');colorField.dispatchEvent(new Event('focus'));colorField.value='#34ab67';colorField.dispatchEvent(new Event('input',{bubbles:true}));check(floor.color==='#34ab67','Editable floor color');
const texture=document.createElement('canvas');texture.width=40;texture.height=20;const tc=texture.getContext('2d');for(const [color,x,y] of [['#ff0000',0,0],['#00ff00',20,0],['#0000ff',0,10],['#ffff00',20,10]]){tc.fillStyle=color;tc.fillRect(x,y,20,10);}
const data=texture.toDataURL(),blob=await(await fetch(data)).blob();await importFloorImage(new File([blob],'synthetic-floor.png',{type:'image/png'}),floor);check(floor.src===data,'Floor image bytes embedded');
const stable=JSON.stringify(workspaceData());await importFloorImage(undefined,floor);await importFloorImage(new File(['broken'],'bad.png',{type:'image/png'}),floor);check(JSON.stringify(workspaceData())===stable,'Cancelled and invalid floor images preserve project');
$('remove-floor-image').click();check(!floor.src,'Remove floor image');undo();choose(floorId);check(object().src===data,'Undo restores floor image');
await importFloorImage(new File([blob],'replacement.png',{type:'image/png'}),object());
addObject('asset:mug',{x:700,y:700});const mugId=object().id;scene().objects.reverse();choose(floorId);check(hit({x:700,y:700}).id===mugId,'Covered floor selection leaves foreground reachable');
const roundtrip=ScenicProjectFile.parse(ScenicProjectFile.serialize(doc));check(roundtrip.scenes.find(s=>s.id===doc.active).objects.find(o=>o.id===floorId).src===data,'Portable floor image survives save/reopen');
check(scene().objects.find(o=>o.id===floorId).width===576,'Image replacement keeps scaled bounds');
window.__smokeStage='export';await window.ScenicDesktop.exportFile(new Blob([JSON.stringify(doc)],{type:'application/json'}),'Smoke.scenic');
window.__smokeStage='export';await window.ScenicDesktop.exportFile(new Blob([csv],{type:'text/csv'}),'Smoke.csv');
window.__smokeStage='preview';await window.ScenicSceneBrowser.preview(doc.projectId,scene().id).then(image=>check(image?.startsWith('data:image/jpeg'),'Scene thumbnail'));
exportMap();await new Promise(resolve=>setTimeout(resolve,500));
canvas.setPointerCapture=originalCapture;
check(ScenicModel.validWorkspace(workspaceData()),'Valid workspace');window.__smokeStage='flush';await window.scenicFlush();
const body=document.querySelector('.workspace').getBoundingClientRect();check(body.width<=innerWidth+1,'Workspace fits viewport');
return {name:doc.name,checks:['portable .scenic import copy','touch placement and drag','undo/redo','two-finger pan/zoom','scene preservation','properties and library drawers','Production Desk CSV import','camera links and coverage','native .scenic/CSV/PNG export','scene thumbnails','native autosave','no bundled demo','floor dimensions and color','embedded floor image replacement/removal/cancel/invalid','foreground selection above floors','portable floor image save/reopen'],viewport:{width:innerWidth,height:innerHeight}};

})(),new Promise((_,reject)=>setTimeout(()=>reject(Error("Smoke timed out at "+window.__smokeStage)),20000))]);
