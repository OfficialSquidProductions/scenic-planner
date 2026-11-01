const assert=require('node:assert/strict'),m=require('../dist/model.js'),t=require('../dist/transforms.js'),s=require('../dist/selection.js'),p=require('../dist/project-file.js'),copies=require('../dist/object-copy.js');
const near=(a,b)=>assert(Math.abs(a-b)<1e-7,`${a} != ${b}`);
const arrow={id:'arrow',type:'arrow',name:'Movement',x:300,y:300,rotation:35,points:[{x:-90,y:0},{x:0,y:-80},{x:90,y:0}],scale:1.5,lineWidth:4,color:'#ff2020'};
const text={id:'text',type:'text',name:'Text',text:'Bathroom\nDoorway → camera',x:300,y:100,width:240,height:60,rotation:20,color:'#24212b',keepProportions:true};
const camera={id:'camera',type:'camera',name:'Camera 1',x:300,y:300,rotation:0,fov:40,lens:35,shot:'Medium',labelOffsetX:300,labelOffsetY:-160,labelConnector:false,color:'#3399cc'};
const light={id:'light',type:'light',name:'LED',x:500,y:400,rotation:0,power:75,temperature:3200,radius:300,beam:90,enabled:true,labelOffsetX:-80,labelOffsetY:100,rgbEnabled:true,red:255,green:100,blue:20};
const scene={id:'s',title:'Synthetic annotation QA',ambient:30,objects:[arrow,text,camera,light]};const project={version:1,projectId:'qa',name:'Annotations',active:'s',scenes:[scene,{id:'later',title:'Later',ambient:30,objects:[]}]};
assert(m.validProject(project));assert.deepEqual(p.parse(p.serialize(project)).scenes[0].objects,scene.objects);
for(const change of [{text:'x'.repeat(10001)},{text:'\n'.repeat(100)},{width:0},{color:'url(bad)'},{height:Infinity}])assert(!m.validProject({...project,scenes:[{...scene,objects:[{...text,...change}]}]}));
for(const change of [{points:[{x:0,y:0}]},{points:[{x:0,y:0},{x:NaN,y:0},{x:10,y:0}]},{points:[{x:0,y:0},{x:6000,y:0},{x:10,y:0}]},{scale:0},{scale:11},{lineWidth:21},{color:'red'}])assert(!m.validProject({...project,scenes:[{...scene,objects:[{...arrow,...change}]}]}));
for(const change of [{labelOffsetX:10001},{labelOffsetY:NaN},{labelConnector:'yes'},{color:'red'}])assert(!m.validProject({...project,scenes:[{...scene,objects:[{...camera,...change}]}]}));
const legacy={...camera};delete legacy.labelOffsetX;delete legacy.labelOffsetY;delete legacy.labelConnector;delete legacy.color;assert(m.validProject({...project,scenes:[{...scene,objects:[legacy]}]}));
const info=m.informationLabel(camera);near(info.x,600);near(info.y,186);assert.equal(info.lines[1],'35mm · Medium');assert.equal(info.color,'#3399cc');assert.equal(m.informationLabel(light).color,'rgb(255,100,20)');assert.equal(m.informationLabel(text),null);
for(const zoom of [.1,.5,1,4]){
 const points=m.annotationPoints(arrow),handles=t.handles(arrow,zoom);assert.equal(handles.length,3);
 handles.forEach((h,index)=>{near(h.x,points[index].x);near(h.y,points[index].y);assert.equal(h.index,index);assert.equal(t.hit(arrow,h,zoom).kind,'arrow-point');
  const next=t.apply(arrow,h,h,{x:h.x+40,y:h.y+20}),result={...arrow,...next},world=m.annotationPoints(result);near(world[index].x,h.x+40);near(world[index].y,h.y+20);for(let i=0;i<3;i++)if(i!==index){near(world[i].x,points[i].x);near(world[i].y,points[i].y);}
 });
 const mid=m.curvePoint(points,.5);assert(m.containsPoint(arrow,mid,zoom));assert(!m.containsPoint(arrow,{x:1000,y:1000},zoom));assert(s.inBox([arrow],{x:mid.x-2,y:mid.y-2},{x:mid.x+2,y:mid.y+2}).includes('arrow'));
 assert.deepEqual(t.handles({...arrow,locked:true},zoom),[]);
}
assert.equal(t.handles(text).length,9);const handle=t.handles(text).find(h=>h.kind==='resize'&&h.sx===1&&h.sy===1),resized={...text,...t.apply(text,handle,handle,{x:handle.x+80,y:handle.y+40},{proportional:true})};near(resized.width/resized.height,text.width/text.height);assert.equal(resized.text,text.text);
const actor={id:'actor',type:'actor',name:'Actor',x:0,y:0,rotation:0,color:'#cf7d96'};const door={id:'door',type:'set',asset:'door',name:'Door',x:0,y:0,width:108,height:108,rotation:0,open:true,hinge:'Left',swingSide:'Side A'};const cam={...camera,id:'cam-door',x:0,y:0};
for(const objects of [[actor,door],[door,actor]])assert.equal(m.pickObject(objects,{x:0,y:0}).id,'actor');
for(const objects of [[cam,door],[door,cam]])assert.equal(m.pickObject(objects,{x:0,y:0}).id,'cam-door');
assert.equal(m.pickObject([door],{x:45,y:45}),null,'Door swing arc/interior no longer consumes a large square hitbox');assert.equal(m.pickObject([door],{x:-54,y:50}).id,'door','Visible open leaf remains selectable');assert.equal(m.pickObject([door],{x:45,y:0}).id,'door','Visible opening frame remains selectable');
assert.equal(m.pickObject([{...actor,locked:true},door],{x:0,y:0}).id,'door');assert.equal(m.pickObject([{...cam,x:0,y:0}],{x:30,y:0},1),null,'Camera no longer has an oversized screen-constant hit radius');
let index=0;const uid=()=>`copy-${++index}`,payload=copies.capture(project,'s',scene.objects.map(o=>o.id),uid),plan=copies.planPaste(project,'later',payload,uid);assert.deepEqual(plan.scene.objects.map(o=>o.type),scene.objects.map(o=>o.type));
const pastedCam=plan.scene.objects.find(o=>o.type==='camera'),pastedArrow=plan.scene.objects.find(o=>o.type==='arrow');assert.notEqual(pastedCam.id,camera.id);assert.equal(pastedCam.labelOffsetX,300);assert.deepEqual(pastedArrow.points,arrow.points);pastedArrow.points[1].y=1000;assert.equal(arrow.points[1].y,-80);assert.equal(camera.labelConnector,false);
const duplicate=copies.duplicateScene(project,'s',uid);assert(duplicate.objects.every(o=>!scene.objects.some(source=>source.id===o.id)));assert.deepEqual(duplicate.objects.find(o=>o.type==='arrow').points,arrow.points);
const moved=m.translateSelection(scene.objects,['camera','arrow','text'],30,50);assert.equal(moved.find(o=>o.type==='camera').labelOffsetX,300);const beforePoints=m.annotationPoints(arrow),afterPoints=m.annotationPoints(moved.find(o=>o.type==='arrow'));beforePoints.forEach((q,i)=>{near(afterPoints[i].x,q.x+30);near(afterPoints[i].y,q.y+50);});
console.log('Annotations verified: doorway actor/camera priority and visible leaf/frame hits, legacy/strict validation, text scaling, all three curved-arrow controls at multiple zooms, relative labels/colors, portable persistence, clipboard cross-scene independence, scene duplication and multi-move.');
const movedText=moved.find(o=>o.type==='text');assert.equal(movedText.text,text.text);assert.equal(movedText.width,text.width);assert.equal(moved.find(o=>o.type==='camera').labelConnector,false);
