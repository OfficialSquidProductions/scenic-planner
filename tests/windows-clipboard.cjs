const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
let template;
const electron={app:{requestSingleInstanceLock:()=>false,quit(){}},Menu:{buildFromTemplate:x=>x,setApplicationMenu:x=>template=x}};
const main=vm.createContext({process:{argv:[]},require:name=>name==='electron'?electron:name==='electron-updater'?{}:name.startsWith('./')?require('../windows/'+name.slice(2)):require(name)});
vm.runInContext(fs.readFileSync('windows/main.cjs','utf8'),main);vm.runInContext('menu()',main);
const edit=template.find(i=>i.label==='Edit').submenu;
for(const [role,key] of [['copy','C'],['paste','V']]){
 const item=edit.find(i=>i.role===role);
 assert(item,role+' must dispatch the native Chromium clipboard event');
 assert.equal(item.accelerator,'Ctrl+'+key);
 assert.equal(item.click,undefined,'Do not defer focus-sensitive clipboard commands through async renderer queries');
}
// Exercise the actual shared DOM handlers. OS ordering is verified on the VM.
require('./object-clipboard.cjs');
console.log('Windows clipboard roles preserve Chromium input ordering and shared DOM handlers.');
