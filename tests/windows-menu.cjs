const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
// Invoke the actual native menu callbacks. The renderer stand-in models Chromium's
// transient-activation requirement, not a native dialog or a browser integration test.
let template,activation=false,pickers=0;
const renderer=vm.createContext({document:{getElementById:()=>({click(){if(activation)pickers++;}})}});
const electron={app:{requestSingleInstanceLock:()=>false,quit(){}},Menu:{buildFromTemplate:x=>x,setApplicationMenu:x=>template=x}};
const main=vm.createContext({process:{argv:[]},require:name=>name==='electron'?electron:name==='electron-updater'?{}:name.startsWith('./')?require('../windows/'+name.slice(2)):require(name)});
vm.runInContext(fs.readFileSync('windows/main.cjs','utf8'),main);
main.nativeWindow={webContents:{async executeJavaScript(code,userGesture){activation=userGesture===true;try{return vm.runInContext(code,renderer);}finally{activation=false;}}}};
vm.runInContext('win=nativeWindow;menu()',main);
(async()=>{
 for(const label of ['Import Shot List CSV','Import Image','Open Project']){
  const before=pickers;await template.find(x=>x.label==='File').submenu.find(x=>x.label.startsWith(label)).click();
  assert.equal(pickers,before+1,label+' must convey user activation to its renderer click');
  assert.equal(activation,false,'Activation must not persist beyond the command');
 }
 console.log('Native menu regression: CSV/image/project commands carry transient user activation.');
})().catch(error=>{console.error(error);process.exitCode=1;});
