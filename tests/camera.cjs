const assert=require('node:assert/strict'),m=require('../dist/model.js');
const near=(a,b)=>assert(Math.abs(a-b)<1e-6,`${a} != ${b}`);
const camera={id:'camera',type:'camera',name:'Camera',x:0,y:0,rotation:0,lens:50,fov:50};
near(m.cameraView(camera).fov,39.59775270904986);near(m.cameraView({...camera,lens:24}).fov,73.73979529168804);near(m.cameraView({...camera,lens:85}).fov,23.91316848840696);
near(m.cameraView(camera).width,259.2);near(m.cameraView({...camera,lens:24}).width,540);near(m.cameraView({...camera,sensorWidth:24}).width,172.8);
assert(m.cameraView({...camera,sensorWidth:24}).fov<m.cameraView(camera).fov);near(m.cameraView({...camera,viewDistance:720}).width,518.4);
assert.equal(m.cameraView({...camera,fov:120}).fov,m.cameraView(camera).fov,'Legacy independent FOV does not override the lens');
const points=m.cameraCoverage(camera);assert.equal(points.length,3);near(points[1].x,360);near(points[2].x,360);near(points[2].y-points[1].y,259.2);
for(const rotation of [-179,-90,0,47,90,179]){
 const o={...camera,x:400,y:300,rotation},a=rotation*Math.PI/180,vertices=m.cameraCoverage(o);
 for(const p of vertices.slice(1)){const dx=p.x-o.x,dy=p.y-o.y;near(dx*Math.cos(a)+dy*Math.sin(a),360);near(Math.abs(-dx*Math.sin(a)+dy*Math.cos(a)),129.6);}
}
const wall={id:'wall',type:'wall',name:'Wall',x:180,y:-400,x2:180,y2:400,thickness:13.5};
assert(m.cameraCoverage(camera,[wall]).every(p=>p.x<=180+1e-6));
const opening={id:'window',type:'set',asset:'window',name:'Window',x:180,y:0,width:72,height:24,rotation:90,wallId:'wall',wallT:.5,curtains:false};
const throughWindow=m.cameraCoverage(camera,m.effectiveWalls([wall,opening]));assert(throughWindow.some(p=>p.x>359&&Math.abs(p.y)<30));assert(throughWindow.some(p=>p.x<181&&Math.abs(p.y)>36));
assert(m.cameraCoverage(camera,m.effectiveWalls([wall,{...opening,curtains:true}])).every(p=>p.x<=180+1e-6));
const project={version:1,name:'Camera',active:'s',scenes:[{id:'s',title:'Scene',ambient:30,objects:[camera]}]};assert(m.validProject(project));
for(const extra of [{sensorWidth:36,viewDistance:360},{sensorWidth:24.89,viewDistance:720}]){const p=structuredClone(project);Object.assign(p.scenes[0].objects[0],extra);assert(m.validProject(JSON.parse(JSON.stringify(p))));}
for(const extra of [{sensorWidth:0},{sensorWidth:101},{sensorWidth:'36'},{viewDistance:0},{viewDistance:5001},{viewDistance:'10 ft'}]){const p=structuredClone(project);Object.assign(p.scenes[0].objects[0],extra);assert(!m.validProject(p));}
console.log('Camera coverage verified: 24/50/85 mm lens angles, active sensor crop, distance/width relationship, straight guide plane, rotations, wall clipping, window/curtain occlusion, legacy defaults, and portable validation.');
