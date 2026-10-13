const assert=require('node:assert/strict'),model=require('../dist/model.js'),geometry=require('../dist/engine.js'),transforms=require('../dist/transforms.js'),catalog=require('../dist/catalog.js');
const near=(a,b)=>assert(Math.abs(a-b)<1e-7,`${a} != ${b}`);
const room=(asset='room-square')=>({id:'room',type:'room',asset,name:'Test room',x:0,y:0,width:432,height:432,thickness:9,rotation:0,keepProportions:true});
const project=objects=>({version:1,name:'Rooms',active:'s',scenes:[{id:'s',title:'Room test',ambient:30,objects}]});
for(const preset of catalog.items.filter(i=>i.category==='walls')){
 const r={...room(preset.id),width:preset.width,height:preset.height};
 const walls=model.effectiveWalls([r]);assert.equal(walls.length,preset.id==='room-circle'?64:preset.id==='room-l'?6:4);
 walls.forEach((wall,i)=>{const next=walls[(i+1)%walls.length];near(wall.x2,next.x);near(wall.y2,next.y);});
 assert(geometry.blocked({x:-r.width,y:0},{x:0,y:0},walls),'Room boundary blocks light');
 assert(model.validProject(JSON.parse(JSON.stringify(project([r])))));
 r.rotation=90;const rotated=model.roomSegments(r);near(rotated[0].x,-walls[0].y);near(rotated[0].y,walls[0].x);
}
const l=room('room-l');assert(!geometry.blocked({x:50,y:-100},{x:300,y:-100},model.effectiveWalls([l])),'L-shaped room leaves its missing corner open');
const r=room(),door={id:'door',type:'set',asset:'door',name:'Door',width:108,height:108,x:0,y:-210,rotation:0,open:true,hinge:'Left',swingSide:'Side A'};
assert(model.snapOpening(door,[r],30));assert.equal(door.wallId,r.id);
assert(!geometry.blocked({x:0,y:0},{x:0,y:-400},model.effectiveWalls([r,door])),'Open door creates room opening');
door.open=false;assert(geometry.blocked({x:0,y:0},{x:0,y:-400},model.effectiveWalls([r,door])),'Closed room door blocks light');
r.x=150;r.y=90;r.rotation=90;model.syncOpenings([r,door]);near(door.x,366);near(door.y,90);assert(model.validProject(project([r,door])));
const circle=room('room-circle'),window={id:'window',type:'set',asset:'window',name:'Window',width:108,height:24,x:216,y:0,rotation:0,curtains:false};
assert(model.snapOpening(window,[circle],20));assert(!geometry.blocked({x:0,y:0},{x:400,y:0},model.effectiveWalls([circle,window])),'Circular opening crosses the perimeter seam');
window.curtains=true;assert(geometry.blocked({x:0,y:0},{x:400,y:0},model.effectiveWalls([circle,window])));
for(const rotation of [0,37,90]){
 const original={...room(),rotation};const corner=transforms.handles(original,1).find(h=>h.kind==='resize'&&h.sx===1&&h.sy===1);
 const resized={...original,...transforms.apply(original,corner,corner,{x:corner.x+120,y:corner.y+180},{proportional:true,min:36})};
 near(resized.width,resized.height);assert(resized.width>original.width);
 const anchor=o=>{const a=o.rotation*Math.PI/180;return{x:o.x-o.width/2*Math.cos(a)+o.height/2*Math.sin(a),y:o.y-o.width/2*Math.sin(a)-o.height/2*Math.cos(a)};};near(anchor(original).x,anchor(resized).x);near(anchor(original).y,anchor(resized).y);
 assert(model.validProject(project([resized])));
}
const invalid=room();invalid.asset='sofa';assert(!model.validProject(project([invalid])));invalid.asset='room-square';invalid.width=Infinity;assert(!model.validProject(project([invalid])));
console.log('Room shapes verified: closed outlines, rotation, wall shadows, L-shaped cutout, attached doors/windows, circular seam openings, anchored proportional resizing, and project round trips.');
// Breaking a transformed room preserves each boundary and its openings.
let nextWall=0;
for(const asset of ['room-square','room-rectangle','room-l','room-circle']){
 const original={...room(asset),rotation:37,x:125,y:-80,width:576,height:432};
 const edge=model.roomSegments(original)[0],opening={id:'split-window',type:'set',asset:'window',name:'Split window',width:108,height:24,x:(edge.x+edge.x2)/2,y:(edge.y+edge.y2)/2,rotation:0,curtains:false};
 assert(model.snapOpening(opening,[original],100));
 const objects=[original,opening],before=JSON.stringify(objects),split=model.splitRoom(objects,original.id,()=>`split-${nextWall++}`);
 assert.equal(JSON.stringify(objects),before,'Conversion must not mutate the source used by Undo');
 assert.equal(split.walls.length,asset==='room-circle'?64:asset==='room-l'?6:4);
 assert.equal(new Set(split.walls.map(w=>w.id)).size,split.walls.length);
 const afterOpening=split.objects.find(o=>o.id===opening.id);near(afterOpening.x,opening.x);near(afterOpening.y,opening.y);near(afterOpening.rotation,opening.rotation);
 model.syncOpenings(split.objects);near(afterOpening.x,opening.x);near(afterOpening.y,opening.y);
 const wallLength=walls=>walls.reduce((sum,w)=>sum+Math.hypot(w.x2-w.x,w.y2-w.y),0);
 near(wallLength(model.effectiveWalls(objects)),wallLength(model.effectiveWalls(split.objects)));
 for(let angle=0;angle<Math.PI*2;angle+=.05){const point={x:original.x+Math.cos(angle)*1000,y:original.y+Math.sin(angle)*1000};assert.equal(geometry.blocked(original,point,model.effectiveWalls(split.objects)),geometry.blocked(original,point,model.effectiveWalls(objects)),'Light occlusion must survive conversion');}
 assert(model.validProject(JSON.parse(JSON.stringify(project(split.objects)))));
 afterOpening.curtains=true;near(wallLength(model.effectiveWalls(split.objects)),wallLength(model.roomSegments(original)));
 // Resizing a spanning opening updates the gap, including across the circle seam.
 afterOpening.curtains=false;afterOpening.width=150;
 near(wallLength(model.effectiveWalls(split.objects)),wallLength(model.roomSegments(original))-150);
 const remaining=split.objects.filter(o=>o.id!==afterOpening.wallId);model.syncOpenings(remaining);assert.equal(afterOpening.wallId,undefined);assert.equal(afterOpening.wallIds,undefined);assert(model.validProject(project(remaining)));
}
const limitObjects=Array.from({length:1999},(_,i)=>({id:`other-${i}`,type:'actor',name:'Talent',x:0,y:0,rotation:0}));
assert.equal(model.splitRoom([...limitObjects,room()], 'room',()=>`limit-${nextWall++}`),null,'Respect scene item limits');
assert.equal(model.splitRoom([room()],'missing',()=>`missing-${nextWall++}`),null);
console.log('Room separation verified: all presets, transformed outlines, independent walls, doors/windows and shadows, spanning opening edits, deletion cleanup, portable storage, and item limits.');
