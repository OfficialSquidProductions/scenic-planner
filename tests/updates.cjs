const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {plainText,releaseNotes,updateDetail}=require('../windows/updates.cjs');
assert.equal(plainText('<h2>Changes</h2><ul><li>Camera &amp; light</li><li>Fix &#x27;aim&#39;</li></ul><script>bad()</script>'),"Changes\n\n• Camera & light\n• Fix 'aim'");
assert.equal(releaseNotes({releaseNotes:[{version:'2.0.0',note:'First'},{version:'1.9.0',note:'Second'}]}),'Scenic 2.0.0\nFirst\n\nScenic 1.9.0\nSecond');
assert.match(releaseNotes({}),/unavailable/);
assert.match(updateDetail({version:'2.0.0',releaseNotes:'New cameras'},'Save and restart'),/New cameras[\s\S]*Save and restart/);

// Run the actual Windows event handlers with native UI and updater stand-ins.
// No app process, network, user workspace, or real install is involved.
const handlers={},prompts=[],responses=[];
let menu,downloaded=0,installed=0,saveSucceeds=false;
const autoUpdater={on:(name,fn)=>handlers[name]=fn,downloadUpdate:async()=>{downloaded++;},quitAndInstall:()=>{installed++;}};
const electron={
 app:{requestSingleInstanceLock:()=>false,quit:()=>{},getVersion:()=>'1.4.13'},
 Menu:{buildFromTemplate:value=>value,setApplicationMenu:value=>{menu=value;}},
 dialog:{showMessageBox:async(_win,options)=>{prompts.push(options);return {response:responses.shift()??1};},showErrorBox:()=>{throw Error('Unexpected download failure');}}
};
const context=vm.createContext({
 require:name=>name==='electron'?electron:name==='electron-updater'?{autoUpdater}:name==='./updates.cjs'?require('../windows/updates.cjs'):name==='./store.cjs'?{}:name==='./reports.cjs'?require('../windows/reports.cjs'):require(name),
 process:{argv:[]},setTimeout:()=>({unref(){}}),setInterval:()=>({unref(){}})
});
vm.runInContext(fs.readFileSync(require.resolve('../windows/main.cjs'),'utf8'),context);
context.testWin={webContents:{executeJavaScript:async()=>saveSucceeds}};
vm.runInContext('win=testWin;updates();',context);
const info={version:'1.4.14',releaseNotes:'Improved camera controls'};
const findMenu=label=>menu[0].submenu.find(item=>item.label===label);
(async()=>{
 responses.push(1);await handlers['update-available'](info);
 assert.match(prompts.at(-1).detail,/Improved camera controls/);
 assert.equal(downloaded,0,'Later must not download');
 assert.equal(findMenu('View Update Details…').enabled,true);
 await findMenu('View Update Details…').click();assert.match(prompts.at(-1).detail,/1.4.14/);
 responses.push(0);await handlers['update-available'](info);assert.equal(downloaded,1);
 responses.push(1);await handlers['update-downloaded'](info);
 assert.match(prompts.at(-1).detail,/Improved camera controls[\s\S]*save your work/);
 assert.equal(installed,0,'Later must not install');
 await findMenu('Continue Installing Update…').click();assert.equal(installed,0,'Failed save must block install');
 saveSucceeds=true;await findMenu('Continue Installing Update…').click();assert.equal(installed,1,'Retry after saving must install once');
 vm.runInContext('settings.automaticInstall=true;autoUpdater.autoDownload=true;',context);
 const count=prompts.length;await handlers['update-available'](info);await handlers['update-downloaded'](info);
 assert.equal(prompts.length,count,'Keep the existing automatic-update preference');
 await findMenu('View Update Details…').click();assert.match(prompts.at(-1).detail,/Improved camera controls/);
 console.log('Release notes: text/HTML/versioned notes, missing-note fallback, download and install prompts, Later, details menu, automatic preference, failed-save blocking and retry passed.');
})().catch(error=>{console.error(error);process.exitCode=1;});
