/* Structured, validated copies of scene objects. No editor or clipboard APIs. */
(function(root){
'use strict';
const common=typeof module==='object'&&module.exports;
const model=common?require('./model.js'):root.ScenicModel;
const portable=common?require('./project-file.js'):root.ScenicProjectFile;
const PREFIX='SCENIC OBJECTS 1\n',PREFIX2='SCENIC OBJECTS 2\n',FORMAT='org.squidproductions.scenic.objects';
const key=value=>String(value).trim().toUpperCase();
const validId=value=>typeof value==='string'&&/^[a-zA-Z0-9_.:-]{1,200}$/.test(value);
function validateScene(scene){portable.validate({version:1,name:'Clipboard',active:scene.id,scenes:[scene]});}
function checkedProject(project){
 portable.validate(project);
 if(new TextEncoder().encode(JSON.stringify(project)).length>portable.MAX_FILE)throw Error('This copy would exceed the production size limit.');
}
function selectedObjects(scene,selection){
 const ids=new Set(selection.map(id=>model.wallGroupFor(scene.objects,id)?.id||id));
 for(const group of scene.objects.filter(o=>o.type==='wallGroup'&&ids.has(o.id)))group.wallIds.forEach(id=>ids.add(id));
 // An attached opening travels with its wall/room; an opening copied alone is free-standing.
 for(const o of scene.objects)if(ids.has(o.wallId))ids.add(o.id);
 const objects=structuredClone(scene.objects.filter(o=>ids.has(o.id)));
 for(const o of objects){
  if(o.wallId&&!ids.has(o.wallId)){delete o.wallId;delete o.wallT;delete o.wallIds;}
  else if(o.wallId&&o.wallIds)o.wallIds=o.wallIds.filter(id=>ids.has(id));
 }
 return {objects,selection:[...new Set(selection.map(id=>model.wallGroupFor(scene.objects,id)?.id||id))].filter(id=>ids.has(id))};
}
function capture(project,sceneId,selection,makeId){
 const scene=project.scenes.find(s=>s.id===sceneId);if(!scene)return null;
 const copied=selectedObjects(scene,selection);if(!copied.objects.length)return null;
 const linked=new Set(copied.objects.map(o=>o.shotId).filter(Boolean));
 const shotList=structuredClone((scene.shotList||[]).filter(s=>linked.has(s.id)));
 validateScene({id:'clipboard',title:'Clipboard',ambient:30,objects:copied.objects,shotList});
 const version=copied.objects.some(o=>o.curve||o.vertices||o.barnDoors!==undefined||o.bounceSide||model.lightingLayouts?.own(o)&&o.type==='gear')?2:1;
 return {format:FORMAT,version,token:makeId(),sourceProjectId:project.projectId,sourceSceneId:sceneId,...copied,shotList};
}
function encode(payload){const text=(payload.version===2?PREFIX2:PREFIX)+JSON.stringify(payload);decode(text);return text;}
function supported(text){return typeof text==='string'&&(text.startsWith(PREFIX)||text.startsWith(PREFIX2));}
function decode(text){
 if(!supported(text))return null;
 if(text.length>portable.MAX_FILE||new TextEncoder().encode(text).length>portable.MAX_FILE)throw Error('Choose a Scenic object copy of 60 MB or less.');
 let p;try{p=JSON.parse(text.slice(text.startsWith(PREFIX2)?PREFIX2.length:PREFIX.length));}catch{throw Error('This Scenic object copy is damaged.');}
 if(!p||p.format!==FORMAT||![1,2].includes(p.version)||![p.token,p.sourceProjectId,p.sourceSceneId].every(validId)||!Array.isArray(p.objects)||!p.objects.length||!Array.isArray(p.shotList)||!Array.isArray(p.selection)||!p.selection.length||new Set(p.selection).size!==p.selection.length||!p.selection.every(id=>validId(id)&&p.objects.some(o=>o.id===id)))throw Error('This Scenic object copy is not supported.');
 validateScene({id:'clipboard',title:'Clipboard',ambient:30,objects:p.objects,shotList:p.shotList});
 return p;
}
function allocator(project,makeId){
 const used=new Set([project.projectId,...project.scenes.flatMap(s=>[s.id,...(model.lightingLayouts?.allObjects(s)||s.objects).flatMap(o=>[o.id,...(o.marks||[]).map(m=>m.id).filter(Boolean)]),...(s.shotList||[]).map(s=>s.id)])]);
 return ()=>{for(let i=0;i<100;i++){const id=makeId();if(validId(id)&&!used.has(id)){used.add(id);return id;}}throw Error('Could not create an independent copy. Try again.');};
}
function cloneObjects(objects,next,offset,shotIds){
 const ids=new Map(objects.map(o=>[o.id,next()]));
 const copies=structuredClone(objects);
 for(const o of copies){
  o.id=ids.get(o.id);o.x+=offset;o.y+=offset;
  if(o.type==='wall'){o.x2+=offset;o.y2+=offset;}
  if(o.wallId)o.wallId=ids.get(o.wallId);
  if(o.wallIds)o.wallIds=o.wallIds.map(id=>ids.get(id));
  if(o.shotId)o.shotId=shotIds.get(o.shotId);
  if(o.marks)for(const m of o.marks){m.x+=offset;m.y+=offset;if(m.id!==undefined)m.id=next();}
 }
 return {objects:copies,ids};
}
function planPaste(project,sceneId,payload,makeId,offset=0){
 const source=project.scenes.find(s=>s.id===sceneId);if(!source)throw Error('Choose a scene before pasting.');
 if(!Number.isFinite(offset))throw Error('Invalid paste position.');
 const p=decode(encode(payload));
 if(source.objects.length+p.objects.length>2000)throw Error('This scene would exceed its 2,000 item limit.');
 if(source.objects.some(o=>o.kind==='sun')&&p.objects.some(o=>o.kind==='sun'))throw Error('Only one sun is allowed per scene.');
 const next=allocator(project,makeId),shotIds=new Map(),shotList=structuredClone(source.shotList||[]);
 for(const shot of p.shotList){
  const sameScene=p.sourceProjectId===project.projectId&&p.sourceSceneId===sceneId;
  const existing=shotList.find(s=>sameScene&&s.id===shot.id)||shotList.find(s=>key(s.scene)===key(shot.scene)&&key(s.number)===key(shot.number));
  if(existing)shotIds.set(shot.id,existing.id);
  else {const copy=structuredClone(shot);copy.id=next();shotIds.set(shot.id,copy.id);shotList.push(copy);}
 }
 const result=cloneObjects(p.objects,next,offset,shotIds),scene={...source,objects:[...source.objects,...result.objects]};
 if(source.shotList!==undefined||shotList.length)scene.shotList=shotList;
 const candidate={...project,scenes:project.scenes.map(s=>s.id===sceneId?scene:s)};checkedProject(candidate);
 return {scene,selection:p.selection.map(id=>result.ids.get(id)),count:p.selection.length};
}
function duplicateScene(project,sceneId,makeId){
 const source=project.scenes.find(s=>s.id===sceneId);if(!source)throw Error('This scene is no longer available.');
 if(project.scenes.length>=100)throw Error('A production can contain up to 100 scenes.');
 const next=allocator(project,makeId),scene=structuredClone(source),shotIds=new Map();scene.id=next();
 scene.title=source.title+' — COPY';scene.subtitle=(source.subtitle||source.title)+' copy';
 const names=new Set(project.scenes.map(s=>s.title));let n=2;while(names.has(scene.title))scene.title=source.title+' — COPY '+n++;
 if(scene.shotList)for(const shot of scene.shotList){const old=shot.id;shot.id=next();shotIds.set(old,shot.id);}
 const cloned=cloneObjects(source.objects,next,0,shotIds);scene.objects=cloned.objects;
 model.lightingLayouts?.cloneState(source,scene,next,cloned.ids,shotIds);
 checkedProject({...project,active:scene.id,scenes:[...project.scenes,scene]});return scene;
}
const api={PREFIX,PREFIX2,capture,encode,decode,supported,planPaste,duplicateScene};
if(common)module.exports=api;else root.ScenicObjectCopies=api;
})(globalThis);
