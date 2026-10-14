const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),vm=require('node:vm');
const {CrashReports,EMAIL}=require('../windows/reports.cjs');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'scenic-reports-'));
try{
 let reports=new CrashReports(root,'test-version');reports.begin();
 assert.equal(reports.get().needsPrompt,false,'First launch must not report a crash');
 reports.end();reports=new CrashReports(root,'test-version');reports.begin();
 assert.equal(reports.get().needsPrompt,false,'Clean quit must not report a crash');
 reports.log('Synthetic editor error at editor.js:12');
 reports=new CrashReports(root,'next-version');reports.begin();
 const recovered=reports.get();assert.equal(recovered.needsPrompt,true);assert.match(recovered.log,/test-version[\s\S]*did not shut down normally[\s\S]*Synthetic editor error/);
 reports.dismiss('stale-id');assert.equal(reports.get().needsPrompt,true);
 reports.dismiss(recovered.id);assert.equal(reports.get().needsPrompt,false);assert.match(reports.get().log,/Synthetic editor error/);
 reports.end();reports=new CrashReports(root,'next-version');reports.begin();assert.equal(reports.get().needsPrompt,false,'Dismissed reports must not prompt on clean relaunch');
 reports.capture('Editor process stopped: crashed; exit code 1');assert.equal(reports.get().needsPrompt,true);
 const draft=reports.prepareEmail('Moved a camera & changed its lens.');
 assert.equal(draft.attachmentRequired,false);assert.match(draft.url,new RegExp(`^mailto:${EMAIL.replaceAll('.','\\.')}\\?`));
 assert.match(decodeURIComponent(draft.url),/Moved a camera & changed its lens[\s\S]*Editor process stopped/);
 assert.throws(()=>reports.prepareEmail(' '));assert.throws(()=>reports.prepareEmail('x'.repeat(601)));
 for(let i=0;i<15;i++)reports.log('Long stack: '+('あ'.repeat(4000)));
 assert.equal(reports.session.errors.length,12);assert(reports.session.errors.every(error=>error.length<=4000));
 reports.capture('Editor process stopped again');const long=reports.prepareEmail('My full description');
 assert.equal(long.attachmentRequired,true);assert(long.url.length<=2000);assert.match(fs.readFileSync(long.file,'utf8'),/My full description[\s\S]*Long stack/);
}finally{fs.rmSync(root,{recursive:true,force:true});}

// Exercise the actual shared report UI, including consent, description,
// dismiss/reopen, log download, and email failure without launching mail.
const elements=new Map(),listeners={},requests=[];
let report={id:'crash-1',needsPrompt:true,log:'Synthetic crash log'},failSend=false;
function element(id){if(!elements.has(id))elements.set(id,{value:'',textContent:'',disabled:false,open:false,handlers:{},addEventListener(name,fn){this.handlers[name]=fn;},showModal(){this.open=true;},close(){this.open=false;this.handlers.close?.();},focus(){}});return elements.get(id);}
const context={window:{addEventListener:(name,fn)=>listeners[name]=fn,ScenicDesktop:{request:async(action,payload)=>{requests.push({action,payload});if(action==='getCrashReport')return {...report};if(action==='dismissCrashReport'){report.needsPrompt=false;return true;}if(action==='sendCrashReport'){if(failSend)throw Error('No mail app');return {attachmentRequired:true};}},exportFile:async()=>true}},document:{getElementById:element,addEventListener:(name,fn)=>listeners[name]=fn},Blob,Error,Date,URL,setTimeout};
vm.runInNewContext(fs.readFileSync('dist/reports.js','utf8'),context);
const tick=()=>new Promise(resolve=>setImmediate(resolve));
async function nativeHandlers(){
 const data=fs.mkdtempSync(path.join(os.tmpdir(),'scenic-native-reports-'));
 try{
  const appEvents={},webEvents={},processEvents={},external=[],revealed=[];let ipc,reloads=0,loadedURL;
  const mainWindow={webContents:{mainFrame:{},setWindowOpenHandler(){},on:(name,fn)=>webEvents[name]=fn,session:{setPermissionRequestHandler(){}}},on(){},reload(){reloads++;},async loadURL(url){loadedURL=url;}};
  const electron={app:{getPath:()=>data,getVersion:()=>'test-version',requestSingleInstanceLock:()=>false,quit(){},on:(name,fn)=>appEvents[name]=fn},BrowserWindow:function(){return mainWindow;},Menu:{buildFromTemplate:x=>x,setApplicationMenu(){}},dialog:{showErrorBox(){throw Error('Unexpected native error');}},shell:{async openExternal(url){external.push(url);},showItemInFolder:file=>revealed.push(file)},ipcMain:{handle:(_name,fn)=>{ipc=fn;}}};
  const sandbox=vm.createContext({__dirname:path.resolve('windows'),require:name=>name==='electron'?electron:name==='electron-updater'?{autoUpdater:{on(){}}}:name.startsWith('./')?require('../windows/'+name.slice(2)):require(name),process:{argv:[],on:(name,fn)=>processEvents[name]=fn},setTimeout:()=>({unref(){}}),setInterval:()=>({unref(){}})});
  vm.runInContext(fs.readFileSync('windows/main.cjs','utf8'),sandbox);await vm.runInContext('start()',sandbox);
  const event={sender:mainWindow.webContents,senderFrame:mainWindow.webContents.mainFrame};event.senderFrame.url=loadedURL;
  await assert.rejects(ipc({...event,senderFrame:{url:loadedURL}},'getCrashReport',{}),/Local main window/);
  assert.equal((await ipc(event,'getCrashReport',{})).needsPrompt,false);
  webEvents['render-process-gone']({}, {reason:'crashed',exitCode:5});assert.equal(reloads,1);
  assert.match((await ipc(event,'getCrashReport',{})).log,/crashed; exit code 5/);
  await ipc(event,'sendCrashReport',{description:'Dragged a camera'});assert.equal(external.length,1);assert.match(decodeURIComponent(external[0]),/alexanderhosier@squidproductions.org[\s\S]*Dragged a camera/);
  assert.equal((await ipc(event,'getCrashReport',{})).needsPrompt,false);
  processEvents.uncaughtExceptionMonitor({stack:'Synthetic native exception stack'});
  const reopened=new CrashReports(data,'new-version');reopened.begin();assert.match(reopened.get().log,/Synthetic native exception stack/);
  webEvents['render-process-gone']({}, {reason:'clean-exit',exitCode:0});assert.equal(reloads,1);
  for(let i=0;i<4;i++)await ipc(event,'logError',{message:'Long error '+('x'.repeat(3900))});
  webEvents['render-process-gone']({}, {reason:'oom',exitCode:6});await ipc(event,'sendCrashReport',{description:'Large scene'});
  assert.equal(revealed.length,1);assert.match(fs.readFileSync(revealed[0],'utf8'),/Large scene[\s\S]*oom/);
  appEvents['will-quit']();assert.equal(fs.existsSync(path.join(data,'session.json')),false);
 }finally{fs.rmSync(data,{recursive:true,force:true});}
}
(async()=>{
 listeners.DOMContentLoaded();await tick();
 assert.equal(element('crash-report').open,true);assert.match(element('crash-report-intro').textContent,/stopped unexpectedly/);
 assert.equal(requests.some(r=>r.action==='sendCrashReport'),false,'Prompt must never send automatically');
 element('close-crash-report').onclick();await tick();assert.equal(element('crash-report').open,false);assert.equal(report.needsPrompt,false);
 await element('report-crash').onclick();assert.equal(element('crash-report').open,true);assert.equal(element('crash-report-log').value,'Synthetic crash log');
 element('crash-report-description').value='I moved the light';
 await element('crash-report-form').onsubmit({preventDefault(){}});
 assert.deepEqual(requests.find(r=>r.action==='sendCrashReport').payload.description,'I moved the light');
 assert.match(element('crash-report-status').textContent,/Attach Scenic-crash-report.txt/);
 failSend=true;await element('crash-report-form').onsubmit({preventDefault(){}});
 assert.match(element('crash-report-status').textContent,/Could not open[\s\S]*alexanderhosier/);assert.equal(element('send-crash-report').disabled,false);
 await element('save-crash-log').onclick();assert.match(element('crash-report-status').textContent,/saved/);
 listeners.error({message:'Synthetic script failure'});await tick();assert.equal(requests.at(-1).action,'logError');
 await nativeHandlers();
 console.log('Crash reports passed: clean/unclean relaunch, diagnostics, consent, dismiss/reopen, complete email bodies, long-log attachment, descriptions, save-log, and mail failure.');
})().catch(error=>{console.error(error);process.exitCode=1;});
