const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {SceneBrowser}=require('../windows/scene-browser.cjs');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
async function editorChecks(){
 const requests=[],timers=[],drawn=[];let fail=false;
 const mainCanvas={name:'main'},mainContext={name:'main-context'},originalView={x:3,y:4,z:2},originalSize={w:800,h:600},selection=new Set(['camera-1']);
 const production={projectId:'production-1',name:'Synthetic <production>',theme:'dark',active:'scene-1',scenes:[{id:'scene-1',title:'First <scene>',objects:[]},{id:'scene-2',title:'Second scene',objects:[]}]};
 const button={},context=vm.createContext({URL,location:{href:'file:///app/web/index.html',origin:'null'},window:{ScenicDesktop:{request:async(action,payload)=>{requests.push({action,payload});return true;}},addEventListener(){}},$:()=>button,doc:production,canvas:mainCanvas,ctx:mainContext,view:originalView,size:originalSize,selected:'camera-1',selectedIds:selection,playback:{start:1},document:{createElement:()=>({getContext:()=>({drawImage(){}}),toDataURL:()=> 'data:image/jpeg;base64,c3ludGhldGlj'})},imageFor(){throw Error('Unexpected image load');},fit(){context.view={x:0,y:0,z:.5};},draw(){drawn.push(production.active);if(fail)throw Error('Synthetic renderer failure');},updateZoom(){},invalidate(){},setTimeout:fn=>{timers.push(fn);return timers.length;},clearTimeout(){},toast:message=>{throw Error(message);},activateScene:id=>{if(!production.scenes.some(s=>s.id===id))return false;production.active=id;return true;}});
 vm.runInContext(fs.readFileSync('dist/scene-browser.js','utf8'),context);
 const api=context.window.ScenicSceneBrowser;
 await button.onclick();assert.equal(requests[0].action,'openSceneBrowser');assert.equal(requests[0].payload.snapshot.scenes[1].number,2);assert.equal(requests[0].payload.snapshot.scenes[0].title,'First <scene>');
 const before=JSON.stringify(production),playback=context.playback;
 assert.match(await api.preview('production-1','scene-2'),/^data:image\/jpeg/);assert.deepEqual(drawn,['scene-2']);
 assert.equal(JSON.stringify(production),before);assert.equal(context.canvas,mainCanvas);assert.equal(context.ctx,mainContext);assert.equal(context.view,originalView);assert.equal(context.size,originalSize);assert.equal(context.selectedIds,selection);assert.equal(context.selected,'camera-1');assert.equal(context.playback,playback);
 await api.preview('production-1','scene-2');assert.equal(drawn.length,1,'Unchanged previews use the cache');
 api.changed();fail=true;assert.equal(await api.preview('production-1','scene-1'),null);assert.equal(JSON.stringify(production),before);assert.equal(context.canvas,mainCanvas);assert.equal(context.view,originalView);
 assert.equal(await api.preview('stale-production','scene-1'),null);assert.equal(api.select('stale-production','scene-2'),false);assert.equal(api.select('production-1','deleted-scene'),false);assert.equal(api.select('production-1','scene-2'),true);
 timers.at(-1)();await tick();assert.equal(requests.at(-1).action,'updateSceneBrowser');
 api.closed();const count=requests.length;api.changed();assert.equal(requests.length,count);
}
async function nativeChecks(){
 const windows=[],editorScripts=[];let focusCount=0,selectionResult=true;
 const editor={webContents:{async executeJavaScript(code){editorScripts.push(code);return code.includes('.select(')?selectionResult:'data:image/jpeg;base64,c3ludGhldGlj';}},isMinimized:()=>false,show(){},focus(){focusCount++;}};
 function BrowserWindow(options){this.options=options;this.events={};this.webEvents={};this.webContents={mainFrame:{},setWindowOpenHandler:fn=>{this.openHandler=fn;},on:(name,fn)=>{this.webEvents[name]=fn;},executeJavaScript:async code=>{this.renderScript=code;}};this.on=(name,fn)=>{this.events[name]=fn;};this.loadURL=async url=>{this.url=url;this.webContents.mainFrame.url=url;};this.setTitle=title=>{this.title=title;};this.show=this.focus=()=>{};windows.push(this);}
 const browser=new SceneBrowser({BrowserWindow,win:editor,rootURL:'file:///app/web/index.html',preload:'/app/preload.cjs'});
 const snapshot={productionId:'p1',name:'Synthetic production',active:'s1',theme:'dark',revision:0,scenes:[{id:'s1',title:'Scene 1',number:1}]};
 await browser.update(snapshot,true);assert.equal(windows.length,1);const window=windows[0];assert.equal(window.options.webPreferences.contextIsolation,true);assert.equal(window.options.webPreferences.sandbox,true);assert.equal(window.options.webPreferences.nodeIntegration,false);assert.deepEqual(window.openHandler(),{action:'deny'});
 let prevented=false;window.webEvents['will-navigate']({preventDefault(){prevented=true;}},'https://example.com');assert(prevented);
 const event={sender:window.webContents,senderFrame:window.webContents.mainFrame};assert(browser.accepts(event));assert(!browser.accepts({...event,senderFrame:{url:window.url}}));assert(!browser.accepts({...event,sender:{}}));
 assert.equal(await browser.request('sceneBrowserReady'),snapshot);await assert.rejects(browser.request('readProject'),/Unsupported/);await assert.rejects(browser.request('saveProject',{project:'anything'}),/Unsupported/);await assert.rejects(browser.request('exportFile',{}),/Unsupported/);
 await browser.request('scenePreview',{productionId:'p1',sceneId:'s1'});assert.equal(focusCount,0);
 assert.equal(await browser.request('selectScene',{productionId:'p1',sceneId:'s1'}),true);assert.equal(focusCount,1);
 selectionResult=false;assert.equal(await browser.request('selectScene',{productionId:'old',sceneId:'deleted'}),false);assert.equal(focusCount,1);
 await browser.update({...snapshot,name:'Renamed'},true);assert.equal(windows.length,1);assert.equal(window.title,'Renamed · Scenes · Scenic');assert.match(window.renderScript,/Renamed/);
 await assert.rejects(browser.update({...snapshot,scenes:[{id:'bad'}]},true),/Invalid/);
 window.events.closed();assert.equal(browser.window,null);assert(!browser.accepts(event));assert.match(editorScripts.at(-1),/closed/);
}
(async()=>{await editorChecks();await nativeChecks();console.log('Scene browser passed: numbered metadata, real-renderer state restoration, failure recovery, preview caching, scene selection, stale IDs, live updates, window reuse, caller validation, and restricted native actions.');})().catch(error=>{console.error(error);process.exitCode=1;});
