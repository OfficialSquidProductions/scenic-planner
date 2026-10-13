const assert=require('node:assert/strict'),m=require('../dist/model.js'),t=require('../dist/transforms.js'),g=require('../dist/engine.js');
const near=(a,b)=>assert(Math.abs(a-b)<1e-7,`${a} != ${b}`);
const walls=[{id:'a',type:'wall',name:'Top',x:0,y:0,x2:360,y2:0,thickness:9},{id:'b',type:'wall',name:'Right',x:360,y:0,x2:360,y2:240,thickness:9},{id:'c',type:'wall',name:'Bottom',x:360,y:240,x2:0,y2:240,thickness:9},{id:'d',type:'wall',name:'Left',x:0,y:240,x2:0,y2:0,thickness:9}];
const window={id:'window',type:'set',asset:'window',name:'Window',x:180,y:0,width:90,height:24,rotation:0,curtains:false,wallId:'a',wallT:.5};
const prop={id:'prop',type:'prop',asset:'laptop',name:'Unrelated',x:90,y:120,width:42,height:30,rotation:0};
const original=[...walls,window,prop],before=JSON.stringify(original),ids=walls.map(w=>w.id),result=m.groupWalls(original,ids,'group');
assert(result);assert.equal(JSON.stringify(original),before);assert.equal(result.group.width,360);assert.equal(result.group.height,240);assert.equal(result.group.x,180);assert.equal(result.group.y,120);
const project=objects=>({version:1,name:'Groups',active:'s',scenes:[{id:'s',title:'Group test',ambient:30,objects}]});
assert(m.validProject(project(result.objects)));assert.equal(m.wallGroupFor(result.objects,'a').id,'group');assert.equal(m.groupWalls(result.objects,['a','b'],'nested'),null);
assert.equal(m.groupWalls(original,['a'],'one'),null);assert.equal(m.groupWalls(original,['a','prop'],'mixed'),null);assert.equal(m.groupWalls(original,['a','missing'],'missing'),null);
let moved=m.transformWallGroup(result.objects,'group',{x:300,y:500});m.syncOpenings(moved);
near(moved.find(o=>o.id==='a').x,120);near(moved.find(o=>o.id==='a').y,380);near(moved.find(o=>o.id==='window').x,300);near(moved.find(o=>o.id==='window').y,380);assert.equal(moved.find(o=>o.id==='window').wallId,'a');assert.strictEqual(moved.find(o=>o.id==='prop'),prop);
let scaled=m.transformWallGroup(result.objects,'group',{width:720,height:120,rotation:90});m.syncOpenings(scaled);
const a=scaled.find(o=>o.id==='a');near(a.x,240);near(a.y,-240);near(a.x2,240);near(a.y2,480);near(scaled.find(o=>o.id==='window').rotation,90);assert(m.validProject(JSON.parse(JSON.stringify(project(scaled)))));
// Grouping itself changes neither shadow geometry nor opening behavior.
const plain=m.effectiveWalls(original),grouped=m.effectiveWalls(result.objects);assert.equal(JSON.stringify(plain),JSON.stringify(grouped));assert(!g.blocked({x:180,y:120},{x:180,y:-300},grouped));assert(g.blocked({x:60,y:120},{x:60,y:-300},grouped));
for(const rotation of [0,37,90]){
 const source=m.transformWallGroup(result.objects,'group',{rotation}),group=source.find(o=>o.id==='group'),h=t.handles(group,1).find(h=>h.sx===1&&h.sy===1),delta=t.rotate({x:90,y:60},rotation*Math.PI/180),pose=t.apply(group,h,h,{x:h.x+delta.x,y:h.y+delta.y});
 const transformed=m.transformWallGroup(source,'group',pose),changed=transformed.find(o=>o.id==='group');
 const anchor=o=>{const p=t.rotate({x:-o.width/2,y:-o.height/2},o.rotation*Math.PI/180);return {x:o.x+p.x,y:o.y+p.y};};near(anchor(group).x,anchor(changed).x);near(anchor(group).y,anchor(changed).y);
 const wa=transformed.find(o=>o.id==='a'),wb=transformed.find(o=>o.id==='b');near(wa.x2,wb.x);near(wa.y2,wb.y);assert(m.validProject(project(transformed)));
 const reset=m.transformWallGroup(transformed,'group',group,source);for(const old of source.filter(o=>o.type==='wall')){const now=reset.find(o=>o.id===old.id);for(const k of ['x','y','x2','y2'])near(now[k],old[k]);}
}
const lineWalls=[{...walls[0],id:'line-a'}, {...walls[0],id:'line-b',x:400,x2:600}];const line=m.groupWalls(lineWalls,lineWalls.map(o=>o.id),'line');assert.equal(line.group.height,1.5);assert(m.validProject(project(line.objects)));
for(const bad of [{width:0},{height:Infinity},{x:100000},{width:6000}])assert.equal(m.transformWallGroup(result.objects,'group',bad),null);
for(const change of [o=>o.wallIds.push('missing'),o=>o.wallIds.push('a'),o=>o.width=0]){const copy=structuredClone(result.objects);change(copy.find(o=>o.id==='group'));assert(!m.validProject(project(copy)));}
const overlapping=[...result.objects,{...result.group,id:'overlap'}];assert(!m.validProject(project(overlapping)));
console.log('Wall groups verified: selection validation, stable wall IDs/openings, affine movement/resize/rotation, anchored handles, lighting, degenerate bounds, save/reload, and invalid group rejection.');
