const checks=[];
function check(ok,label){if(!ok)throw Error(label);checks.push(label);}
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function until(test,label){for(let i=0;i<150;i++){if(await test())return;await delay(40);}throw Error('Timed out: '+label);}
const request=(action,payload={})=>ScenicDesktop.request(action,payload);
if(verifyOnly){
 check(doc.projectId==='bathroom-project','Cold launch restores synthetic bathroom production');
 check(doc.scenes.length===3,'Cold launch preserves duplicated scene');
 const source=doc.scenes.find(s=>s.id==='bathroom'),later=doc.scenes.find(s=>s.id==='later'),copy=doc.scenes.find(s=>!['bathroom','later'].includes(s.id));
 check(source.objects.find(o=>o.type==='camera').notes!=='Later copy edited','Source stays independent across cold launch');
 check(later.objects[0].name==='Existing destination table'&&later.objects.filter(o=>o.type==='camera').length===2,'Destination objects and repeated copies persist');
 check(copy.objects.length===source.objects.length&&copy.objects.every(o=>!source.objects.some(s=>s.id===o.id)),'Duplicate IDs remain independent after cold launch');
 check(later.objects.some(o=>o.type==='floor'&&o.src)&&later.objects.some(o=>o.type==='image'&&o.src),'Embedded floor and reference images persist');
 check(ScenicModel.validWorkspace(workspaceData()),'Persisted clipboard workspace remains valid');
 return{checks};
}
const project=JSON.parse(clipboardFixture);loadWorkspace({version:2,activeProject:project.projectId,projects:[project]});history=[];future=[];selected=null;selectedIds.clear();wallMultiSelect=false;showShots(false);refresh();fit();
const source=scene(),sourceId=source.id,original=JSON.stringify(source),destination=JSON.stringify(doc.scenes.find(s=>s.id==='later').objects);
setSelection(source.objects.filter(o=>o.name!=='Unselected source table').map(o=>o.id));canvas.focus();
if(uiOnly){commit();return{checks:['Synthetic selected environment prepared for native UI test']};}
const bindings=(await request('clipboardTestState')).keyCommands;
check(bindings.some(k=>k.input==='c'&&k.command)&&bindings.some(k=>k.input==='v'&&k.command),'Native hardware Command+C and Command+V commands registered');
check($('ipad-copy-items')?.getAttribute('aria-label')==='Copy selected scene items'&&$('ipad-paste-items')?.getAttribute('aria-label')==='Paste scene items','Touch clipboard controls have accessible names');
$('ipad-copy-items').click();await until(async()=>(await request('clipboardTestState')).text.startsWith('SCENIC OBJECTS 1\n'),'native Copy items');
const payload=ScenicObjectCopies.decode((await request('clipboardTestState')).text),clipboard=ScenicObjectCopies.encode(payload);
check(payload.objects.length===13,'Native clipboard captures selected bathroom and architectural attachments');
check(JSON.stringify(source)===original&&history.length===0,'Copy leaves source and undo history unchanged');
activateScene('later');check(selected===null,'Switch to existing later scene clears selection');$('ipad-paste-items').click();await until(()=>scene().objects.some(o=>o.type==='camera'),'native Paste items');
check(JSON.stringify(doc.scenes.find(s=>s.id===sourceId))===original,'Scene 1 remains unchanged');check(JSON.stringify(scene().objects.slice(0,1))===destination,'Existing destination object is preserved');
const copies=scene().objects.slice(1);check(copies.length===payload.objects.length,'Every selected object arrives');
for(const o of payload.objects){const copy=copies.find(p=>p.name===o.name);check(copy&&copy.id!==o.id&&copy.x===o.x&&copy.y===o.y,'Independent original-layout copy: '+o.name);}
check(copies.find(o=>o.type==='floor').src===source.objects.find(o=>o.type==='floor').src&&copies.find(o=>o.type==='image').opacity===45,'Image data and editable image properties retained');
const group=copies.find(o=>o.type==='wallGroup'),opening=copies.find(o=>o.name==='Bathroom window');check(group.wallIds.includes(opening.wallId)&&group.wallIds.every(id=>copies.some(o=>o.id===id)),'Groups and opening links target copied walls');
const camera=copies.find(o=>o.type==='camera');check(camera.lens===35&&camera.marks.length===2&&camera.shotId!==source.objects.find(o=>o.type==='camera').shotId,'Camera settings, motion and independent shot link retained');
const after=JSON.stringify(workspaceData());undo();check(JSON.stringify(scene().objects)===destination,'One Undo restores destination');redo();check(JSON.stringify(workspaceData())===after,'Redo restores exact copied IDs and properties');
$('ipad-paste-items').click();await until(()=>scene().objects.filter(o=>o.type==='camera').length===2,'repeat paste');check(scene().objects.filter(o=>o.type==='camera').at(-1).x===210,'Repeated paste offsets fresh copies');
scene().objects.filter(o=>o.type==='camera').at(-1).notes='Later copy edited';check(JSON.stringify(doc.scenes.find(s=>s.id===sourceId))===original,'Editing later copy leaves original unchanged');
const objectState=()=>JSON.stringify(doc.scenes.map(s=>({id:s.id,objects:s.objects,shotList:s.shotList})));let stable=objectState(),historySize=history.length;
$('scene-title').focus();const before=await request('clipboardTestState');await request('copySceneObjects');await request('pasteSceneObjects');await until(async()=>{const s=await request('clipboardTestState');return s.normalCopies>before.normalCopies&&s.normalPastes>before.normalPastes;},'text responder fallback');check(objectState()===stable,'Text focus retains normal native copy/paste without changing map objects');$('scene-title').blur();canvas.focus();historySize=history.length;
await request('clipboardTestSet',{text:'<img src=x onerror=alert(1)>'});const plain=await request('clipboardTestState');await request('pasteSceneObjects');await until(async()=>(await request('clipboardTestState')).normalPastes>plain.normalPastes,'unsupported text');check(objectState()===stable&&history.length===historySize,'Unsupported HTML is never imported into scene');
await request('clipboardTestSet',{text:'SCENIC OBJECTS 1\n{bad'});await request('pasteSceneObjects');await until(()=>$('toast').textContent.includes('damaged'),'invalid copy');check(objectState()===stable&&history.length===historySize,'Malformed structured copies fail atomically');
activateScene(sourceId);choose(null);$('duplicate-scene').click();check(doc.scenes.length===3&&doc.active!==sourceId,'Touch Duplicate scene creates independent complete environment');
const duplicate=scene();check(duplicate.objects.length===source.objects.length&&duplicate.objects.every(o=>!source.objects.some(s=>s.id===o.id)),'Duplicate objects receive fresh IDs');check(duplicate.shotList[0].id!==source.shotList[0].id&&duplicate.objects.find(o=>o.type==='camera').shotId===duplicate.shotList[0].id,'Duplicate shot links remapped together');
duplicate.objects.find(o=>o.type==='camera').notes='Duplicate only';check(JSON.stringify(doc.scenes.find(s=>s.id===sourceId))===original,'Duplicate edits remain independent');
check(ScenicModel.validProject(ScenicProjectFile.parse(ScenicProjectFile.serialize(doc))),'Portable save/reopen retains environment copies');commit();await window.scenicFlush();check(ScenicModel.validWorkspace(workspaceData()),'Native save accepts complete copied workspace');return{checks,copiedItems:payload.objects.length};
