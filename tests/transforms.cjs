const assert=require('node:assert/strict'),t=require('../dist/transforms.js'),m=require('../dist/model.js'),g=require('../dist/engine.js');
const near=(a,b,msg)=>assert(Math.abs(a-b)<1e-7,`${msg||''}: ${a} != ${b}`);
const pointNear=(a,b)=>{near(a.x,b.x);near(a.y,b.y);};
const box={id:'box',type:'sofa',name:'Sofa',x:200,y:300,width:180,height:90,rotation:30};
const corner=t.handles(box,.7).find(h=>h.sx===1&&h.sy===1),delta=t.rotate({x:60,y:30},Math.PI/6);
const resized={...box,...t.apply(box,corner,corner,{x:corner.x+delta.x,y:corner.y+delta.y})};
near(resized.width,240);near(resized.height,120);
const anchor=o=>{const d=t.rotate({x:-o.width/2,y:-o.height/2},t.angle(o));return{x:o.x+d.x,y:o.y+d.y};};pointNear(anchor(box),anchor(resized));
for(const rotation of [-170,-90,0,47,135])for(const h of t.handles({...box,rotation},.5).filter(h=>h.kind==='resize')){
 const o={...box,rotation},d=t.rotate({x:24*h.sx,y:15*h.sy},t.angle(o));
 const next={...o,...t.apply(o,h,h,{x:h.x+d.x,y:h.y+d.y})};
 const opposite=(b)=>{const p=t.rotate({x:-h.sx*b.width/2,y:-h.sy*b.height/2},t.angle(b));return{x:b.x+p.x,y:b.y+p.y};};
 pointNear(opposite(o),opposite(next));if(!h.sx)near(next.width,o.width);if(!h.sy)near(next.height,o.height);
}
const proportional={...box,...t.apply(box,corner,corner,{x:corner.x+90,y:corner.y+2},{proportional:true})};near(proportional.width/proportional.height,box.width/box.height);
for(const type of ['sofa','table','set','prop','image']){const o={...box,type};assert.equal(t.handles(o,1).length,9);assert.deepEqual(t.handles({...o,locked:true},1),[]);assert.deepEqual(t.apply({...o,locked:true},corner,corner,{x:0,y:0}),{});}
assert.deepEqual(t.handles(null,1),[]);assert.deepEqual(t.handles({type:'unknown'},1),[]);assert.deepEqual(t.handles({type:'light',kind:'sun'},1),[]);
const clamped=t.apply(box,corner,corner,{x:1e7,y:1e7});assert(clamped.width<=5000&&clamped.height<=5000);
const inverted=t.apply(box,corner,corner,{x:-1e7,y:-1e7});assert(inverted.width>=1.5&&inverted.height>=1.5);
const image={...box,id:'image',type:'image',opacity:65,src:'data:image/png;base64,AA=='};const side=t.handles(image,2).find(h=>h.sx===1&&h.sy===0);
const imageResult={...image,...t.apply(image,side,side,{x:side.x+delta.x,y:side.y+delta.y},{step:3})};near(imageResult.width%3,0);assert.equal(imageResult.src,image.src);assert.equal(imageResult.opacity,65);
const proportionalSide={...box,...t.apply(box,side,side,{x:side.x+delta.x,y:side.y+delta.y},{proportional:true})};near(proportionalSide.width/proportionalSide.height,box.width/box.height);
const r=t.handles(box,1)[0],c=t.center(box),p=t.rotate({x:r.x-c.x,y:r.y-c.y},Math.PI/2);
const turned={...box,...t.apply(box,r,r,{x:c.x+p.x,y:c.y+p.y})};near(turned.rotation,120);pointNear(turned,box);near(turned.width,box.width);
const snapped=t.apply(box,r,r,{x:c.x+p.x+5,y:c.y+p.y},{angleStep:15});near(snapped.rotation%15,0);
const wall={id:'wall',type:'wall',name:'Wall',x:0,y:0,x2:360,y2:0,thickness:9};const wh=t.handles(wall,1),rot=wh[0];
const wrot={...wall,...t.apply(wall,rot,rot,{x:210,y:0})};near(Math.hypot(wrot.x2-wrot.x,wrot.y2-wrot.y),360);pointNear(t.center(wall),t.center(wrot));near(wrot.x,wrot.x2);
const window={id:'window',type:'set',asset:'window',name:'Window',x:180,y:0,width:90,height:24,rotation:0,wallId:'wall',wallT:.5};m.syncOpenings([wrot,window]);near(window.x,180);near(window.y,0);near(window.rotation,90);assert.equal(window.wallId,'wall');
assert(g.blocked({x:100,y:-120},{x:260,y:-120},m.effectiveWalls([wrot,window])),'Rotated solid portion blocks light');
assert(!g.blocked({x:100,y:0},{x:260,y:0},m.effectiveWalls([wrot,window])),'Attached window follows rotation and still transmits light');
const end=wh.find(h=>h.kind==='end'),lengthened={...wall,...t.apply(wall,end,end,{x:480,y:90},{step:3})};pointNear(lengthened,wall);near(lengthened.x2,480);near(lengthened.y2,90);
const collapsed={...wall,...t.apply(wall,end,end,{x:0,y:0})};assert(Math.hypot(collapsed.x2-collapsed.x,collapsed.y2-collapsed.y)>=1.5);
const reset=t.apply(box,corner,corner,corner);near(reset.width,box.width);near(reset.x,box.x);
for(const zoom of [.1,.5,1,4]){const h=t.handles(box,zoom)[0];assert.equal(t.hit(box,{x:h.x+9/zoom,y:h.y},zoom).kind,'rotate');assert.equal(t.hit(box,{x:h.x+11/zoom,y:h.y},zoom),null);}
const project={version:1,name:'Handles',active:'s',scenes:[{id:'s',title:'Scene',ambient:30,objects:[resized,wrot,imageResult]}]};assert(m.validProject(project));assert(m.validProject(JSON.parse(JSON.stringify(project))));
console.log('Map handles verified: all eight anchored resize directions on rotated objects, proportions, limits, grid snapping, image preservation/locking, midpoint rotation, 15-degree snapping, wall openings and shadows, zoom hit targets, and project round trips.');

for(const type of ['camera','light','actor'])for(const rotation of [-179,-90,0,65,179])for(const zoom of [.1,1,4]){
 const o={id:type,type,name:type,x:400,y:300,rotation},before=JSON.stringify(o),hs=t.handles(o,zoom);assert.equal(hs.length,1);const h=hs[0];assert.equal(h.kind,'rotate');
 const delta=t.rotate({x:h.x-o.x,y:h.y-o.y},Math.PI/2),p={x:o.x+delta.x,y:o.y+delta.y};
 const result=t.apply(o,h,h,p);near(result.rotation,t.normalize(rotation+90));assert.deepEqual(Object.keys(result),['rotation']);assert.equal(JSON.stringify(o),before);
 const aimed={...o,...result};pointNear(aimed,o);assert.equal(t.hit(o,h,zoom).kind,'rotate');assert.equal(t.cursor(o,h),'grab');
 near(t.apply(o,h,h,p,{angleStep:15}).rotation%15,0);assert.deepEqual(t.apply(o,h,h,h),{rotation});
 assert.deepEqual(t.handles({...o,locked:true},zoom),[]);
 const front=t.rotate({x:h.x-o.x,y:h.y-o.y},-t.angle(o));near(front.y,0);assert(front.x>0,'Aim handle sits in front of the lens or beam');
}
console.log('Camera/light aiming and talent facing verified: rotation-only handles, forward placement, full angle range, fixed position, zoom targets, 15-degree snapping, and no-op/locking behavior.');

const talent={id:'talent',type:'actor',name:'Alex',x:400,y:300,rotation:0,color:'#cf7d96',marks:[{x:100,y:100,rotation:-90,notes:'A'}],pathDuration:5};
const talentHandle=t.handles(talent,1)[0],faced={...talent,...t.apply(talent,talentHandle,talentHandle,{x:400,y:300+(talentHandle.x-400)})};
near(faced.rotation,90);assert.deepEqual(faced.marks,talent.marks);assert.equal(faced.color,talent.color);assert.equal(faced.name,talent.name);
const facingProject={version:1,name:'Facing',active:'s',scenes:[{id:'s',title:'Scene',ambient:30,objects:[faced]}]};assert(m.validProject(JSON.parse(JSON.stringify(facingProject))));
console.log('Talent facing preserves marker styling, recorded marks, and portable project storage.');
