/* Runs in real WKWebView on macOS/iOS. DOM events test the production controller;
   XCTest separately supplies real touch input, including scrolling and rotation. */
const checks=[],layouts=[],original=JSON.stringify(workspaceData());
const assert=(ok,message)=>{if(!ok)throw Error(message);checks.push(message);};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const root=document.documentElement,originalCapture=canvas.setPointerCapture;canvas.setPointerCapture=()=>{};
const pointer=(target,type,x,y,extra={})=>target.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerId:91,pointerType:'mouse',button:0,buttons:type==='pointerup'?0:1,clientX:x,clientY:y,...extra}));
function destination(){const r=canvas.getBoundingClientRect();return {x:r.left+r.width*.57,y:r.top+r.height*.48};}
function openLibrary(mode){if(root.classList.contains('ipad-app')){$('workspace-menu').click();if(!document.querySelector('.sidebar.mobile-open'))$('workspace-menu').click();}renderLibrary(mode);}
function mouseDrop(button,p=destination(),cancel){
 const r=button.getBoundingClientRect();pointer(button,'pointerdown',r.left+8,r.top+8);pointer(button,'pointermove',p.x,p.y);
 if(cancel==='escape')window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));
 else if(cancel==='resize')window.dispatchEvent(new Event('resize'));
 else if(cancel==='pointercancel')pointer(button,'pointercancel',p.x,p.y);
 pointer(button,'pointerup',p.x,p.y);
 document.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,detail:1}));
}
try{
 const first=blankScene();loadWorkspace({version:1,projectId:uid(),name:'Palette drag QA',active:first.id,theme:'light',scenes:[first]});applyTheme();refresh();showShots(false);resize();
 if(root.classList.contains('ipad-app')){const p=$('ipad-properties');if(p?.getAttribute('aria-pressed')==='true')p.click();}
 view={x:37.5,y:-28.25,z:1.65};snap=true;
 if(root.classList.contains('phone-app')){openLibrary('props');libraryQuery='Mug';renderLibrary('props');for(const id of ['sidebar-panel','library-heading','library-search','library','import-image']){const el=$(id),r=el.getBoundingClientRect(),s=getComputedStyle(el);layouts.push({id,rect:{x:r.x,y:r.y,w:r.width,h:r.height},height:s.height,minHeight:s.minHeight,flex:s.flex,overflow:s.overflow});}const b=$('library').querySelector('[data-asset="mug"]');layouts.push({id:'mug',rect:JSON.stringify(b.getBoundingClientRect())});libraryQuery='';renderLibrary(null);}

 if(!window.ScenicIPad){
  openLibrary(null);const button=$('library').querySelector('[data-tool="camera"]'),r=button.getBoundingClientRect(),p=destination();pointer(button,'pointerdown',r.left+8,r.top+8);pointer(button,'pointermove',p.x,p.y);
  assert(!$('palette-drop-marker').hidden&&$('palette-drag-preview').textContent.includes('Drop to add'),'Valid target has visible marker and explicit feedback');
  await ScenicDesktop.request('capturePalette');window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));
 }
 for(const mode of [null,'props','walls','set','lights']){
  openLibrary(mode);
  const items=Array.from($('library').querySelectorAll('[data-asset],[data-tool]')).filter(b=>!b.disabled&&b.dataset.tool!=='wall');
  // The palette rerenders after commits, so reacquire each source by its token.
  const tokens=items.map(b=>[b.dataset.asset,b.dataset.tool]);
  for(const [asset,kind]of tokens){
   openLibrary(mode);const button=$('library').querySelector(asset?`[data-asset="${asset}"]`:`[data-tool="${kind}"]`),n=scene().objects.length,h=history.length,p=destination(),expected=snapped(world({clientX:p.x,clientY:p.y}));
   mouseDrop(button,p);const o=object();
   assert(scene().objects.length===n+1&&history.length===Math.min(60,h+1),'One history entry and object: '+(asset||kind));
   assert(o&&o.x===expected.x&&o.y===expected.y,'Pan/zoom/snapped coordinates: '+(asset||kind));
   if(asset){const c=ScenicCatalog.get(asset);assert(o.asset===asset&&o.width===c.width&&o.height===c.height,'Catalog dimensions: '+asset);if(c.category==='lights')assert(o.power!==undefined&&o.enabled===true,'Light preset: '+asset);}
   assert(tool==='select'&&document.querySelector('#palette-drag-preview').hidden,'Drop selected and gesture cleaned: '+(asset||kind)+' tool='+tool+' hidden='+document.querySelector('#palette-drag-preview').hidden);
  }
 }
 const expectedCount=scene().objects.length,expectedJSON=JSON.stringify(scene().objects);undo();assert(scene().objects.length===expectedCount-1,'Undo removes one dropped item');redo();assert(JSON.stringify(scene().objects)===expectedJSON,'Redo restores exact dropped object');
 for(const method of ['outside','escape','resize','pointercancel']){
  openLibrary(null);const button=$('library').querySelector('[data-tool="camera"]'),before=JSON.stringify(workspaceData()),h=history.length,oldTool=tool;
  mouseDrop(button,method==='outside'?{x:innerWidth-3,y:3}:destination(),method);
  assert(JSON.stringify(workspaceData())===before&&history.length===h&&tool===oldTool,'Cancelled '+method+' does not mutate workspace/tool/history');
 }
 openLibrary(null);showShots(true);let before=scene().objects.length;mouseDrop($('library').querySelector('[data-tool="camera"]'));assert(scene().objects.length===before,'Shot list rejects palette drops');showShots(false);
 openLibrary(null);snap=false;view={x:-117.25,y:86.75,z:.67};let p=destination(),expected=world({clientX:p.x,clientY:p.y});mouseDrop($('library').querySelector('[data-tool="actor"]'),p);assert(Math.abs(object().x-expected.x)<1e-8&&Math.abs(object().y-expected.y)<1e-8,'Unsnapped pan/zoom retains fractional coordinates');
 openLibrary('walls');before=scene().objects.length;p=destination();expected=world({clientX:p.x,clientY:p.y});mouseDrop($('library').querySelector('[data-tool="wall"]'),p);assert(scene().objects.length===before&&tool==='wall'&&wallStart.x===expected.x,'Straight-wall drop starts existing two-point tool');
 pointer(canvas,'pointerdown',p.x+75,p.y+30);pointer(canvas,'pointerup',p.x+75,p.y+30);assert(scene().objects.length===before+1&&object().type==='wall','Wall endpoint finishes one undoable wall');setTool('select');
 // Touch events use the same browser input path as physical iOS long-press drags.
 const touch=(button,type,x,y,id=7)=>{const data={identifier:id,target:button,clientX:x,clientY:y,pageX:x,pageY:y,screenX:x,screenY:y},t=typeof Touch==='function'?new Touch(data):data,event=new Event(type,{bubbles:true,cancelable:true});Object.defineProperties(event,{touches:{value:type==='touchend'?[]:[t]},targetTouches:{value:type==='touchend'?[]:[t]},changedTouches:{value:[t]}});return button.dispatchEvent(event);};
 openLibrary(null);let button=$('library').querySelector('[data-tool="camera"]'),r=button.getBoundingClientRect();before=scene().objects.length;touch(button,'touchstart',r.left+8,r.top+8);touch(button,'touchmove',r.left+8,r.top+60);await wait(360);touch(button,'touchend',r.left+8,r.top+60);assert(scene().objects.length===before&&!root.classList.contains('palette-dragging'),'Touch swipe before hold scrolls without placement');
 openLibrary(null);button=$('library').querySelector('[data-tool="camera"]');r=button.getBoundingClientRect();p=destination();before=scene().objects.length;touch(button,'touchstart',r.left+8,r.top+8);await wait(360);touch(button,'touchmove',p.x,p.y);touch(button,'touchend',p.x,p.y);assert(scene().objects.length===before+1&&object().type==='camera','Held touch places exactly one camera');
 const portable=ScenicProjectFile.serialize(doc),parsed=ScenicProjectFile.parse(portable);assert(JSON.stringify(parsed.scenes)===JSON.stringify(doc.scenes),'Every dragged category round-trips portable .scenic');await scenicFlush();
 return {passed:true,checks,layouts,objects:scene().objects.length,portableBytes:portable.length,platform:navigator.userAgent};
}finally{canvas.setPointerCapture=originalCapture;loadWorkspace(JSON.parse(original));applyTheme();refresh();fit();await scenicFlush();}
