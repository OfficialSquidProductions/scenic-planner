/* Portable .scenic files retain the legacy version-1 project shape. No code,
   archive entries, external URLs, or machine-local asset paths are loaded. */
(function(root){
'use strict';
const model=typeof module==='object'&&module.exports?require('./model.js'):root.ScenicModel;
const MAX_FILE=60*1024*1024,MAX_WORKSPACE=80*1024*1024,MAX_IMAGE=20*1024*1024;
const FORMAT='org.squidproductions.scenic.project',VERSION=1;
const bytes=text=>new TextEncoder().encode(text).length;
function fail(message){throw Error(message);}
function tree(value,depth=0,state={nodes:0},key=''){
 if(++state.nodes>600000||depth>24)fail('This project is too complex to import.');
 if(value===null||typeof value==='boolean')return;
 if(typeof value==='number'){if(!Number.isFinite(value)||Math.abs(value)>1e12)fail('Invalid project number.');return;}
 if(typeof value==='string'){
  if(value.length>(key==='src'?28*1024*1024:200000))fail('A project field is too large.');
  // IDs are inserted into existing editor data attributes. Keep them inert.
  if((key==='id'||key==='active'||key.endsWith('Id'))&&!/^[a-zA-Z0-9_.:-]{1,200}$/.test(value))fail('Invalid project identifier.');
  return;
 }
 if(typeof value!=='object')fail('Invalid project value.');
 for(const [k,v] of Object.entries(value)){
  if(['__proto__','constructor','prototype'].includes(k))fail('Unsupported project field.');
  tree(v,depth+1,state,k);
 }
}
function imageInfo(src){
 const match=/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(src);
 if(!match||match[2].length%4!==0||match[2].length>Math.ceil(MAX_IMAGE/3)*4)fail('Reference images must be embedded PNG, JPG, or WebP files of 20 MB or less.');
 const raw=atob(match[2]),u=i=>raw.charCodeAt(i),be=i=>u(i)*16777216+u(i+1)*65536+u(i+2)*256+u(i+3),le=i=>u(i)+u(i+1)*256+u(i+2)*65536+u(i+3)*16777216;
 if(raw.length>MAX_IMAGE)fail('A reference image is larger than 20 MB.');
 let w=0,h=0;
 if(match[1]==='png'&&raw.slice(0,8)==='\x89PNG\r\n\x1a\n'&&raw.slice(12,16)==='IHDR'&&raw.length>=33){w=be(16);h=be(20);}
 if(match[1]==='jpeg'&&u(0)===255&&u(1)===216){
  let i=2;
  while(i+8<raw.length){
   if(u(i++)!==255)break;while(u(i)===255)i++;
   const marker=u(i++);if(marker===217||marker===218)break;if(marker===1||marker>=208&&marker<=215)continue;
   const length=u(i)*256+u(i+1);if(length<2||i+length>raw.length)break;
   if([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker)){h=u(i+3)*256+u(i+4);w=u(i+5)*256+u(i+6);break;}i+=length;
  }
 }
 if(match[1]==='webp'&&raw.slice(0,4)==='RIFF'&&raw.slice(8,12)==='WEBP'&&le(4)+8===raw.length){
  const kind=raw.slice(12,16);
  if(kind==='VP8X'&&raw.length>=30){w=1+u(24)+u(25)*256+u(26)*65536;h=1+u(27)+u(28)*256+u(29)*65536;}
  if(kind==='VP8 '&&raw.length>=30&&raw.slice(23,26)==='\x9d\x01\x2a'){w=(u(26)+u(27)*256)&16383;h=(u(28)+u(29)*256)&16383;}
  if(kind==='VP8L'&&raw.length>=25&&u(20)===47){w=1+u(21)+((u(22)&63)<<8);h=1+(u(22)>>6)+(u(23)<<2)+((u(24)&15)<<10);}
 }
 if(!w||!h||w>16384||h>16384||w*h>40000000)fail('A reference image is damaged, unsupported, or exceeds 40 megapixels.');
 return {width:w,height:h,size:raw.length};
}
function validate(project){
 tree(project);
 if(project?.portable!==undefined&&(project.portable?.format!==FORMAT||project.portable?.version!==VERSION))fail('This Scenic file uses an unsupported format version. Update Scenic before opening it.');
 if(project?.version!==1)fail('This project version is not supported. Update Scenic before opening it.');
 if(!model.validProject(project))fail('This file does not contain a valid Scenic project.');
 if(project.theme!==undefined&&!['light','dark'].includes(project.theme))fail('Invalid project theme.');
 if(project.editorSettings!==undefined&&(!project.editorSettings||['grid','snap','simulation'].some(k=>typeof project.editorSettings[k]!=='boolean')))fail('Invalid editor settings.');
 const sources=new Set();let pixels=0;
 for(const scene of project.scenes){
  if(scene.subtitle!==undefined&&typeof scene.subtitle!=='string'||scene.notes!==undefined&&typeof scene.notes!=='string')fail('Invalid scene text.');
  for(const object of scene.objects){
   if(object.type==='image'||object.type==='floor'&&object.src){
    if(object.type==='image'&&(object.opacity<0||object.opacity>100))fail('Invalid image opacity.');
    if(!sources.has(object.src)){const info=imageInfo(object.src);pixels+=info.width*info.height;sources.add(object.src);if(sources.size>100||pixels>120000000)fail('This project exceeds the limit of 100 reference images or 120 megapixels in total.');}
   }
  }
 }
 return project;
}
function parse(text){
 if(typeof text!=='string'||text.length>MAX_FILE||bytes(text)>MAX_FILE)fail('Choose a Scenic project of 60 MB or less.');
 let project;try{project=JSON.parse(text);}catch{fail('This file is not valid Scenic JSON.');}
 return validate(project);
}
async function checkImages(project){
 // Header checks bound decoded memory before the platform image decoder runs.
 if(typeof Image==='undefined')return;
 const sources=new Set(project.scenes.flatMap(s=>s.objects.filter(o=>(o.type==='image'||o.type==='floor')&&o.src).map(o=>o.src)));
 for(const src of sources){
  await new Promise((resolve,reject)=>{const img=new Image();const timer=setTimeout(()=>{img.src='';reject(Error('A reference image could not be decoded.'));},10000);img.onload=()=>{clearTimeout(timer);resolve();};img.onerror=()=>{clearTimeout(timer);reject(Error('A reference image is damaged.'));};img.src=src;});
 }
}
function serialize(project){
 validate(project);
 const copy=structuredClone(project);copy.portable={format:FORMAT,version:VERSION};
 const text=JSON.stringify(copy);if(bytes(text)>MAX_FILE)fail('This project exceeds the 60 MB portable file limit. Reduce its reference images before sharing.');
 return text;
}
function prepareImport(project,workspace,makeId){
 validate(project);
 if(workspace.projects.length>=100)fail('This workspace already has 100 productions. Save a backup and remove one before importing.');
 const copy=structuredClone(project),used=new Set(workspace.projects.map(p=>p.projectId));
 copy.projectId=makeId();if(used.has(copy.projectId))fail('Could not create a unique production ID. Try again.');
 const names=new Set(workspace.projects.map(p=>p.name));let n=1;
 while(names.has(copy.name))copy.name=project.name+' (imported'+(n++===1?'':' '+(n-1))+')';
 copy.theme=copy.theme||'light';
 const candidate={...workspace,activeProject:copy.projectId,projects:[...workspace.projects,copy]};
 if(!model.validWorkspace(candidate))fail('The imported workspace is not valid. Existing work has been preserved.');
 if(bytes(JSON.stringify(candidate))>MAX_WORKSPACE)fail('Import would exceed the 80 MB workspace limit. Existing work has been preserved.');
 return {project:copy,workspace:candidate};
}
const api={parse,serialize,validate,checkImages,prepareImport,imageInfo,MAX_FILE,MAX_WORKSPACE,FORMAT,VERSION};
if(typeof module==='object'&&module.exports)module.exports=api;else root.ScenicProjectFile=api;
})(typeof globalThis!=='undefined'?globalThis:this);
