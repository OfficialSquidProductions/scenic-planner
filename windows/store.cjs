const fs=require('node:fs');const path=require('node:path');
function valid(text){try{if(Buffer.byteLength(text)>80*1024*1024)return false;const p=JSON.parse(text);const project=p=>p?.version===1&&typeof p.name==='string'&&Array.isArray(p.scenes)&&p.scenes.length>0;if(p.version===1)return project(p);return p.version===2&&Array.isArray(p.projects)&&p.projects.length>0&&p.projects.length<=100&&p.projects.every(project)&&p.projects.some(p=>p.projectId===JSON.parse(text).activeProject);}catch{return false;}}
class Store{
 constructor(root){this.root=root;this.current=path.join(root,'workspace.json');this.previous=path.join(root,'workspace.previous.json');}
 read(){if(!fs.existsSync(this.current)&&!fs.existsSync(this.previous))return {project:null,recovered:false};for(const [file,recovered] of [[this.current,false],[this.previous,true]]){try{const text=fs.readFileSync(file,'utf8');if(valid(text))return {project:text,recovered};}catch{}}throw Error('Your saved workspace could not be read. Existing files are preserved. Open a .scenic backup to recover it.');}
 atomic(file,text){fs.mkdirSync(this.root,{recursive:true});const temp=file+'.tmp';const fd=fs.openSync(temp,'w',0o600);try{fs.writeFileSync(fd,text,'utf8');fs.fsyncSync(fd);}finally{fs.closeSync(fd);}fs.renameSync(temp,file);}
 write(text){if(!valid(text))throw Error('Invalid workspace or larger than 80 MB.');let old;try{old=fs.readFileSync(this.current,'utf8');}catch{}if(old&&valid(old)&&old!==text)this.atomic(this.previous,old);this.atomic(this.current,text);return true;}
}
module.exports={Store,valid};
