const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const catalog=require('../dist/catalog.js');
// Deterministic input routing; real rendering, construction and geometry are
// covered by palette-smoke.js in WKWebView and real gestures by XCTest.
class Element {
 constructor(dataset={}){this.dataset=dataset;this.attrs={};this.style={};this.hidden=false;this.isConnected=true;this.disabled=false;this.textContent='';this.classes=new Set();this.classList={add:(...v)=>v.forEach(x=>this.classes.add(x)),remove:(...v)=>v.forEach(x=>this.classes.delete(x)),contains:x=>this.classes.has(x),toggle:(x,on)=>{if(on===undefined)on=!this.classes.has(x);on?this.classes.add(x):this.classes.delete(x);}};}
 closest(){return sources.includes(this)?this:null;}
 setAttribute(k,v){this.attrs[k]=v;}
 after(){} append(){} hasPointerCapture(){return false;} setPointerCapture(){} releasePointerCapture(){}
}
const sources=[new Element({tool:'camera'}),new Element({tool:'wall'}),new Element({asset:'led-panel'}),new Element({tool:'select'}),new Element({tool:'image'}),new Element({category:'props'})];
const nodes={library:new Element(),'library-heading':new Element()},root=new Element(),wrap=new Element(),canvas=new Element();
canvas.getBoundingClientRect=()=>({left:100,top:100,right:900,bottom:700,width:800,height:600});
const listeners={},timers=new Map(),drops=[];let timerId=0,dialog=false,hit=canvas;
const document={documentElement:root,body:new Element(),createElement:()=>new Element(),querySelectorAll:()=>sources,querySelector:()=>dialog?{}:null,elementFromPoint:()=>hit,addEventListener:(type,callback)=>(listeners[type]??=[]).push(callback)};
const c={document,window:{addEventListener:document.addEventListener},MutationObserver:class{observe(){}},ScenicCatalog:catalog,$:id=>nodes[id],wrap,canvas,innerWidth:1000,innerHeight:800,projectExchangeBusy:false,shotView:false,doc:{projectId:'project'},data:{id:'scene',objects:[]},scene(){return c.data;},tool:'select',hover:null,view:{x:31,y:-14,z:1.7},snap:true,UNITS_PER_INCH:3,
 setTimeout(fn){timers.set(++timerId,fn);return timerId;},clearTimeout(id){timers.delete(id);},stopPlayback(){},setTool(t){c.tool=t;c.wallStart=null;},invalidate(){},toast(){},addObject(type,p){drops.push({type,...p});c.tool='select';}};
vm.createContext(c);
// Exercise the editor's actual coordinate conversion as well as the controller.
const app=fs.readFileSync(require.resolve('../dist/app.js'),'utf8');vm.runInContext(app.slice(app.indexOf('function world('),app.indexOf('function hit(')),c);
vm.runInContext(fs.readFileSync(require.resolve('../dist/palette-drag.js'),'utf8'),c);
const fire=(type,target=sources[0],extra={})=>{const event={type,target,cancelable:true,pointerId:1,pointerType:'mouse',button:0,detail:1,clientX:30,clientY:40,...extra,preventDefault(){this.defaultPrevented=true;},stopImmediatePropagation(){this.stopped=true;}};for(const fn of listeners[type]||[]){fn(event);if(event.stopped)break;}return event;};
const mouseStart=(source=sources[0])=>fire('pointerdown',source);
const mouseMove=(x=510,y=330)=>fire('pointermove',root,{clientX:x,clientY:y});
const mouseEnd=(x=510,y=330)=>fire('pointerup',root,{clientX:x,clientY:y});
const hold=()=>{for(const [id,fn]of [...timers]){timers.delete(id);fn();}};
const touch=(type,x,y,extra={})=>{const t={identifier:7,clientX:x,clientY:y};return fire(type,sources[0],{touches:type==='touchend'?[]:[t],changedTouches:[t],...extra});};
mouseStart();mouseMove();assert(root.classes.has('palette-dragging'));mouseEnd();assert.equal(drops.length,1);assert.equal(drops[0].type,'camera');assert.equal(drops[0].x,222);assert.equal(drops[0].y,144);assert(!root.classes.has('palette-dragging'));
assert(fire('click',root).defaultPrevented,'Compatibility click after drag is consumed');assert(!fire('click',sources[0],{detail:0}).defaultPrevented,'Keyboard activation remains available');
mouseStart();mouseMove();mouseEnd();assert(!fire('click',new Element()).defaultPrevented,'An accessibility activation of Undo is never swallowed');
const before=drops.length;
for(const type of ['keydown','resize','blur','pointercancel']){mouseStart();mouseMove();fire(type,root,{key:'Escape'});mouseEnd();assert.equal(drops.length,before,type);}
mouseStart();mouseMove(5,5);mouseEnd(5,5);assert.equal(drops.length,before,'Outside drop adds nothing');
mouseStart();mouseMove();hit=new Element();mouseEnd();hit=canvas;assert.equal(drops.length,before,'Overlaid controls reject a drop');
c.shotView=true;mouseStart();mouseMove();mouseEnd();c.shotView=false;assert.equal(drops.length,before,'Shot list is not a drop target');
dialog=true;mouseStart();mouseMove();mouseEnd();dialog=false;assert.equal(drops.length,before,'Modal dialogs block new drags');
mouseStart();mouseMove();c.data.id='other-scene';mouseEnd();c.data.id='scene';assert.equal(drops.length,before,'Scene switch cannot misplace a dragged item');
for(const source of sources.slice(3)){mouseStart(source);mouseMove();mouseEnd();assert.equal(drops.length,before,'Non-placement controls cannot drag');}
sources[2].disabled=true;mouseStart(sources[2]);mouseMove();mouseEnd();sources[2].disabled=false;assert.equal(drops.length,before,'Disabled items cannot drag');
mouseStart();fire('pointermove',root,{clientX:31,clientY:41});mouseEnd(31,41);assert(!fire('click').defaultPrevented,'Ordinary click remains unchanged');
touch('touchstart',30,40);touch('touchmove',30,70);hold();touch('touchend',510,330);assert.equal(drops.length,before,'Immediate swipe remains scrolling');
touch('touchstart',30,40);hold();assert(touch('touchmove',510,330).defaultPrevented);touch('touchend',510,330);assert.equal(drops.length,before+1,'Held touch adds one item');
touch('touchstart',30,40);hold();touch('touchmove',510,330);assert(fire('pointerdown',canvas,{pointerType:'touch'}).defaultPrevented,'Second touch cannot reach the map creation handler');touch('touchend',510,330);assert.equal(drops.length,before+1,'Second touch cancels placement');
touch('touchstart',30,40);hold();touch('touchmove',510,330);fire('pointerdown',canvas,{pointerType:'touch'});fire('blur',root);
assert(!touch('touchstart',30,40).defaultPrevented,'Background interruption releases a cancelled multi-touch sequence');touch('touchend',30,40);
touch('touchstart',30,40);hold();touch('touchend',30,40);assert(!fire('click').defaultPrevented,'Hold without movement still permits tap placement');
mouseStart(sources[1]);mouseMove();mouseEnd();assert.equal(drops.length,before+1);assert.equal(c.tool,'wall');assert.equal(c.wallStart.x,222);
assert(sources[0].attrs['aria-describedby'],'Drag instructions are associated with sources');
console.log('PASS: palette mouse/touch routing, scrolling, target validation, cancellation, coordinates, wall setup and accessible click fallback');
