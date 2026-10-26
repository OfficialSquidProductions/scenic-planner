const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function hints(source,host,platform){
 const nodes=new Map(),node=id=>{if(!nodes.has(id))nodes.set(id,{getContext:()=>({}),classList:{},style:{},addEventListener(){}});return nodes.get(id);};
 const context=vm.createContext({ScenicCatalog:{},window:{SquidPlatform:host,addEventListener(){}},navigator:{platform},document:{getElementById:node,createElement:()=>node('canvas'),querySelectorAll:()=>[],addEventListener(){}},localStorage:{getItem:()=>null}});
 vm.runInContext(source,context);
 vm.runInContext('renderLibrary=()=>{};renderTransport=()=>{};transportIcon=()=>"";setTool=()=>{};toggleScenePlayback=()=>{};setupTools()',context);
 return [node('undo').title,node('redo').title];
}
for(const root of ['dist','ios/Resources/web']){
 const source=fs.readFileSync(root+'/app.js','utf8');
 for(const [host,platform] of [['Desktop','Win32'],[undefined,'Win32'],[undefined,'Linux x86_64']])assert.deepEqual(hints(source,host,platform),['Undo (Ctrl+Z)','Redo (Ctrl+Shift+Z)']);
 for(const [host,platform] of [['MacBook','MacIntel'],['iPad','MacIntel'],['iOS','iPhone'],[undefined,'MacIntel']])assert.deepEqual(hints(source,host,platform),['Undo (\u2318 Z)','Redo (\u2318 \u21e7 Z)']);
 assert.deepEqual(hints(source,'Desktop','MacIntel'),['Undo (Ctrl+Z)','Redo (Ctrl+Shift+Z)'],'Native platform identity wins over browser fallback');
}
console.log('Toolbar hints: Windows/Linux Ctrl; Mac/iPad/iPhone Command; native identity precedence; both shipped web copies.');
