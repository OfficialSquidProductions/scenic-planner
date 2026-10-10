/* Pure scene model, shared by the editor and behavior tests. */
(function(root){
'use strict';
const catalog=typeof module==='object'&&module.exports?require('./catalog.js'):root.ScenicCatalog;
const geometry=typeof module==='object'&&module.exports?require('./engine.js'):root.ScenicGeometry;
const finite=n=>Number.isFinite(n),coordinate=n=>finite(n)&&Math.abs(n)<100000;
const openingKind=o=>o.type==='set'&&(o.asset==='door'||o.asset?.startsWith('door-'))?'door':o.type==='set'&&(o.asset==='window'||o.asset?.startsWith('window-'))?'window':null;
const movable=o=>['actor','camera','light'].includes(o.type)&&o.kind!=='sun';
const markLabel=i=>i<26?String.fromCharCode(65+i):String.fromCharCode(64+Math.floor(i/26))+String.fromCharCode(65+i%26);
function wallPose(o,objects){
 const wall=objects.find(w=>w.id===o.wallId&&w.type==='wall');
 if(!wall)return null;
 const dx=wall.x2-wall.x,dy=wall.y2-wall.y,len=Math.hypot(dx,dy);if(len<o.width||len<1)return null;
 const t=Math.max(o.width/2/len,Math.min(1-o.width/2/len,o.wallT??.5));
 return {x:wall.x+dx*t,y:wall.y+dy*t,rotation:Math.atan2(dy,dx)*180/Math.PI,wallT:t,wall};
}
function syncOpenings(objects){
 for(const o of objects.filter(openingKind)){const pose=wallPose(o,objects);if(pose){o.x=pose.x;o.y=pose.y;o.rotation=pose.rotation;o.wallT=pose.wallT;}else{delete o.wallId;delete o.wallT;}}
}
function snapOpening(o,objects,tolerance=54){
 let best=null;
 for(const w of objects.filter(w=>w.type==='wall')){
  const dx=w.x2-w.x,dy=w.y2-w.y,len=Math.hypot(dx,dy);if(len<o.width||len<1)continue;
  const half=o.width/2/len,t=Math.max(half,Math.min(1-half,((o.x-w.x)*dx+(o.y-w.y)*dy)/(len*len)));
  const x=w.x+dx*t,y=w.y+dy*t,distance=Math.hypot(o.x-x,o.y-y);
  if(distance<=tolerance&&(!best||distance<best.distance))best={x,y,rotation:Math.atan2(dy,dx)*180/Math.PI,wallId:w.id,wallT:t,distance};
 }
 delete o.wallId;delete o.wallT;
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
 for(const wall of objects.filter(o=>o.type==='wall')){
  const len=Math.hypot(wall.x2-wall.x,wall.y2-wall.y);if(len<.001)continue;
  const cuts=objects.filter(o=>openingKind(o)&&o.wallId===wall.id&&wallPose(o,objects)&&(openingKind(o)==='door'?o.open:!o.curtains)).map(o=>[Math.max(0,o.wallT-o.width/2/len),Math.min(1,o.wallT+o.width/2/len)]).sort((a,b)=>a[0]-b[0]);
  let cursor=0;
  const segment=(a,b)=>{if(b-a>.00001)result.push({...wall,x:wall.x+(wall.x2-wall.x)*a,y:wall.y+(wall.y2-wall.y)*a,x2:wall.x+(wall.x2-wall.x)*b,y2:wall.y+(wall.y2-wall.y)*b});};
  for(const [a,b] of cuts){segment(cursor,a);cursor=Math.max(cursor,b);}segment(cursor,1);
 }
 for(const o of objects.filter(o=>openingKind(o)==='door'&&o.open&&o.wallId&&wallPose(o,objects)))result.push(...doorLeaves(o));
 return result;
}
function sunState(o){
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
  const objectIds=new Set();let suns=0;
  for(const o of s.objects){
   if(!o||typeof o.id!=='string'||objectIds.has(o.id)||typeof o.name!=='string'||!['wall','camera','light','actor','sofa','table','prop','set','image'].includes(o.type)||![o.x,o.y].every(coordinate))return false;objectIds.add(o.id);
   const nums={wall:['x2','y2','thickness'],camera:['rotation','fov','lens'],light:['rotation','power','temperature','beam','radius'],actor:['rotation'],sofa:['width','height','rotation'],table:['width','height','rotation'],prop:['width','height','rotation'],set:['width','height','rotation'],image:['width','height','rotation','opacity']}[o.type];
   if(!nums.every(k=>finite(o[k])))return false;
   if(o.type==='wall'&&(!coordinate(o.x2)||!coordinate(o.y2)||o.thickness<=0||o.thickness>100))return false;
   if(['image','table','sofa','prop','set'].includes(o.type)&&(!(o.width>0&&o.width<=5000)||!(o.height>0&&o.height<=5000)))return false;
   if(['prop','set'].includes(o.type)&&catalog.get(o.asset)?.category!==(o.type==='prop'?'props':'set'))return false;
   if(o.type==='light'){
    if(o.radius<1||o.radius>2000||o.power<0||o.power>100||o.beam<1||o.beam>360||o.temperature<2000||o.temperature>10000||typeof o.enabled!=='boolean')return false;
    if(o.asset&&catalog.get(o.asset)?.category!=='lights')return false;
    if(o.rgbEnabled!==undefined&&typeof o.rgbEnabled!=='boolean'||['red','green','blue'].some(k=>o[k]!==undefined&&(!Number.isInteger(o[k])||o[k]<0||o[k]>255)))return false;
    if(['width','height'].some(k=>o[k]!==undefined&&(!finite(o[k])||o[k]<=0||o[k]>5000)))return false;
    if(o.kind==='sun'){
     if(++suns>1||!['time','sunrise','sunset','riseDirection','setDirection'].every(k=>finite(o[k]))||o.time<0||o.time>24||o.sunrise<0||o.sunset>24||o.sunrise>=o.sunset||o.riseDirection<0||o.riseDirection>360||o.setDirection<0||o.setDirection>360)return false;
    }
   }
   if(o.type==='image'&&(typeof o.src!=='string'||!/^data:image\/(png|jpeg|webp);base64,/.test(o.src)))return false;
   if(openingKind(o)){
    if(o.wallId!==undefined&&(typeof o.wallId!=='string'||!finite(o.wallT)||o.wallT<0||o.wallT>1))return false;
    if(o.open!==undefined&&typeof o.open!=='boolean'||o.curtains!==undefined&&typeof o.curtains!=='boolean')return false;
    if(o.hinge!==undefined&&!['Left','Right'].includes(o.hinge)||o.swingSide!==undefined&&!['Side A','Side B'].includes(o.swingSide))return false;
   }
   if(o.marks!==undefined&&(!movable(o)||!Array.isArray(o.marks)||o.marks.length>100||!o.marks.every(m=>m&&coordinate(m.x)&&coordinate(m.y)&&finite(m.rotation)&&(m.notes===undefined||typeof m.notes==='string'))))return false;
   if(o.pathDuration!==undefined&&(!finite(o.pathDuration)||o.pathDuration<1||o.pathDuration>60))return false;
  }
  for(const o of s.objects.filter(openingKind))if(o.wallId&&!s.objects.some(w=>w.id===o.wallId&&w.type==='wall'))return false;
 }
 return ids.has(p.active);
}
function validWorkspace(w){return !!(w&&w.version===2&&Array.isArray(w.projects)&&w.projects.length&&w.projects.length<=100&&w.projects.every(validProject)&&w.projects.every(p=>typeof p.projectId==='string')&&new Set(w.projects.map(p=>p.projectId)).size===w.projects.length&&w.projects.some(p=>p.projectId===w.activeProject));}
function workspaceFrom(data,id){
 if(validWorkspace(data))return data;
 if(!validProject(data))throw Error('The saved project could not be read. Your existing files have been preserved.');
 const p=structuredClone(data);p.projectId=p.projectId||id;return {version:2,activeProject:p.projectId,projects:[p]};
}
const api={playbackElapsed,motionPose,motionDuration,lightColor,openingKind,movable,markLabel,wallPose,syncOpenings,snapOpening,doorLeaves,effectiveWalls,sunState,pathPosition,validProject,validWorkspace,workspaceFrom};
if(typeof module==='object'&&module.exports)module.exports=api;else root.ScenicModel=api;
})(globalThis);
