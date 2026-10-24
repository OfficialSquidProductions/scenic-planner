/* Pure scene model, shared by the editor and behavior tests. */
(function(root){
'use strict';
const catalog=typeof module==='object'&&module.exports?require('./catalog.js'):root.ScenicCatalog;
const geometry=typeof module==='object'&&module.exports?require('./engine.js'):root.ScenicGeometry;
const solar=typeof module==='object'&&module.exports?require('./solar.js'):root.ScenicSolar;
const shotLists=typeof module==='object'&&module.exports?require('./shot-list.js'):root.ScenicShotList;
const finite=n=>Number.isFinite(n),coordinate=n=>finite(n)&&Math.abs(n)<100000;
const openingKind=o=>o.type==='set'&&(o.asset==='door'||o.asset?.startsWith('door-'))?'door':o.type==='set'&&(o.asset==='window'||o.asset?.startsWith('window-'))?'window':null;
const movable=o=>['actor','camera','light'].includes(o.type)&&o.kind!=='sun';
const markLabel=i=>i<26?String.fromCharCode(65+i):String.fromCharCode(64+Math.floor(i/26))+String.fromCharCode(65+i%26);
const actorFootprint=o=>({width:o.width??catalog.ACTOR_FOOTPRINT.width,height:o.height??catalog.ACTOR_FOOTPRINT.height});
function actorContains(o,p,padding=0){const {width,height}=actorFootprint(o),a=-(o.rotation||0)*Math.PI/180,dx=p.x-o.x,dy=p.y-o.y,x=dx*Math.cos(a)-dy*Math.sin(a),y=dx*Math.sin(a)+dy*Math.cos(a);return (x/(width/2+padding))**2+(y/(height/2+padding))**2<=1;}
// Rectilinear horizontal angle of view; distance is a guide plane, not lens reach.
function cameraView(o){
 const lens=finite(o.lens)&&o.lens>0?o.lens:50,sensorWidth=o.sensorWidth??36,distance=o.viewDistance??360;
 return {lens,sensorWidth,distance,fov:2*Math.atan(sensorWidth/(2*lens))*180/Math.PI,width:distance*sensorWidth/lens};
}
function cameraCoverage(o,walls=[]){
 const view=cameraView(o),half=view.fov*Math.PI/360,rotation=(o.rotation||0)*Math.PI/180;
 const offsets=[-half,half];
 if(walls.length){
  for(let i=1;i<64;i++)offsets.push(-half+2*half*i/64);
  for(const w of walls)for(const p of [{x:w.x,y:w.y},{x:w.x2,y:w.y2}]){
   const a=Math.atan2(p.y-o.y,p.x-o.x)-rotation,offset=Math.atan2(Math.sin(a),Math.cos(a));
   for(const delta of [-.00001,0,.00001])if(offset+delta>-half&&offset+delta<half)offsets.push(offset+delta);
  }
 }
 offsets.sort((a,b)=>a-b);
 return [{x:o.x,y:o.y},...offsets.map(offset=>{
  const a=rotation+offset;let distance=view.distance/Math.cos(offset);
  for(const w of walls)distance=geometry.rayDistance(o,a,w,{x:w.x2,y:w.y2},distance);
  return {x:o.x+Math.cos(a)*distance,y:o.y+Math.sin(a)*distance};
 })];
}
function roomSegments(room){
 const points=room.asset==='room-circle'?Array.from({length:64},(_,i)=>[Math.cos(i*Math.PI/32)/2,Math.sin(i*Math.PI/32)/2]):room.asset==='room-l'?[[-.5,-.5],[0,-.5],[0,0],[.5,0],[.5,.5],[-.5,.5]]:[[-.5,-.5],[.5,-.5],[.5,.5],[-.5,.5]];
 const a=room.rotation*Math.PI/180,c=Math.cos(a),s=Math.sin(a),vertices=points.map(([x,y])=>({x:room.x+x*room.width*c-y*room.height*s,y:room.y+x*room.width*s+y*room.height*c}));
 return vertices.map((p,i)=>({...p,x2:vertices[(i+1)%vertices.length].x,y2:vertices[(i+1)%vertices.length].y,thickness:room.thickness,id:room.id}));
}
function boundary(wall){
 let length=0;const segments=(wall.type==='room'?roomSegments(wall):[wall]).map(w=>{const start=length;length+=Math.hypot(w.x2-w.x,w.y2-w.y);return {...w,start,end:length};});
 return {segments,length};
}
function wallGroupFor(objects,id){return objects.find(o=>o.type==='wallGroup'&&o.wallIds.includes(id));}
function translateSelection(objects,ids,dx,dy,source=objects){
 if(!finite(dx)||!finite(dy))return null;if(dx===0&&dy===0)return source.map(o=>({...o}));
 const moving=new Set(ids.map(id=>wallGroupFor(source,id)?.id||id));
 for(const group of source.filter(o=>o.type==='wallGroup'&&moving.has(o.id)))group.wallIds.forEach(id=>moving.add(id));
 const result=source.map(o=>({...o}));
 for(const o of result){
  if(!moving.has(o.id)||o.locked)continue;
  if(openingKind(o)&&moving.has(o.wallId))continue;
  if(![o.x+dx,o.y+dy,...(o.type==='wall'?[o.x2+dx,o.y2+dy]:[])].every(coordinate))return null;
  o.x+=dx;o.y+=dy;if(o.type==='wall'){o.x2+=dx;o.y2+=dy;}
  if(openingKind(o)){delete o.wallId;delete o.wallT;delete o.wallIds;}
 }
 for(const o of result.filter(o=>moving.has(o.id)&&openingKind(o)&&!o.wallId))snapOpening(o,result);
 syncOpenings(result);return result;
}
function groupWalls(objects,ids,id){
 const walls=objects.filter(o=>ids.includes(o.id)&&o.type==='wall'&&!wallGroupFor(objects,o.id));
 if(walls.length<2||walls.length!==new Set(ids).size||objects.length>=2000)return null;
 const xs=walls.flatMap(w=>[w.x,w.x2]),ys=walls.flatMap(w=>[w.y,w.y2]),minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
 const width=Math.max(1.5,maxX-minX),height=Math.max(1.5,maxY-minY);if(width>5000||height>5000)return null;
 const group={id,type:'wallGroup',name:'Wall group',x:(minX+maxX)/2,y:(minY+maxY)/2,width,height,rotation:0,keepProportions:false,wallIds:walls.map(w=>w.id)};
 return {group,objects:[...objects,group]};
}
function transformWallGroup(objects,id,pose,source=objects){
 const original=source.find(o=>o.id===id&&o.type==='wallGroup');if(!original)return null;
 const group={...original,...pose},a=-original.rotation*Math.PI/180,b=group.rotation*Math.PI/180;
 if(![group.x,group.y,group.rotation,group.width,group.height].every(finite)||group.width<1.5||group.height<1.5||group.width>5000||group.height>5000)return null;
 const point=(x,y)=>{const dx=x-original.x,dy=y-original.y,lx=(dx*Math.cos(a)-dy*Math.sin(a))*group.width/original.width,ly=(dx*Math.sin(a)+dy*Math.cos(a))*group.height/original.height;return {x:group.x+lx*Math.cos(b)-ly*Math.sin(b),y:group.y+lx*Math.sin(b)+ly*Math.cos(b)};};
 const changed=new Map([[id,group]]);
 for(const wallId of original.wallIds){const wall=source.find(w=>w.id===wallId&&w.type==='wall');if(!wall)return null;const p=point(wall.x,wall.y),q=point(wall.x2,wall.y2);if(![p.x,p.y,q.x,q.y].every(coordinate))return null;changed.set(wallId,{...wall,...p,x2:q.x,y2:q.y});}
 return objects.map(o=>changed.get(o.id)||o);
}
function splitRoom(objects,id,makeId){
 const room=objects.find(o=>o.id===id&&o.type==='room');if(!room)return null;
 const {segments,length}=boundary(room);
 if(objects.length-1+segments.length>2000)return null;
 const walls=segments.map((w,i)=>({id:makeId(),type:'wall',name:`${room.name} · Wall ${i+1}`,x:w.x,y:w.y,x2:w.x2,y2:w.y2,thickness:room.thickness}));
 if(walls.some(w=>![w.x,w.y,w.x2,w.y2].every(coordinate)))return null;
 const result=objects.flatMap(o=>{
  if(o===room)return walls;
  if(!openingKind(o)||o.wallId!==id)return [o];
  const pose=wallPose(o,objects);if(!pose){const copy={...o};delete copy.wallId;delete copy.wallT;delete copy.wallIds;return [copy];}
  const distance=pose.wallT*length,index=Math.max(0,segments.findIndex(w=>w.end>=distance)),w=segments[index];
  return [{...o,x:pose.x,y:pose.y,rotation:pose.rotation,wallId:walls[index].id,wallT:(distance-w.start)/(w.end-w.start),wallIds:walls.map(w=>w.id)}];
 });
 return {objects:result,walls};
}
// An opening may span several short walls after a curved room is separated.
// Follow only its original walls that still meet at endpoints, so deleting or
// moving an individual wall cannot leave an invisible opening in another wall.
function openingWallCuts(o,objects){
 const primary=objects.find(w=>w.id===o.wallId&&w.type==='wall');if(!primary)return [];
 const walls=objects.filter(w=>w.type==='wall'&&o.wallIds.includes(w.id)),cuts=[];
 for(const initialDirection of [-1,1]){
  let wall=primary,direction=initialDirection,remaining=o.width/2,position=o.wallT,visited=new Set();
  while(wall&&remaining>1e-7&&!visited.has(wall.id)){
   visited.add(wall.id);const length=Math.hypot(wall.x2-wall.x,wall.y2-wall.y);if(length<1e-7)break;
   const taken=Math.min(remaining,(direction>0?1-position:position)*length),end=position+direction*taken/length;
   if(taken>1e-7)cuts.push({wallId:wall.id,start:Math.min(position,end),end:Math.max(position,end)});
   remaining-=taken;if(remaining<=1e-7)break;
   const point=direction>0?{x:wall.x2,y:wall.y2}:wall;
   const next=walls.find(w=>!visited.has(w.id)&&(Math.hypot(w.x-point.x,w.y-point.y)<1e-6||Math.hypot(w.x2-point.x,w.y2-point.y)<1e-6));
   if(!next)break;direction=Math.hypot(next.x-point.x,next.y-point.y)<1e-6?1:-1;wall=next;position=direction>0?0:1;
  }
 }
 return cuts;
}
function wallPose(o,objects){
 const wall=objects.find(w=>w.id===o.wallId&&['wall','room'].includes(w.type));
 if(!wall)return null;
 const {segments,length:len}=boundary(wall);if((!o.wallIds&&len<o.width)||len<1)return null;
 const t=wall.type==='room'||o.wallIds?(o.wallT??.5):Math.max(o.width/2/len,Math.min(1-o.width/2/len,o.wallT??.5)),distance=t*len;
 const w=segments.find(w=>w.end>=distance)||segments.at(-1),along=(distance-w.start)/(w.end-w.start||1),dx=w.x2-w.x,dy=w.y2-w.y;
 return {x:w.x+dx*along,y:w.y+dy*along,rotation:Math.atan2(dy,dx)*180/Math.PI,wallT:t,wall};
}
function syncOpenings(objects){
 for(const o of objects.filter(openingKind)){const pose=wallPose(o,objects);if(pose){o.x=pose.x;o.y=pose.y;o.rotation=pose.rotation;o.wallT=pose.wallT;if(o.wallIds)o.wallIds=o.wallIds.filter(id=>objects.some(w=>w.id===id&&w.type==='wall'));}else{delete o.wallId;delete o.wallT;delete o.wallIds;}}
}
function snapOpening(o,objects,tolerance=54){
 let best=null;
 for(const wall of objects.filter(w=>['wall','room'].includes(w.type))){
 const {segments,length}=boundary(wall);
 for(const w of segments){
  const curved=wall.asset==='room-circle';
  const dx=w.x2-w.x,dy=w.y2-w.y,len=Math.hypot(dx,dy);if((!curved&&len<o.width)||len<1||length<o.width)continue;
  const half=curved?0:o.width/2/len,t=Math.max(half,Math.min(1-half,((o.x-w.x)*dx+(o.y-w.y)*dy)/(len*len)));
  const x=w.x+dx*t,y=w.y+dy*t,distance=Math.hypot(o.x-x,o.y-y);
  if(distance<=tolerance&&(!best||distance<best.distance))best={x,y,rotation:Math.atan2(dy,dx)*180/Math.PI,wallId:wall.id,wallT:(w.start+t*len)/length,distance};
 }
 }
 delete o.wallId;delete o.wallT;delete o.wallIds;
 if(!best)return false;
 Object.assign(o,{x:best.x,y:best.y,rotation:best.rotation,wallId:best.wallId,wallT:best.wallT});return true;
}
function doorLeaves(o){
 const angle=(o.rotation||0)*Math.PI/180,normal=o.swingSide==='Side B'?-1:1;
 const transform=(x,y)=>({x:o.x+x*Math.cos(angle)-y*Math.sin(angle),y:o.y+x*Math.sin(angle)+y*Math.cos(angle)});
 const leaf=(hinge,sign,width)=>{const a=normal*sign*(o.open?Math.PI/2:0),p=transform(hinge,0),q=transform(hinge+sign*width*Math.cos(a),sign*width*Math.sin(a));return {...p,x2:q.x,y2:q.y,thickness:4};};
 if(o.asset==='door-double'||o.asset==='door-french')return [leaf(-o.width/2,1,o.width/2),leaf(o.width/2,-1,o.width/2)];
 if(['door-sliding','door-pocket','door-garage'].includes(o.asset))return o.open?[]:[leaf(-o.width/2,1,o.width)];
 return [o.hinge==='Right'?leaf(o.width/2,-1,o.width):leaf(-o.width/2,1,o.width)];
}
function effectiveWalls(objects){
 const result=[];
 const spanning=objects.filter(o=>openingKind(o)&&o.wallIds&&wallPose(o,objects)&&(openingKind(o)==='door'?o.open:!o.curtains)).flatMap(o=>openingWallCuts(o,objects));
 for(const wall of objects.filter(o=>['wall','room'].includes(o.type))){
  const {segments,length:len}=boundary(wall);if(len<.001)continue;
  const cuts=objects.filter(o=>openingKind(o)&&!o.wallIds&&o.wallId===wall.id&&wallPose(o,objects)&&(openingKind(o)==='door'?o.open:!o.curtains)).flatMap(o=>{const t=wallPose(o,objects).wallT,a=t-o.width/2/len,b=t+o.width/2/len;return wall.type==='room'?a<0?[[0,b],[1+a,1]]:b>1?[[a,1],[0,b-1]]:[[a,b]]:[[Math.max(0,a),Math.min(1,b)]];}).concat(spanning.filter(c=>c.wallId===wall.id).map(c=>[c.start,c.end])).sort((a,b)=>a[0]-b[0]);
  for(const w of segments){
  const start=w.start/len,end=w.end/len;
  let cursor=start;
  const segment=(a,b)=>{if(b-a>.00001){const t=(a-start)/(end-start),u=(b-start)/(end-start);result.push({...w,x:w.x+(w.x2-w.x)*t,y:w.y+(w.y2-w.y)*t,x2:w.x+(w.x2-w.x)*u,y2:w.y+(w.y2-w.y)*u});}};
  for(const [a,b] of cuts){if(b<=start||a>=end)continue;segment(cursor,Math.max(cursor,a));cursor=Math.max(cursor,Math.min(end,b));}segment(cursor,end);
  }
 }
 for(const o of objects.filter(o=>openingKind(o)==='door'&&o.open&&o.wallId&&wallPose(o,objects)))result.push(...doorLeaves(o));
 return result;
}
function sunState(o){
 if(o.solarReal)return solar.state(o);
 const start=o.sunrise??6,end=o.sunset??18,time=o.time??12,progress=Math.max(0,Math.min(1,(time-start)/(end-start)));
 const daylight=time>start&&time<end&&end>start;
 const rise=o.riseDirection??90,set=o.setDirection??270,azimuth=((rise+(set-rise)*progress)%360+360)%360;
 const altitude=daylight?Math.sin(progress*Math.PI)*75:0;
 return {daylight,azimuth,altitude,strength:daylight?Math.pow(Math.sin(progress*Math.PI),.65)*(o.power/100):0,temperature:Math.round(2400+Math.sin(progress*Math.PI)*3600),rayAngle:(azimuth+90)*Math.PI/180};
}
function pathPosition(marks,progress){
 if(!marks?.length)return null;if(marks.length===1)return {...marks[0]};
 const value=Math.max(0,Math.min(1,progress))*(marks.length-1),i=Math.min(marks.length-2,Math.floor(value)),t=value-i,a=marks[i],b=marks[i+1];
 const turn=((b.rotation-a.rotation+540)%360)-180;
 return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,rotation:a.rotation+turn*t};
}
// Playback is a display-only pose; source coordinates and recorded marks stay untouched.
function playbackElapsed(state,now){return Math.max(0,Math.min(state.duration,(state.elapsed||0)+(state.paused?0:now-state.start)));}
function motionPose(o,elapsed){return pathPosition(o.marks,elapsed/((o.pathDuration||5)*1000));}
function motionDuration(objects){return Math.max(0,...objects.filter(o=>movable(o)&&o.marks?.length>1).map(o=>(o.pathDuration||5)*1000));}
function lightColor(o){const base=geometry.temperature(o.temperature);return o.rgbEnabled?[o.red??base[0],o.green??base[1],o.blue??base[2]]:base;}
function validProject(p){
 if(!p||p.version!==1||!Array.isArray(p.scenes)||!p.scenes.length||p.scenes.length>100||typeof p.name!=='string')return false;
 const ids=new Set();
 for(const s of p.scenes){
  if(!s||typeof s.id!=='string'||ids.has(s.id)||typeof s.title!=='string'||!Array.isArray(s.objects)||s.objects.length>2000||!finite(s.ambient)||s.ambient<0||s.ambient>100)return false;ids.add(s.id);
  if(s.shotList!==undefined&&!shotLists.validList(s.shotList))return false;
  const objectIds=new Set();let suns=0;
  for(const o of s.objects){
   if(!o||typeof o.id!=='string'||objectIds.has(o.id)||typeof o.name!=='string'||!['wall','room','wallGroup','floor','camera','light','actor','sofa','table','prop','set','gear','image'].includes(o.type)||![o.x,o.y].every(coordinate))return false;objectIds.add(o.id);
   const nums={wall:['x2','y2','thickness'],room:['width','height','rotation','thickness'],floor:['width','height','rotation'],wallGroup:['width','height','rotation'],camera:['rotation','fov','lens'],light:['rotation','power','temperature','beam','radius'],actor:['rotation'],sofa:['width','height','rotation'],table:['width','height','rotation'],prop:['width','height','rotation'],set:['width','height','rotation'],gear:['width','height','rotation'],image:['width','height','rotation','opacity']}[o.type];
   if(!nums.every(k=>finite(o[k])))return false;
   if(o.type==='camera'&&((o.sensorWidth!==undefined&&(!finite(o.sensorWidth)||o.sensorWidth<1||o.sensorWidth>100))||(o.viewDistance!==undefined&&(!finite(o.viewDistance)||o.viewDistance<3||o.viewDistance>5000))))return false;
   if(o.shotId!==undefined&&(o.type!=='camera'||typeof o.shotId!=='string'||!s.shotList?.some(shot=>shot.id===o.shotId)))return false;
   if(o.type==='wall'&&(!coordinate(o.x2)||!coordinate(o.y2)||o.thickness<=0||o.thickness>100))return false;
   if(['floor','wallGroup','room','image','table','sofa','prop','set','gear'].includes(o.type)&&(!(o.width>0&&o.width<=5000)||!(o.height>0&&o.height<=5000)))return false;
   if(o.type==='wallGroup'&&(!Array.isArray(o.wallIds)||o.wallIds.length<2||o.wallIds.length>1999||new Set(o.wallIds).size!==o.wallIds.length||!o.wallIds.every(id=>typeof id==='string'&&s.objects.some(w=>w.id===id&&w.type==='wall'))))return false;
   if(o.type==='wallGroup'&&(o.width<1.5||o.height<1.5||o.keepProportions!==undefined&&typeof o.keepProportions!=='boolean'))return false;
   if(o.type==='actor'&&['width','height'].some(k=>o[k]!==undefined&&(!finite(o[k])||o[k]<1.5||o[k]>5000)))return false;
   if(o.type==='image'&&o.keepProportions!==undefined&&typeof o.keepProportions!=='boolean')return false;
   if(o.type==='room'&&(catalog.get(o.asset)?.category!=='walls'||o.thickness<=0||o.thickness>100||o.keepProportions!==undefined&&typeof o.keepProportions!=='boolean'))return false;
   if(['prop','set','gear'].includes(o.type)&&catalog.get(o.asset)?.category!==(o.type==='prop'?'props':o.type))return false;
   if(o.type==='light'){
    if(o.radius<1||o.radius>2000||o.power<0||o.power>100||o.beam<1||o.beam>360||o.temperature<2000||o.temperature>10000||typeof o.enabled!=='boolean')return false;
    if(o.asset&&catalog.get(o.asset)?.category!=='lights')return false;
    if(o.rgbEnabled!==undefined&&typeof o.rgbEnabled!=='boolean'||['red','green','blue'].some(k=>o[k]!==undefined&&(!Number.isInteger(o[k])||o[k]<0||o[k]>255)))return false;
    if(['width','height'].some(k=>o[k]!==undefined&&(!finite(o[k])||o[k]<=0||o[k]>5000)))return false;
    if(o.kind==='sun'){
     if(!solar.validFields(o)||++suns>1||!['time','sunrise','sunset','riseDirection','setDirection'].every(k=>finite(o[k]))||o.time<0||o.time>24||o.sunrise<0||o.sunset>24||o.sunrise>=o.sunset||o.riseDirection<0||o.riseDirection>360||o.setDirection<0||o.setDirection>360)return false;
    }
   }
   if(o.type==='floor'&&(!/^#[0-9a-f]{6}$/i.test(o.color)||o.width<1.5||o.height<1.5||o.locked!==undefined&&typeof o.locked!=='boolean'||o.src!==undefined&&(typeof o.src!=='string'||o.src.length>28*1024*1024||!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(o.src)||(o.src.length-o.src.indexOf(',')-1)%4!==0)))return false;
   if(o.type==='image'&&(typeof o.src!=='string'||!/^data:image\/(png|jpeg|webp);base64,/.test(o.src)))return false;
   if(openingKind(o)){
    if(o.wallId!==undefined&&(typeof o.wallId!=='string'||!finite(o.wallT)||o.wallT<0||o.wallT>1))return false;
    if(o.wallIds!==undefined&&(!Array.isArray(o.wallIds)||!o.wallIds.length||o.wallIds.length>128||new Set(o.wallIds).size!==o.wallIds.length||!o.wallIds.includes(o.wallId)||!o.wallIds.every(id=>typeof id==='string'&&s.objects.some(w=>w.id===id&&w.type==='wall'))))return false;
    if(o.open!==undefined&&typeof o.open!=='boolean'||o.curtains!==undefined&&typeof o.curtains!=='boolean')return false;
    if(o.hinge!==undefined&&!['Left','Right'].includes(o.hinge)||o.swingSide!==undefined&&!['Side A','Side B'].includes(o.swingSide))return false;
   }
   if(o.marks!==undefined&&(!movable(o)||!Array.isArray(o.marks)||o.marks.length>100||!o.marks.every(m=>m&&coordinate(m.x)&&coordinate(m.y)&&finite(m.rotation)&&(m.notes===undefined||typeof m.notes==='string'))))return false;
   if(o.pathDuration!==undefined&&(!finite(o.pathDuration)||o.pathDuration<1||o.pathDuration>60))return false;
  }
  for(const o of s.objects.filter(openingKind))if(o.wallId&&!s.objects.some(w=>w.id===o.wallId&&['wall','room'].includes(w.type)))return false;
  const grouped=s.objects.filter(o=>o.type==='wallGroup').flatMap(o=>o.wallIds);if(new Set(grouped).size!==grouped.length)return false;
 }
 return ids.has(p.active);
}
function validWorkspace(w){return !!(w&&w.version===2&&Array.isArray(w.projects)&&w.projects.length&&w.projects.length<=100&&w.projects.every(validProject)&&w.projects.every(p=>typeof p.projectId==='string')&&new Set(w.projects.map(p=>p.projectId)).size===w.projects.length&&w.projects.some(p=>p.projectId===w.activeProject));}
function workspaceFrom(data,id){
 if(validWorkspace(data))return data;
 if(!validProject(data))throw Error('The saved project could not be read. Your existing files have been preserved.');
 const p=structuredClone(data);p.projectId=p.projectId||id;return {version:2,activeProject:p.projectId,projects:[p]};
}
const api={cameraView,cameraCoverage,actorFootprint,actorContains,translateSelection,groupWalls,wallGroupFor,transformWallGroup,splitRoom,roomSegments,playbackElapsed,motionPose,motionDuration,lightColor,openingKind,movable,markLabel,wallPose,syncOpenings,snapOpening,doorLeaves,effectiveWalls,sunState,pathPosition,validProject,validWorkspace,workspaceFrom};
if(typeof module==='object'&&module.exports)module.exports=api;else root.ScenicModel=api;
})(globalThis);
