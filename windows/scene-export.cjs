const fs=require('node:fs/promises'),path=require('node:path'),{randomUUID}=require('node:crypto');
class ScenePNGExporter{
 constructor({dialog,window,validatePNG}){this.dialog=dialog;this.window=window;this.validatePNG=validatePNG;this.active=null;this.choosing=false;}
 async request(action,p={}){
  if(action==='beginScenePNGExport'){
   if(this.active||this.choosing)throw Error('Finish the current scene export first.');
   if(typeof p.name!=='string'||!p.name||p.name.length>140||!/^[a-z0-9 _-]+$/i.test(p.name)||!Number.isInteger(p.count)||p.count<1||p.count>100)throw Error('Invalid scene export.');
   this.choosing=true;let selection;try{selection=await this.dialog.showOpenDialog(this.window(),{title:'Choose a destination for the scene PNG folder',buttonLabel:'Export here',properties:['openDirectory','createDirectory']});}finally{this.choosing=false;}
   if(selection.canceled||!selection.filePaths[0])return false;
   const parent=selection.filePaths[0],staging=await fs.mkdtemp(path.join(parent,'.Scenic-export-'));
   this.active={token:randomUUID(),parent,staging,name:p.name+' - scenes',count:p.count,completed:0,total:0,names:new Map()};return this.active.token;
  }
  const batch=this.active;if(!batch||p.token!==batch.token)throw Error('This scene export is no longer active.');
  if(action==='cancelScenePNGExport'){await fs.rm(batch.staging,{recursive:true,force:true});this.active=null;return false;}
  if(action==='appendScenePNGExport'){
   if(p.index!==batch.completed||batch.completed>=batch.count||typeof p.filename!=='string'||p.filename.length>180||!/^\d{3} - [a-z0-9 _-]+\.png$/i.test(p.filename)||batch.names.has(p.filename.toLowerCase())||typeof p.base64!=='string'||p.base64.length>32*1024*1024)throw Error('Invalid or out-of-order scene image.');
   const data=Buffer.from(p.base64,'base64');if(data.length>24*1024*1024||batch.total+data.length>80*1024*1024||!data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))||!this.validatePNG(data))throw Error('The scene image is damaged or oversized.');
   await fs.writeFile(path.join(batch.staging,p.filename),data,{flag:'wx'});batch.names.set(p.filename.toLowerCase(),p.filename);batch.completed++;batch.total+=data.length;return true;
  }
  if(action!=='finishScenePNGExport')throw Error('Unsupported export request.');
  if(batch.completed!==batch.count)throw Error('Some scenes have not finished exporting.');
  let destination;
  for(let i=1;i<=10000;i++){const candidate=path.join(batch.parent,batch.name+(i===1?'':` (${i})`));try{await fs.mkdir(candidate);destination=candidate;break;}catch(error){if(error.code!=='EEXIST')throw error;}}
  if(!destination)throw Error('Choose another folder; too many exports use this name.');
  try{for(const name of batch.names.values())await fs.copyFile(path.join(batch.staging,name),path.join(destination,name),fs.constants.COPYFILE_EXCL);await fs.rm(batch.staging,{recursive:true});this.active=null;return path.basename(destination);}
  catch(error){await fs.rm(destination,{recursive:true,force:true});throw error;}
 }
}
module.exports={ScenePNGExporter};
