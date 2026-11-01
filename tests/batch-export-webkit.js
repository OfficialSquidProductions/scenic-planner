const checks=[];function check(value,label){if(!value)throw Error(label);checks.push(label);}
const p=JSON.parse(fixture);p.name='Bathroom batch export QA';p.theme='light';loadWorkspace({version:2,activeProject:p.projectId,projects:[p]});refresh();
await new Promise(resolve=>setTimeout(resolve,50));
const source=JSON.stringify(workspaceData()),originalCanvas=canvas,originalContext=ctx,originalView=view,originalSize=size;choose('camera');const selectedBefore=selected,selectionBefore=selectedIds;const undoBefore=history.length;
const result=await ScenicBatchExport.start(doc.projectId,'pdf');check(result.completed&&result.count===2,'One multipage PDF exports every scene in production order');
check(JSON.stringify(workspaceData())===source,'Export does not change the production, active scene or objects');check(canvas===originalCanvas&&ctx===originalContext&&view===originalView&&JSON.stringify(size)===JSON.stringify(originalSize),'Live renderer surface and viewport restored exactly');check(selected===selectedBefore&&selectedIds===selectionBefore&&history.length===undoBefore,'Selection and undo history retained');
check((await ScenicBatchExport.start(doc.projectId,'png')).completed,'Native separate-PNG folder export completes');check((await ScenicBatchExport.start(doc.projectId,'png')).completed,'Repeated export creates a new collision-safe PNG folder');
let appended=0;const request=ScenicDesktop.request.bind(ScenicDesktop);ScenicDesktop.request=async(action,payload)=>{const result=await request(action,payload);if(action==='appendScenePNGExport'&&++appended===1)ScenicBatchExport.cancel(doc.projectId);return result;};
const cancelled=await ScenicBatchExport.start(doc.projectId,'png');check(!cancelled.completed&&cancelled.message==='Export cancelled.','Cancel between scenes removes the partial batch');ScenicDesktop.request=request;
check(!ScenicBatchExport.status().running&&JSON.stringify(workspaceData())===source,'Cancelled export restores live workspace and ready state');
let rejected=false;try{await ScenicBatchExport.start('stale-production','pdf');}catch{rejected=true;}check(rejected,'Stale scene-window production cannot export another production');
const raw=ScenicDesktop.exportFile;ScenicDesktop.exportFile=async()=>{throw Error('Synthetic destination unavailable');};rejected=false;try{await ScenicBatchExport.start(doc.projectId,'pdf');}catch(e){rejected=e.message==='Synthetic destination unavailable';}ScenicDesktop.exportFile=raw;
check(rejected&&!ScenicBatchExport.status().running&&JSON.stringify(workspaceData())===source,'Save error is reported and leaves the editor unchanged');
if(ScenicModel.annotationPoints){
 const extreme=structuredClone(p);extreme.projectId='extreme-export-qa';extreme.name='Extreme annotation frame QA';const camera=extreme.scenes[0].objects.find(o=>o.type==='camera');camera.labelOffsetX=10000;camera.labelOffsetY=-10000;
 extreme.scenes[0].objects.push({id:'far-text',name:'Far scene label',type:'text',x:-12000,y:12000,text:'Far scene label',width:400,height:100,rotation:25,color:'#111111',keepProportions:true},{id:'wide-arrow',name:'Wide arrow',type:'arrow',x:1000,y:2000,points:[{x:-5000,y:5000},{x:5000,y:-5000},{x:5000,y:5000}],scale:10,rotation:15,lineWidth:6,color:'#ff2020'});
 loadWorkspace({version:2,activeProject:extreme.projectId,projects:[extreme]});refresh();const originalDraw=draw;let framed=0;
 draw=function(exporting){if(exporting&&doc.projectId==='extreme-export-qa'&&scene().id===extreme.scenes[0].id){
  const points=scene().objects.filter(o=>o.type==='text'||o.type==='arrow').flatMap(o=>ScenicModel.annotationPoints(o));const label=informationLabelBox(scene().objects.find(o=>o.type==='camera'));points.push({x:label.left,y:label.top},{x:label.right,y:label.bottom});
  check(view.z<.12,'Batch fit can zoom below the interactive minimum for far-apart content');check(points.every(p=>{const x=view.x+p.x*view.z,y=view.y+p.y*view.z;return x>=0&&x<=size.w&&y>=0&&y<=size.h;}),'Extreme text/arrow controls and displaced information box fit entirely in exported map bounds');framed++;
 }return originalDraw(exporting);};
 try{check((await ScenicBatchExport.start(doc.projectId,'pdf')).completed&&framed===1,'Actual multipage export includes extreme annotation geometry without clipping');}finally{draw=originalDraw;}
}
return {passed:true,checks};
