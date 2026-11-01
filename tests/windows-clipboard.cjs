const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
let template,clipboardText='',copyCalls=0,pasteCalls=0,active,normalFocus=false;
const payload='SCENIC OBJECTS 1\n{"synthetic":true}',received=[];
const win={webContents:{async executeJavaScript(code,gesture){assert.equal(gesture,true);if(code.includes('.copy()')){await new Promise(r=>setTimeout(r,15));return normalFocus?null:payload;}const text=JSON.parse(code.slice(code.indexOf('.paste(')+7,code.lastIndexOf(') ??')));received.push(text);return !normalFocus&&text.startsWith('SCENIC OBJECTS 1\n');},copy(){copyCalls++;},paste(){pasteCalls++;}}};active=win;
const clipboard={async writeText(text){clipboardText=text;},async readText(){return clipboardText;}};
const electron={app:{requestSingleInstanceLock:()=>false,quit(){}},Menu:{buildFromTemplate:x=>x,setApplicationMenu:x=>template=x},BrowserWindow:{getFocusedWindow:()=>active},clipboard};
const main=vm.createContext({process:{argv:[]},Buffer,setTimeout,require:name=>name==='electron'?electron:name==='electron-updater'?{}:name.startsWith('./')?require('../windows/'+name.slice(2)):require(name)});
vm.runInContext(fs.readFileSync('windows/main.cjs','utf8'),main);main.nativeWindow=win;vm.runInContext('win=nativeWindow;menu()',main);
const edit=template.find(i=>i.label==='Edit').submenu,copy=edit.find(i=>i.label==='Copy'),paste=edit.find(i=>i.label==='Paste');assert.equal(copy.accelerator,'Ctrl+C');assert.equal(paste.accelerator,'Ctrl+V');
(async()=>{
 const first=copy.click(),second=paste.click();await Promise.all([first,second]);assert.equal(clipboardText,payload);assert.deepEqual(received,[payload],'Rapid Ctrl+C then Ctrl+V waits for clipboard write');assert.equal(copyCalls,0);assert.equal(pasteCalls,0);
 normalFocus=true;await copy.click();await paste.click();assert.equal(copyCalls,1);assert.equal(pasteCalls,1,'Text fields keep native clipboard behavior');normalFocus=false;
 clipboardText='<script>not objects</script>';await paste.click();assert.equal(pasteCalls,2);
 let otherCopies=0,otherPastes=0;active={webContents:{copy(){otherCopies++;},paste(){otherPastes++;}}};await copy.click();await paste.click();assert.equal(otherCopies,1);assert.equal(otherPastes,1,'Other windows do not route commands to the scene editor');
 console.log('Windows clipboard menu passed: Ctrl shortcuts, sequential rapid copy/paste, native clipboard text, input fallback, unsupported text and secondary-window routing.');
})().catch(e=>{console.error(e);process.exitCode=1;});
