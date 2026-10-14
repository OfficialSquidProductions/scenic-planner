const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const EMAIL='alexanderhosier@squidproductions.org';
class CrashReports{
 constructor(root,version){this.root=root;this.version=version;this.sessionFile=path.join(root,'session.json');this.reportFile=path.join(root,'crash-report.json');}
 read(file){try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return null;}}
 write(file,value){fs.mkdirSync(this.root,{recursive:true});fs.writeFileSync(file+'.tmp',JSON.stringify(value),{mode:0o600});fs.renameSync(file+'.tmp',file);}
 begin(){const previous=this.read(this.sessionFile);if(previous&&typeof previous.started==='string'&&typeof previous.version==='string'&&Array.isArray(previous.errors)&&previous.errors.every(e=>typeof e==='string'))this.capture('Scenic did not shut down normally (a crash, force quit, or power loss).',previous);this.session={started:new Date().toISOString(),version:this.version,errors:[]};this.write(this.sessionFile,this.session);}
 log(message){this.session.errors.push(String(message).slice(0,4000));this.session.errors=this.session.errors.slice(-12);this.write(this.sessionFile,this.session);}
 capture(reason,session=this.session){const report={id:crypto.randomUUID(),needsPrompt:true,log:`Scenic crash report\nVersion: ${session?.version||this.version}\nSystem: ${os.platform()} ${os.release()} (${os.arch()})\nSession started: ${session?.started||'unknown'}\nRecorded: ${new Date().toISOString()}\n${reason}\n\nRecent editor errors:\n${session?.errors?.join('\n\n')||'No JavaScript errors recorded.'}`};this.write(this.reportFile,report);return report;}
 get(){const saved=this.read(this.reportFile);return saved&&typeof saved.id==='string'&&typeof saved.log==='string'&&typeof saved.needsPrompt==='boolean'?saved:{id:null,needsPrompt:false,log:`Scenic ${this.version}\nSystem: ${os.platform()} ${os.release()} (${os.arch()})\nNo crash has been recorded.\n${this.session?.errors?.join('\n\n')||''}`};}
 dismiss(id){const report=this.get();if(report.id&&report.id===id){report.needsPrompt=false;this.write(this.reportFile,report);}}
 end(){fs.rmSync(this.sessionFile,{force:true});}
 prepareEmail(description){
  if(typeof description!=='string'||!description.trim()||description.length>600)throw Error('Describe what happened in 600 characters or fewer.');
  const report=this.get(),text=`What happened:\n${description.trim()}\n\n${report.log}`;
  const file=path.join(this.root,'Scenic-crash-report.txt');fs.writeFileSync(file,text,{mode:0o600});
  const url=body=>`mailto:${EMAIL}?subject=Scenic%20crash%20report&body=${encodeURIComponent(body)}`;
  // Windows openExternal has a 2081-character URL limit. Preserve the complete
  // report in a file instead of silently dropping a description or stack trace.
  const full=url(text),attachmentRequired=full.length>2000;
  return {id:report.id,file,attachmentRequired,url:attachmentRequired?url('Please attach Scenic-crash-report.txt from the folder Scenic opened. It contains my description and crash log.'):full};
 }
}
module.exports={CrashReports,EMAIL};
