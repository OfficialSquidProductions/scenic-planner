const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const events={},elements=new Map(),classes={add(){},remove(){},toggle(){}},context=new Proxy({measureText:()=>({width:10}),getTransform:()=>({}),createRadialGradient:()=>({addColorStop(){}})},{get:(o,k)=>o[k]||(()=>{})});
function element(id){if(!elements.has(id))elements.set(id,{id,style:{setProperty(){}},dataset:{},classList:classes,value:'',innerHTML:'',textContent:'',scrollTop:0,querySelectorAll:()=>[],setAttribute(){},getContext:()=>context,addEventListener:(name,fn)=>{if(id==='scene-canvas')events[name]=fn;},getBoundingClientRect:()=>({left:0,top:0,width:800,height:600}),focus(){},select(){},setPointerCapture(){},close(){},showModal(){}});return elements.get(id);}
const document={getElementById:element,createElement:()=>element('offscreen'),querySelector:selector=>selector==='dialog[open]'?null:element(selector),querySelectorAll:()=>[],documentElement:element('root'),addEventListener(){}};
const sandbox={Image:class{constructor(){this.complete=false;this.naturalWidth=0;}},document,window:{addEventListener(){},devicePixelRatio:1},localStorage:{getItem:()=>null,setItem(){}},console,structuredClone,performance:{now:()=>0},setTimeout:()=>1,clearTimeout(){},getComputedStyle:()=>({getPropertyValue:()=>''}),requestAnimationFrame(){},ResizeObserver:class{observe(){}},Path2D:class{},Blob,URL,crypto:require('node:crypto').webcrypto,innerWidth:1440};
sandbox.addEventListener=sandbox.window.addEventListener;sandbox.devicePixelRatio=1;sandbox.window=sandbox;
vm.createContext(sandbox);for(const name of ['engine','catalog','solar','model','transforms','app','drawing','controls','selection','groups','workflow'])vm.runInContext(fs.readFileSync('dist/'+name+'.js','utf8').replace(/\ninit\(\);\s*$/,'\n'),sandbox,{filename:name+'.js'});
const run=code=>vm.runInContext(code,sandbox);
run("doc={version:1,projectId:'test',name:'Room editor',theme:'light',active:'s',scenes:[{id:'s',title:'Test',notes:'',ambient:30,objects:[]}]};workspace={version:2,activeProject:'test',projects:[doc]};view={x:0,y:0,z:1};renderLibrary('walls');");
assert.match(element('library').innerHTML,/data-category="walls"/);for(const name of ['room-square','room-rectangle','room-circle','room-l'])assert(element('library').innerHTML.includes(`data-asset="${name}"`));
run("addObject('asset:room-square',{x:400,y:300});");assert.equal(run('object().type'),'room');assert.match(element('inspector-content').innerHTML,/Keep proportions/);run('draw();');
const event=(x,y)=>({button:0,pointerId:1,clientX:x,clientY:y,preventDefault(){},shiftKey:false});
let handle=run("ScenicTransforms.handles(object(),1).find(h=>h.sx===1&&h.sy===1)");events.pointerdown(event(handle.x,handle.y));events.pointermove(event(handle.x+90,handle.y+90));events.pointerup(event(handle.x+90,handle.y+90));assert.equal(run('object().width'),522);assert.equal(run('object().height'),522);
run('undo();');assert.equal(run('scene().objects[0].width'),432);run('redo();');assert.equal(run('scene().objects[0].width'),522);
run('choose(scene().objects[0].id);');const wall=run('ScenicModel.roomSegments(object())[0]');events.pointerdown(event(wall.x+80,wall.y));events.pointermove(event(wall.x+110,wall.y+30));events.pointerup(event(wall.x+110,wall.y+30));assert.equal(run('object().x'),474);assert.equal(run('object().y'),375);
run("object().width=720;afterObjectChange(object(),'width');");assert.equal(run('object().height'),720);
const rotateHandle=run('ScenicTransforms.handles(object(),1)[0]'),center=run('({x:object().x,y:object().y})');
events.pointerdown(event(rotateHandle.x,rotateHandle.y));events.pointermove(event(center.x+center.y-rotateHandle.y,center.y));events.pointerup(event(center.x+center.y-rotateHandle.y,center.y));assert.equal(run('object().rotation'),90);
const beforeCancel=run('JSON.stringify(object())');handle=run('ScenicTransforms.handles(object(),1).find(h=>h.sx===1&&h.sy===1)');events.pointerdown(event(handle.x,handle.y));events.pointermove(event(handle.x+60,handle.y+60));events.pointercancel(event(handle.x+60,handle.y+60));assert.equal(run('JSON.stringify(object())'),beforeCancel);
run('duplicate();');assert.equal(run('scene().objects.length'),2);run('removeObject();');assert.equal(run('scene().objects.length'),1);
for(const name of ['room-rectangle','room-circle','room-l'])run(`addObject('asset:${name}',{x:400,y:300});draw();`);
assert(run('ScenicModel.validWorkspace(JSON.parse(JSON.stringify(workspaceData())))'));
run("const saved=JSON.stringify(workspaceData());loadWorkspace(JSON.parse(saved));refresh();draw();renderLibrary('props');renderLibrary('walls');");assert.equal(run("scene().objects.filter(o=>o.type==='room').length"),4);
console.log('Editor room workflow passed: library, placement, draw, pointer resize/move/rotate/cancel, undo/redo, exact size, duplicate/delete, and workspace reload.');
run("choose(scene().objects.find(o=>o.asset==='room-square').id);renderInspector();");assert.match(element('inspector-content').innerHTML,/Break into individual walls/);
run("const splitRoomId=selected,splitEdge=ScenicModel.roomSegments(object())[0];addObject('asset:window',{x:(splitEdge.x+splitEdge.x2)/2,y:(splitEdge.y+splitEdge.y2)/2});choose(splitRoomId);");
const beforeSplit=run('JSON.stringify(workspaceData())'),roomCount=run("scene().objects.filter(o=>o.type==='room').length");
element('break-room').onclick();assert.equal(run("scene().objects.filter(o=>o.type==='room').length"),roomCount-1);assert.equal(run("scene().objects.filter(o=>o.type==='wall').length"),4);assert.equal(run('object().type'),'wall');
assert.match(element('layer-list').innerHTML,/Wall 4/);
const beforeOtherWalls=run("JSON.stringify(scene().objects.filter(o=>o.type==='wall'&&o.id!==selected))");
run('snapshot();object().x+=30;object().x2+=30;commit();');assert.equal(run("JSON.stringify(scene().objects.filter(o=>o.type==='wall'&&o.id!==selected))"),beforeOtherWalls);
run('undo();undo();');assert.equal(run('JSON.stringify(workspaceData())'),beforeSplit);run('redo();');assert.equal(run('object()'),undefined);
run("choose(scene().objects.find(o=>o.type==='wall').id);removeObject();");assert.equal(run("scene().objects.filter(o=>o.type==='wall').length"),3);assert(run('ScenicModel.validProject(doc)'));
run('undo();undo();');assert.equal(run('JSON.stringify(workspaceData())'),beforeSplit);
run("choose(splitRoomId);breakRoom();choose(null);renderInspector();");element('duplicate-scene').onclick();assert(run('ScenicModel.validWorkspace(workspaceData())'));assert(run('scene().objects.find(ScenicModel.openingKind).wallIds.every(id=>scene().objects.some(w=>w.id===id))'));
console.log('Room separation editor workflow passed: Properties button, individually selectable layers, independent edits/deletion, and Undo/Redo.');

// Aim through the actual editor pointer handlers; each drag is one undoable edit.
for(const type of ['camera','light','actor']){
 run(`addObject('${type}',{x:400,y:300});`);const id=run('selected'),original=run('JSON.stringify(object())'),historyCount=run('history.length');
 const handle=run('ScenicTransforms.handles(object(),1)[0]'),c=run('({x:object().x,y:object().y})');
 events.pointerdown(event(handle.x,handle.y));events.pointermove(event(c.x-(handle.y-c.y),c.y+(handle.x-c.x)));events.pointerup(event(c.x-(handle.y-c.y),c.y+(handle.x-c.x)));
 assert.equal(run('history.length'),historyCount+1);assert.equal(run('object().x'),400);assert.equal(run('object().y'),300);
 assert(Math.abs(run('object().rotation')-(type==='camera'?0:type==='light'?45:90))<1e-7);assert.match(element('canvas-hint').textContent,type==='actor'?/Circle: facing direction/:/Circle: aim/);run('draw();');
 const aimed=run('JSON.stringify(object())');run(`undo();choose('${id}');`);assert.equal(run('JSON.stringify(object())'),original);run(`redo();choose('${id}');`);assert.equal(run('JSON.stringify(object())'),aimed);
 const h=run('ScenicTransforms.handles(object(),1)[0]');events.pointerdown(event(h.x,h.y));events.pointermove(event(h.x+50,h.y+50));events.pointercancel(event(h.x+50,h.y+50));assert.equal(run('JSON.stringify(object())'),aimed);
 assert(run('ScenicModel.validWorkspace(workspaceData())'));
}
console.log('Camera/light/talent pointer workflow passed: live aiming, stationary position, drawing, single-edit Undo/Redo, cancellation, and valid saved data.');

// Removing the library must not invalidate gear saved by earlier builds.
run("newProject();view={x:0,y:0,z:1};renderLibrary(null);");assert.doesNotMatch(element('library').innerHTML,/Open Gear library/);
run("renderLibrary('props');");assert.doesNotMatch(element('library').innerHTML,/data-category="gear"/);
for(const query of ['monitor','gear','apple box','boom']){run(`libraryQuery='${query}';renderLibrary('props');`);assert.doesNotMatch(element('library').innerHTML,/data-asset="(?:boom-mic|directors-monitor|apple-box-full)"|Gear ·/);}
run("libraryQuery='';for(const item of ScenicCatalog.items.filter(i=>i.category==='gear'))addObject('asset:'+item.id,{x:400,y:300});draw();");
assert.equal(run("scene().objects.filter(o=>o.type==='gear').length"),15);assert.equal(run("scene().objects.filter(o=>o.type==='camera').length"),0);
run("choose(scene().objects.find(o=>o.asset==='apple-box-full').id);");assert.equal(run('object().width'),60);assert.equal(run('object().height'),36);assert.match(element('inspector-content').innerHTML,/Production gear/);
const gearId=run('selected'),gearHandle=run('ScenicTransforms.handles(object(),1).find(h=>h.sx===1&&h.sy===1)');
events.pointerdown(event(gearHandle.x,gearHandle.y));events.pointermove(event(gearHandle.x+12,gearHandle.y+6));events.pointerup(event(gearHandle.x+12,gearHandle.y+6));
assert.equal(run('object().width'),72);assert.equal(run('object().height'),42);run(`undo();choose('${gearId}');`);assert.equal(run('object().width'),60);run(`redo();choose('${gearId}');`);assert.equal(run('object().width'),72);
run('object().x=100;object().y=100;object().rotation=90;afterObjectChange(object(),"rotation");draw();');assert.equal(run('hit({x:object().x,y:object().y+30}).id'),gearId);
const gearBefore=run('JSON.stringify(object())');run('duplicate();');assert.equal(run("scene().objects.filter(o=>o.type==='gear').length"),16);run('removeObject();');assert.equal(run("scene().objects.filter(o=>o.type==='gear').length"),15);
run(`choose('${gearId}');const savedGear=JSON.stringify(workspaceData());loadWorkspace(JSON.parse(savedGear));choose('${gearId}');refresh();draw();`);
assert.equal(run('JSON.stringify(object())'),gearBefore);assert(run('ScenicModel.validWorkspace(workspaceData())'));
run('object().width=0;');assert(!run('ScenicModel.validWorkspace(workspaceData())'));run('object().width=72;object().asset="laptop";');assert(!run('ScenicModel.validWorkspace(workspaceData())'));
console.log('Gear removal verified: no library tab/search results; previously saved gear retains editing, drawing, Undo/Redo and save/reload compatibility.');
// Wall grouping through the actual selection, Properties, and pointer handlers.
run(`doc={version:1,projectId:'group-project',name:'Grouping test',theme:'light',active:'group-scene',scenes:[{id:'group-scene',title:'Group scene',notes:'',ambient:30,objects:[
{id:'ga',type:'wall',name:'Top',x:220,y:180,x2:580,y2:180,thickness:9},
{id:'gb',type:'wall',name:'Right',x:580,y:180,x2:580,y2:420,thickness:9},
{id:'gc',type:'wall',name:'Bottom',x:580,y:420,x2:220,y2:420,thickness:9},
{id:'gd',type:'wall',name:'Left',x:220,y:420,x2:220,y2:180,thickness:9},
{id:'gw',type:'set',asset:'window',name:'Window',x:400,y:180,width:90,height:24,rotation:0,curtains:false,wallId:'ga',wallT:.5}
]}]};workspace={version:2,activeProject:doc.projectId,projects:[doc]};history=[];future=[];choose(null);view={x:0,y:0,z:1};snap=false;setTool('select');refresh();`);
const groupFixture=run('JSON.stringify(workspaceData())'),groupEvent=(x,y,shift=false)=>({...event(x,y),shiftKey:shift});
events.pointerdown(groupEvent(310,180));events.pointerup(groupEvent(310,180));assert.equal(run('object().id'),'ga');
events.pointerdown(groupEvent(580,260,true));events.pointerup(groupEvent(580,260,true));assert.equal(run('wallSelection().length'),2);assert.equal(run('selectionHandleTarget()'),null);assert.match(element('inspector-content').innerHTML,/Group selected walls/);
element('group-walls').onclick();assert.equal(run('object().type'),'wallGroup');assert.equal(run('object().wallIds.length'),2);assert.match(element('inspector-content').innerHTML,/Ungroup walls/);assert.match(element('layer-list').innerHTML,/2 walls/);run('draw();');
const groupUnselected=run("JSON.stringify(scene().objects.filter(o=>['gc','gd'].includes(o.id)))");
events.pointerdown(groupEvent(310,180));events.pointermove(groupEvent(340,210));events.pointerup(groupEvent(340,210));assert.equal(run('object().x'),430);assert.equal(run('object().y'),330);assert.equal(run("scene().objects.find(o=>o.id==='gw').x"),430);assert.equal(run("scene().objects.find(o=>o.id==='gw').y"),210);
let groupHandle=run('ScenicTransforms.handles(object(),1).find(h=>h.sx===1&&h.sy===1)');events.pointerdown(groupEvent(groupHandle.x,groupHandle.y));events.pointermove(groupEvent(groupHandle.x+90,groupHandle.y+60));events.pointerup(groupEvent(groupHandle.x+90,groupHandle.y+60));assert.equal(run('object().width'),450);assert.equal(run('object().height'),300);
const groupBeforeCancel=run('JSON.stringify(workspaceData())');groupHandle=run('ScenicTransforms.handles(object(),1).find(h=>h.sx===1&&h.sy===1)');events.pointerdown(groupEvent(groupHandle.x,groupHandle.y));events.pointermove(groupEvent(groupHandle.x+120,groupHandle.y+90));events.pointercancel(groupEvent(groupHandle.x+120,groupHandle.y+90));assert.equal(run('JSON.stringify(workspaceData())'),groupBeforeCancel);
const groupRotate=run('ScenicTransforms.handles(object(),1)[0]'),groupCenter=run('({x:object().x,y:object().y})');events.pointerdown(groupEvent(groupRotate.x,groupRotate.y));events.pointermove(groupEvent(groupCenter.x+groupCenter.y-groupRotate.y,groupCenter.y));events.pointerup(groupEvent(groupCenter.x+groupCenter.y-groupRotate.y,groupCenter.y));assert.equal(run('object().rotation'),90);
assert.equal(run("JSON.stringify(scene().objects.filter(o=>['gc','gd'].includes(o.id)))"),groupUnselected);assert.equal(run("scene().objects.find(o=>o.id==='gw').wallId"),'ga');assert(run('ScenicModel.validWorkspace(workspaceData())'));
run('undo();undo();undo();undo();');assert.equal(run('JSON.stringify(workspaceData())'),groupFixture);run('redo();');assert.equal(run("scene().objects.filter(o=>o.type==='wallGroup').length"),1);
run("choose(scene().objects.find(o=>o.type==='wallGroup').id);object().keepProportions=true;const sizeInput={value:'20 ft',dataset:{prop:'width',min:'1.5',max:'5000',before:JSON.stringify(workspaceData())},setCustomValidity(){},reportValidity(){}};updateLength(sizeInput);");assert.equal(run('object().width'),720);assert.equal(run('object().height'),480);assert(run('ScenicModel.validProject(doc)'));
const groupedGeometry=run("JSON.stringify(scene().objects.filter(o=>o.type==='wall'))");element('ungroup-walls').onclick();assert.equal(run("scene().objects.filter(o=>o.type==='wallGroup').length"),0);assert.equal(run("JSON.stringify(scene().objects.filter(o=>o.type==='wall'))"),groupedGeometry);assert.equal(run('wallSelection().length'),2);
element('group-walls').onclick();run('duplicate();');assert.equal(run("scene().objects.filter(o=>o.type==='wallGroup').length"),2);assert(run('ScenicModel.validProject(doc)'));run('removeObject();');assert.equal(run("scene().objects.filter(o=>o.type==='wallGroup').length"),1);assert.equal(run("scene().objects.filter(o=>o.type==='wall').length"),4);
run("choose('gc');");element('select-multiple-walls').onclick();assert.equal(run('wallMultiSelect'),true);events.pointerdown(groupEvent(220,300));events.pointerup(groupEvent(220,300));assert.equal(run('wallSelection().length'),2);assert.equal(run('wallMultiSelect'),true);element('clear-wall-selection').onclick();assert.equal(run('wallSelection().length'),0);assert.equal(run('wallMultiSelect'),false);
run('choose(null);renderInspector();');element('duplicate-scene').onclick();assert(run('ScenicModel.validWorkspace(workspaceData())'));run('const groupSaved=JSON.stringify(workspaceData());loadWorkspace(JSON.parse(groupSaved));refresh();draw();');assert(run('ScenicModel.validWorkspace(workspaceData())'));
console.log('Wall grouping editor workflow passed: Shift-click and selection mode, Group/Ungroup, member picking, move/resize/rotate/cancel, exact proportional dimensions, independent unselected walls, attached openings, duplicate/delete, scene duplication, Undo/Redo, and reload.');
// Generic selection must not mutate the document or add selection-only Undo entries.
run(`doc={version:1,projectId:'box-project',name:'Box selection test',theme:'light',active:'box-scene',scenes:[{id:'box-scene',title:'Marquee',notes:'',ambient:30,objects:[
{id:'box-wall',type:'wall',name:'Box wall',x:100,y:100,x2:350,y2:100,thickness:9},
{id:'box-prop',type:'prop',asset:'laptop',name:'Box prop',x:150,y:200,width:60,height:30,rotation:30},
{id:'box-light',type:'light',name:'Box light',x:300,y:200,rotation:0,power:75,radius:400,beam:100,temperature:3200,enabled:true},
{id:'box-actor',type:'actor',name:'Outside talent',x:600,y:400,rotation:0,color:'#cf7d96'},
{id:'box-image',type:'image',name:'Locked reference',x:400,y:300,width:800,height:600,rotation:0,opacity:50,src:'data:image/png;base64,AA==',locked:true}
]}]};workspace={version:2,activeProject:doc.projectId,projects:[doc]};history=[];future=[];choose(null);view={x:0,y:0,z:1};snap=false;setTool('select');refresh();`);
const boxFixture=run('JSON.stringify(workspaceData())');
events.pointerdown(groupEvent(80,80));assert.equal(run('drag.mode'),'marquee');events.pointermove(groupEvent(340,230));assert.equal(run('selectionItems().length'),3);run('draw();');events.pointerup(groupEvent(340,230));assert.equal(run('history.length'),0);assert.equal(run('JSON.stringify(workspaceData())'),boxFixture);assert.match(element('inspector-content').innerHTML,/3 items selected/);assert.equal(run('selectionHandleTarget()'),null);
const boxIds=run('selectionItems().map(o=>o.id).join()');assert.equal(boxIds,'box-wall,box-prop,box-light');assert.match(element('layer-list').innerHTML,/aria-pressed="true"/);
events.pointerdown(groupEvent(150,200));assert.equal(run('drag.mode'),'move-selection');events.pointermove(groupEvent(180,245));events.pointerup(groupEvent(180,245));assert.equal(run('history.length'),1);assert.equal(run("scene().objects.find(o=>o.id==='box-prop').x"),180);assert.equal(run("scene().objects.find(o=>o.id==='box-wall').x2"),380);assert.equal(run("scene().objects.find(o=>o.id==='box-light').y"),245);assert.equal(run("scene().objects.find(o=>o.id==='box-actor').x"),600);assert.equal(run("scene().objects.find(o=>o.id==='box-image').x"),400);
run('undo();');assert.equal(run('JSON.stringify(workspaceData())'),boxFixture);
// Reverse-direction box selects the same items, Shift-box adds, and Shift-click removes.
events.pointerdown(groupEvent(340,230));events.pointermove(groupEvent(80,80));events.pointerup(groupEvent(80,80));assert.equal(run('selectionItems().map(o=>o.id).join()'),boxIds);
events.pointerdown(groupEvent(550,350,true));events.pointermove(groupEvent(640,440,true));events.pointerup(groupEvent(640,440,true));assert.equal(run('selectionItems().length'),4);
events.pointerdown(groupEvent(600,400,true));events.pointerup(groupEvent(600,400,true));assert.equal(run('selectionItems().length'),3);
const beforeBoxCancel=run('selectionItems().map(o=>o.id).join()');events.pointerdown(groupEvent(550,350));events.pointermove(groupEvent(640,440));assert.equal(run('selectionItems().length'),1);events.pointercancel(groupEvent(640,440));assert.equal(run('selectionItems().map(o=>o.id).join()'),beforeBoxCancel);
events.pointerdown(groupEvent(150,200));events.pointermove(groupEvent(200,250));events.pointercancel(groupEvent(200,250));assert.equal(run('JSON.stringify(workspaceData())'),boxFixture);assert.equal(run('selectionItems().map(o=>o.id).join()'),beforeBoxCancel);
run('nudgeSelection(3,6);');assert.equal(run("scene().objects.find(o=>o.id==='box-prop').x"),153);run('undo();');assert.equal(run('JSON.stringify(workspaceData())'),boxFixture);
// Explicit box tool works even when the drag starts over an item, then returns to Select.
run("setTool('marquee');");events.pointerdown(groupEvent(150,200));assert.equal(run('drag.mode'),'marquee');events.pointermove(groupEvent(340,230));events.pointerup(groupEvent(340,230));assert.equal(run('selectionItems().length'),2);assert.equal(run('tool'),'select');
run('duplicate();');assert.equal(run('selectionItems().length'),2);assert.equal(run('scene().objects.length'),7);assert(run('ScenicModel.validWorkspace(workspaceData())'));run('removeObject();');assert.equal(run('scene().objects.length'),5);run('undo();undo();');assert.equal(run('JSON.stringify(workspaceData())'),boxFixture);
// Empty click clears; a tiny accidental movement stays a click and creates no document edit.
events.pointerdown(groupEvent(20,20));events.pointermove(groupEvent(21,21));events.pointerup(groupEvent(21,21));assert.equal(run('selectionItems().length'),0);assert.equal(run('JSON.stringify(workspaceData())'),boxFixture);
console.log('Mixed box-selection editor workflow passed: live box drawing, forward/reverse drags, Shift add/remove, explicit tool, locked images, multi-move/nudge/duplicate/delete, cancellation, selection-only history, and Undo.');

// Exact scale through editor actions, independent of the display text.
run("addObject('asset:room-rectangle',{x:400,y:300});");assert.equal(run('object().thickness'),13.5);assert.match(element('inspector-content').innerHTML,/Inside width/);assert.match(element('inspector-content').innerHTML,/Centerline width/);
const lengthInput=(prop,value,inside=false)=>({value,dataset:{prop,min:inside?'22.5':'1.5',max:inside?'4986.5':'5000',inside:inside?'true':'',before:run('JSON.stringify(workspaceData())')},setCustomValidity(message){this.error=message;},reportValidity(){}});
sandbox.scaleInput=lengthInput('width','12 ft',true);run('updateLength(scaleInput);');assert.equal(run('object().width'),445.5);assert.equal(run('object().height'),432);assert.equal(sandbox.scaleInput.value,'12 ft');
sandbox.scaleInput=lengthInput('height','10 ft',true);run('updateLength(scaleInput);');assert.equal(run('object().height'),373.5);
const widthFields=[lengthInput('width',''),lengthInput('width','',true)],heightFields=[lengthInput('height',''),lengthInput('height','',true)],oldQueryAll=document.querySelectorAll;
document.querySelectorAll=selector=>selector==='[data-prop="width"][data-length]'?widthFields:selector==='[data-prop="height"][data-length]'?heightFields:[];
run("object().thickness=18;afterObjectChange(object(),'thickness');");assert.equal(widthFields[0].value,'12 ft 4.5 in');assert.equal(widthFields[1].value,'11 ft 10.5 in');assert.equal(heightFields[1].value,'9 ft 10.5 in');assert.equal(widthFields[1].dataset.max,4982);
document.querySelectorAll=oldQueryAll;
run("addObject('actor',{x:400,y:300});");assert.equal(run('object().width'),54);assert.equal(run('object().height'),72);assert.match(element('inspector-content').innerHTML,/Across shoulders/);
sandbox.scaleInput=lengthInput('height','30 in');run('updateLength(scaleInput);');assert.equal(run('object().height'),90);assert.equal(run('object().width'),54);assert(run('hit({x:400,y:343})===object()'));
run("scene().objects=[];scene().objects.push({id:'calibration',type:'image',name:'Plan',x:400,y:300,width:600,height:300,rotation:0,opacity:65,locked:false,src:'data:image/png;base64,AA=='});choose('calibration');");
sandbox.scaleInput=lengthInput('width','10 ft');run('updateLength(scaleInput);');assert.equal(run('object().width'),360);assert.equal(run('object().height'),180);
run("object().keepProportions=false;afterObjectChange(object(),'keepProportions');");sandbox.scaleInput=lengthInput('height','9 ft');run('updateLength(scaleInput);');assert.equal(run('object().width'),360);assert.equal(run('object().height'),324);
run("object().keepProportions=true;afterObjectChange(object(),'keepProportions');renderInspector();");handle=run('ScenicTransforms.handles(object(),1).find(h=>h.sx===1&&h.sy===0)');events.pointerdown(event(handle.x,handle.y));events.pointermove(event(handle.x+36,handle.y));events.pointerup(event(handle.x+36,handle.y));assert(Math.abs(run('object().width')-396)<1e-7);assert(Math.abs(run('object().height')-356.4)<1e-7);assert(run('ScenicModel.validProject(doc)'));
const drawnScales=[],drawnTranslations=[],drawnRects=[];context.scale=(...args)=>drawnScales.push(args);context.translate=(...args)=>drawnTranslations.push(args);context.rect=(...args)=>drawnRects.push(args);
run("drawDressing({type:'prop',asset:'phone',x:400,y:300,width:9,height:18,rotation:0});");assert.deepEqual(drawnScales.pop(),[9/20,18/24]);assert.deepEqual(drawnTranslations.pop(),[-2,-0]);assert.deepEqual(drawnRects.pop(),[0,0,9,18]);
const scaleText=[],scaleLines=[];context.fillText=(...args)=>scaleText.push(args);context.lineTo=(...args)=>scaleLines.push(args);
for(const zoom of [.25,1,4]){run(`view.z=${zoom};drawScaleBar(105);`);assert.equal(scaleText.at(-1)[0],zoom<.65?'5 ft':'1 ft');assert.deepEqual(scaleLines.at(-1),[22+(zoom<.65?180:36)*zoom,105]);}
run('draw();');
console.log('Editor scale workflows passed: inside/centerline room sizes and thickness readouts, editable actor footprints and picking, reference-image calibration and proportions, physical artwork transforms/clipping, and export-position scale bars across zoom.');

run("scene().objects=[];addObject('camera',{x:400,y:300});object().rotation=0;renderInspector();");
assert.equal(run('object().sensorWidth'),36);assert.equal(run('object().viewDistance'),360);assert.match(element('inspector-content').innerHTML,/Horizontal view: 39.6°/);assert.doesNotMatch(element('inspector-content').innerHTML,/data-prop="fov"/);
const lensEvents={},lensField={dataset:{prop:'lens'},type:'number',min:'8',max:'600',value:'50',addEventListener:(name,fn)=>lensEvents[name]=fn};
document.querySelectorAll=selector=>selector==='[data-prop]'?[lensField]:[];run('renderInspector();');document.querySelectorAll=oldQueryAll;
const cameraBefore=run('JSON.stringify(object())'),cameraHistory=run('history.length');lensEvents.focus();lensField.value='24';lensEvents.input();assert.equal(run('object().lens'),24);assert.equal(run('history.length'),cameraHistory+1);assert.match(element('.camera-view-readout').textContent,/73.7°.*15 ft/);
const cameraAfter=run('JSON.stringify(object())');run('undo();choose(scene().objects[0].id);');assert.equal(run('JSON.stringify(object())'),cameraBefore);run('redo();choose(scene().objects[0].id);');assert.equal(run('JSON.stringify(object())'),cameraAfter);
run("object().sensorWidth=24;afterObjectChange(object(),'sensorWidth');");assert.match(element('.camera-view-readout').textContent,/53.1°.*10 ft/);
sandbox.scaleInput=lengthInput('viewDistance','20 ft');run('updateLength(scaleInput);');assert.equal(run('object().viewDistance'),720);assert.match(element('.camera-view-readout').textContent,/Width at 20 ft: 20 ft/);
const coverageLines=[];context.lineTo=(...args)=>coverageLines.push(args);run('drawCameraCoverage(object(),[]);');assert.equal(coverageLines.length,2);coverageLines.flat().forEach((n,i)=>assert(Math.abs(n-[1120,-60,1120,660][i])<1e-7));
run('fit();');const viewport=run('({x:view.x,y:view.y,z:view.z,w:size.w,h:size.h})');for(const [x,y] of coverageLines){assert(x*viewport.z+viewport.x>=0&&x*viewport.z+viewport.x<=viewport.w);assert(y*viewport.z+viewport.y>=0&&y*viewport.z+viewport.y<=viewport.h);}
run('draw();');assert(run('ScenicModel.validProject(JSON.parse(JSON.stringify(doc)))'));
console.log('Lens editor workflow passed: live input-driven outline/readout, removal of independent angle control, one-edit Undo/Redo, sensor cropping, exact viewing distance, rendered frustum vertices, Fit scene, and save/reload validity.');

// Geographic Sun through the same inspector bindings used by the native app.
run("scene().objects=[];addObject('asset:sun',{x:400,y:300});");
const sunId=run('selected');
function sunInput(prop,type,value,extra={}){
 const handlers={},field={dataset:{prop,...(extra.dataset||{})},type,value,min:extra.min??'',max:extra.max??'',checked:extra.checked,addEventListener:(name,fn)=>handlers[name]=fn};
 document.querySelectorAll=selector=>selector==='[data-prop]'?[field]:[];run('renderInspector();');document.querySelectorAll=oldQueryAll;
 handlers.focus();handlers.input();return field;
}
sunInput('solarReal','checkbox','',{checked:true});assert(run('object().solarReal'));assert.match(element('inspector-content').innerHTML,/SHOOT LOCATION/);assert.match(element('.sun-readout').textContent,/Enter the shoot latitude/);assert(run('ScenicModel.validWorkspace(workspaceData())'));
sunInput('latitude','number','40.7128',{min:'-90',max:'90',dataset:{nullable:'true'}});sunInput('longitude','number','-74.0060',{min:'-180',max:'180',dataset:{nullable:'true'}});sunInput('shootDate','date','2026-06-21');sunInput('timeZone','text','America/New_York');
const sunBeforeTime=run('JSON.stringify(object())'),sunHistory=run('history.length');sunInput('time','time','17:35',{dataset:{clock:'true'}});assert.equal(run('object().time'),17+35/60);assert.equal(element('out-time').textContent,'17:35');assert.equal(run('history.length'),sunHistory+1);assert.match(element('.sun-readout').textContent,/17:35.*bearing/);assert.match(element('.sun-readout').textContent,/Sunrise 05:25 · Sunset 20:31/);
const sunAfterTime=run('JSON.stringify(object())');run(`undo();choose('${sunId}');`);assert.equal(run('JSON.stringify(object())'),sunBeforeTime);run(`redo();choose('${sunId}');`);assert.equal(run('JSON.stringify(object())'),sunAfterTime);
const previousAngle=run('ScenicModel.sunState(object()).rayAngle');sunInput('northAngle','range','90',{min:'0',max:'360'});assert(Math.abs(run('ScenicModel.sunState(object()).rayAngle')-previousAngle-Math.PI/2)<1e-8);run('draw();draw(true);');
sunInput('time','time','00:00',{dataset:{clock:'true'}});assert.equal(run('ScenicModel.sunState(object()).strength'),0);assert.match(element('.sun-readout').textContent,/Sun below horizon/);
sunInput('shootDate','date','2026-03-08');sunInput('time','time','02:30',{dataset:{clock:'true'}});assert.match(element('.sun-readout').textContent,/skipped by daylight saving/);
sunInput('latitude','number','',{dataset:{nullable:'true'}});assert.equal(run('object().latitude'),null);assert(run('ScenicModel.validProject(doc)'));run('const solarSaved=JSON.stringify(workspaceData());loadWorkspace(JSON.parse(solarSaved));refresh();');assert(run('ScenicModel.validWorkspace(workspaceData())'));
run(`choose('${sunId}');`);sunInput('solarReal','checkbox','',{checked:false});assert.match(element('inspector-content').innerHTML,/Rises from/);assert.doesNotMatch(element('inspector-content').innerHTML,/SHOOT LOCATION/);
console.log('Solar editor workflow passed: geographic toggle/setup, exact local time, live readout, one-edit Undo/Redo, true-north rotation, map/export draw, night, DST warning, unfinished setup, save/reload, and legacy manual mode.');
