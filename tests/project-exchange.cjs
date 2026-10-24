const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const events={},elements=new Map(),classes={add(){},remove(){},toggle(){}},context=new Proxy({measureText:()=>({width:10}),getTransform:()=>({}),createRadialGradient:()=>({addColorStop(){}})},{get:(o,k)=>o[k]||(()=>{})});
function element(id){if(!elements.has(id))elements.set(id,{id,style:{setProperty(){}},dataset:{},classList:classes,value:'',innerHTML:'',textContent:'',scrollTop:0,querySelectorAll:()=>[],setAttribute(){},getContext:()=>context,addEventListener:(name,fn)=>{if(id==='scene-canvas')events[name]=fn;},getBoundingClientRect:()=>({left:0,top:0,width:800,height:600}),focus(){},select(){},setPointerCapture(){},close(){},showModal(){}});return elements.get(id);}
const document={body:{inert:false},getElementById:element,createElement:()=>element('offscreen'),querySelector:selector=>selector==='dialog[open]'?null:element(selector),querySelectorAll:()=>[],documentElement:element('root'),addEventListener(){}};
const sandbox={Image:class{constructor(){this.complete=false;this.naturalWidth=0;}},document,window:{addEventListener(){},devicePixelRatio:1},TextEncoder,atob,btoa,localStorage:{getItem:()=>null,setItem(){}},console,structuredClone,performance:{now:()=>0},setTimeout:()=>1,clearTimeout(){},getComputedStyle:()=>({getPropertyValue:()=>''}),requestAnimationFrame(){},ResizeObserver:class{observe(){}},Path2D:class{},Blob,URL,crypto:require('node:crypto').webcrypto,innerWidth:1440};
sandbox.addEventListener=sandbox.window.addEventListener;sandbox.devicePixelRatio=1;sandbox.window=sandbox;
vm.createContext(sandbox);for(const name of ['engine','catalog','solar','shot-list','model','project-file','transforms','app','drawing','controls','selection','groups','workflow'])vm.runInContext(fs.readFileSync('dist/'+name+'.js','utf8').replace(/\ninit\(\);\s*$/,'\n'),sandbox,{filename:name+'.js'});
const run=code=>vm.runInContext(code,sandbox);
sandbox.ScenicProjectFile.checkImages=async()=>{}; // Actual decoding is covered in native WKWebView smoke.
let saved=[],deny=false,cancel=false;
sandbox.ScenicDesktop={request:async(action,payload)=>{if(action==='saveProject'){if(deny)throw Error('Disk full');saved.push(payload.project);return true;}return false;},exportFile:async()=>!cancel};
run("window.scenicReady=true;doc.name='Original work';scene().notes='Unsaved local edit';");
const fixture=fs.readFileSync('tests/assets/desktop-exchange.scenic','utf8');sandbox.fixture=fixture;
(async()=>{
 const before=run('JSON.stringify(workspaceData())');
 const count=run('workspace.projects.length');
 await run('importPortableProject(fixture)');
 assert.equal(saved.length,1);assert.equal(run('workspace.projects.length'),count+1);
 assert.equal(run('JSON.stringify(workspace.projects[0])'),JSON.stringify(JSON.parse(before).projects[0]));
 assert.equal(run('grid'),false);assert.equal(run('snap'),false);assert.equal(run("$('snap').checked"),false);
 const after=run('JSON.stringify(workspaceData())');
 deny=true;await assert.rejects(run('importPortableProject(fixture)'),/Disk full/);
 assert.equal(run('JSON.stringify(workspaceData())'),after);assert.equal(sandbox.document.body.inert,false);
 deny=false;await assert.rejects(run("importPortableProject('{invalid')"));assert.equal(run('JSON.stringify(workspaceData())'),after);
 cancel=true;await element('save-project').onclick();assert.equal(run('JSON.stringify(workspaceData())'),after);assert.equal(run('projectExchangeBusy'),false);
 await element('project-input').onchange({target:{files:[],value:''}});assert.equal(run('JSON.stringify(workspaceData())'),after);
 await element('project-input').onchange({target:{files:[{size:5,text:async()=>'{bad'}],value:'fake'}});assert.equal(run('JSON.stringify(workspaceData())'),after);
 run('undo()');assert.equal(run('JSON.stringify(workspaceData())'),before);
 const beforeLegacy=run('JSON.stringify(workspaceData())');
 sandbox.legacy=JSON.stringify(require('./fixtures/legacy-demo.js').project());
 await run('importPortableProject(legacy)');assert.equal(run('doc.scenes.length'),8);
 run('undo()');assert.equal(run('JSON.stringify(workspaceData())'),beforeLegacy);
 assert.equal(run('typeof loadDemoProduction'),'undefined');
 console.log('PASS: legacy saved demo remains importable without shipping demo creation/reset code.');
 console.log('PASS: staged import persists before activation; local edits retained; disk failure/malformed input/canceled Save As/canceled Import preserve workspace; settings and undo restore.');
})().catch(error=>{console.error(error);process.exitCode=1;});
