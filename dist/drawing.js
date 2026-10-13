/* Door/window symbols, recorded routes, and directional sun shadows. */
function drawOpening(o){
 const kind=ScenicModel.openingKind(o),wall=scene().objects.find(w=>w.id===o.wallId),thickness=wall?.thickness||8;
 localShape(o,()=>{
  ctx.lineWidth=2/view.z;ctx.strokeStyle=kind==='window'?'#8eafc7':color('--map-prop-line');ctx.fillStyle=color('--map');
  if(kind==='window'){
   ctx.fillRect(-o.width/2,-thickness/2,o.width,thickness);ctx.strokeRect(-o.width/2,-thickness/2,o.width,thickness);
   ctx.beginPath();ctx.moveTo(-o.width/2,0);ctx.lineTo(o.width/2,0);if(o.asset==='window-double'){ctx.moveTo(0,-thickness/2);ctx.lineTo(0,thickness/2);}ctx.stroke();
   if(o.curtains){ctx.strokeStyle=color('--accent-ink');ctx.lineWidth=5/view.z;ctx.beginPath();ctx.moveTo(-o.width/2,0);ctx.lineTo(o.width/2,0);ctx.stroke();}
  }else{
   ctx.fillRect(-o.width/2,-thickness/2,o.width,thickness);
   ctx.strokeStyle=color('--wall');ctx.beginPath();for(const x of [-o.width/2,o.width/2]){ctx.moveTo(x,-thickness);ctx.lineTo(x,thickness);}ctx.stroke();
   const sliding=['door-sliding','door-pocket','door-garage'].includes(o.asset);
   if(sliding){ctx.strokeStyle=color('--map-prop-line');ctx.lineWidth=3/view.z;const offset=o.open?o.width:0;ctx.beginPath();ctx.moveTo(-o.width/2+offset,2);ctx.lineTo(o.width/2+offset,2);ctx.stroke();}
   else{
    const sign=o.swingSide==='Side B'?-1:1,drawLeaf=(hinge,dir,width)=>{
     ctx.save();ctx.translate(hinge,0);ctx.strokeStyle=color('--map-prop-line');ctx.lineWidth=1/view.z;ctx.setLineDash([4/view.z,3/view.z]);ctx.beginPath();const start=dir===1?0:Math.PI,end=start+sign*dir*Math.PI/2;ctx.arc(0,0,width,Math.min(start,end),Math.max(start,end));ctx.stroke();ctx.setLineDash([]);
     ctx.lineWidth=3/view.z;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(o.open?0:dir*width,o.open?sign*width:0);ctx.stroke();ctx.restore();
    };
    if(o.asset==='door-double'||o.asset==='door-french'){drawLeaf(-o.width/2,1,o.width/2);drawLeaf(o.width/2,-1,o.width/2);}else drawLeaf(o.hinge==='Right'?o.width/2:-o.width/2,o.hinge==='Right'?-1:1,o.width);
   }
  }
 });
 if(o.id===selected)label(o,`${o.name} · ${kind==='door'?(o.open?'open':'closed'):(o.curtains?'curtains closed':'uncovered')}`,Math.max(thickness+18,24)/view.z);
}
function drawMovementPaths(){
 for(const o of scene().objects.filter(o=>o.marks?.length&&o.showRoute!==false)){
  const c=o.type==='actor'?o.color||'#cf7d96':o.type==='camera'?'#8ca9ce':'#d8ad59';ctx.save();ctx.strokeStyle=c;ctx.fillStyle=c;ctx.lineWidth=1.6/view.z;ctx.setLineDash([6/view.z,5/view.z]);
  ctx.beginPath();o.marks.forEach((m,i)=>i?ctx.lineTo(m.x,m.y):ctx.moveTo(m.x,m.y));ctx.stroke();ctx.setLineDash([]);
  for(let i=0;i<o.marks.length;i++){
   const m=o.marks[i],next=o.marks[i+1];if(next&&Math.hypot(next.x-m.x,next.y-m.y)>10/view.z){const a=Math.atan2(next.y-m.y,next.x-m.x),x=(next.x+m.x)/2,y=(next.y+m.y)/2;ctx.beginPath();ctx.moveTo(x-8/view.z*Math.cos(a-.5),y-8/view.z*Math.sin(a-.5));ctx.lineTo(x,y);ctx.lineTo(x-8/view.z*Math.cos(a+.5),y-8/view.z*Math.sin(a+.5));ctx.stroke();}
   ctx.beginPath();ctx.arc(m.x,m.y,10/view.z,0,Math.PI*2);ctx.fillStyle=color('--paper');ctx.fill();ctx.stroke();ctx.fillStyle=c;ctx.font=`${10/view.z}px Futura,sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(ScenicModel.markLabel(i),m.x,m.y);
  }ctx.restore();
 }
}
function drawSun(c,left,top,right,bottom){
 const sun=scene().objects.find(o=>o.kind==='sun'&&o.enabled);if(!sun)return;const state=ScenicModel.sunState(sun);if(!state.daylight)return;
 if(lightCanvas.width!==canvas.width||lightCanvas.height!==canvas.height){lightCanvas.width=canvas.width;lightCanvas.height=canvas.height;}
 lc.setTransform(1,0,0,1,0,0);lc.clearRect(0,0,lightCanvas.width,lightCanvas.height);lc.save();lc.setTransform(c.getTransform());
 const rgb=ScenicGeometry.temperature(state.temperature);lc.fillStyle=`rgba(${rgb},${state.strength*.38})`;lc.fillRect(left,top,right-left,bottom-top);
 lc.globalCompositeOperation='destination-out';lc.fillStyle='#000';const distance=Math.max(20000,Math.hypot(right-left,bottom-top)*5),dx=Math.cos(state.rayAngle)*distance,dy=Math.sin(state.rayAngle)*distance;
 for(const w of ScenicModel.effectiveWalls(scene().objects)){pathPolygon(lc,[{x:w.x,y:w.y},{x:w.x2,y:w.y2},{x:w.x2+dx,y:w.y2+dy},{x:w.x+dx,y:w.y+dy}]);lc.fill();}
 lc.restore();c.save();c.setTransform(1,0,0,1,0,0);c.drawImage(lightCanvas,0,0);c.restore();
}
function drawSunMarker(o){
 const state=ScenicModel.sunState(o);localShape(o,()=>{ctx.strokeStyle=state.daylight&&o.enabled?'#e4b65d':color('--muted');ctx.fillStyle='#d8ad5922';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,18,0,Math.PI*2);ctx.fill();ctx.stroke();for(let i=0;i<8;i++){const a=i*Math.PI/4;ctx.beginPath();ctx.moveTo(Math.cos(a)*23,Math.sin(a)*23);ctx.lineTo(Math.cos(a)*29,Math.sin(a)*29);ctx.stroke();}});
 if(o.solarReal&&!state.error){ctx.save();ctx.translate(o.x,o.y);ctx.strokeStyle=color('--accent');ctx.lineWidth=1.5/view.z;const toward=state.rayAngle+Math.PI;ctx.setLineDash([3/view.z,3/view.z]);ctx.beginPath();ctx.moveTo(Math.cos(toward)*33,Math.sin(toward)*33);ctx.lineTo(Math.cos(toward)*62,Math.sin(toward)*62);ctx.stroke();ctx.restore();
 }label(o,'Sun · '+timeLabel(o.time),43);
}

// North stays beside the zoom controls while the map pans and zooms.
function updateNorthCompass(){
 const sun=scene().objects.find(o=>o.kind==='sun'&&o.solarReal),compass=$('north-compass');compass.hidden=!sun;if(!sun)return;
 const angle=sun.northAngle||0;if(compass.dataset.angle===String(angle))return;compass.dataset.angle=String(angle);
 const a=angle*Math.PI/180,description=`True north · ${angle}° clockwise from map up`;
 compass.setAttribute('aria-label',description);compass.title=description;
 $('north-compass-arrow').setAttribute('transform',`rotate(${angle})`);
 $('north-compass-label').setAttribute('x',Math.sin(a)*19);$('north-compass-label').setAttribute('y',-Math.cos(a)*19+3.5);
}
function drawExportNorthCompass(){
 const sun=scene().objects.find(o=>o.kind==='sun'&&o.solarReal);if(!sun)return;
 const a=((sun.northAngle||0)-90)*Math.PI/180,nx=Math.cos(a),ny=Math.sin(a);ctx.save();ctx.translate(size.w-45,size.h-45);ctx.strokeStyle=color('--accent');ctx.fillStyle=color('--accent');ctx.lineWidth=1.5;
 ctx.beginPath();ctx.moveTo(-nx*10,-ny*10);ctx.lineTo(nx*12,ny*12);ctx.stroke();ctx.beginPath();ctx.moveTo(nx*12,ny*12);ctx.lineTo(nx*5-ny*4,ny*5+nx*4);ctx.lineTo(nx*5+ny*4,ny*5-nx*4);ctx.closePath();ctx.fill();ctx.font='600 11px Futura, sans-serif';ctx.textAlign='center';ctx.fillText('N',nx*23,ny*23+4);ctx.restore();
}

/* Selection handles are screen-sized at every map zoom, and omitted from exports. */
function drawTransformHandles(o,showHandles=true){
 ctx.save();ctx.strokeStyle=color('--accent');ctx.fillStyle=color('--paper');ctx.lineWidth=1.5/view.z;ctx.setLineDash([4/view.z,4/view.z]);
 if(o.type==='wall'){
  ctx.beginPath();ctx.moveTo(o.x,o.y);ctx.lineTo(o.x2,o.y2);ctx.stroke();
  if(showHandles)label(ScenicTransforms.center(o),formatLength(Math.hypot(o.x2-o.x,o.y2-o.y)),18/view.z);
 }else if(o.type==='actor'){localShape(o,()=>{const f=ScenicModel.actorFootprint(o);ctx.beginPath();ctx.ellipse(0,0,f.width/2+6/view.z,f.height/2+6/view.z,0,0,Math.PI*2);ctx.stroke();});}else if(ScenicTransforms.aimable(o)){ctx.beginPath();ctx.arc(o.x,o.y,(o.type==='light'?24:28)+6/view.z,0,Math.PI*2);ctx.stroke();}
 else localShape(o,()=>{const pad=6/view.z,w=o.width??60,h=o.height??60;ctx.strokeRect(-w/2-pad,-h/2-pad,w+pad*2,h+pad*2);});
 ctx.setLineDash([]);
 const handles=playback||!showHandles?[]:ScenicTransforms.handles(o,view.z);
 for(const h of handles){
  if(h.kind==='rotate'){
   ctx.beginPath();ctx.moveTo(h.base.x,h.base.y);ctx.lineTo(h.x,h.y);ctx.stroke();
   ctx.beginPath();ctx.arc(h.x,h.y,6/view.z,0,Math.PI*2);ctx.fill();ctx.stroke();
   // Small turning arc makes the rotation control distinct from resize handles.
   ctx.beginPath();ctx.arc(h.x,h.y,3/view.z,-Math.PI*.8,Math.PI*.6);ctx.stroke();
  }else{const half=4/view.z;ctx.fillRect(h.x-half,h.y-half,half*2,half*2);ctx.strokeRect(h.x-half,h.y-half,half*2,half*2);}
 }
 ctx.restore();
}
function updateTransformReadout(o){
 for(const key of ['x','y','x2','y2','width','height']){for(const field of document.querySelectorAll(`[data-prop="${key}"][data-length]`)){if(field.dataset.inside){field.dataset.min=36-o.thickness;field.dataset.max=5000-o.thickness;}if(Number.isFinite(o[key]))field.value=formatLength(o[key]-(field.dataset.inside?o.thickness:0));}}
 if(o.type!=='wall'){
  const field=document.querySelector('[data-prop="rotation"]'),output=$('out-rotation');if(field)field.value=o.rotation||0;if(output)output.textContent=Math.round((o.rotation||0)*10)/10+'°';
 }
 const length=document.querySelector('.measurement-readout');if(length&&o.type==='wall')length.textContent='Centerline length: '+formatLength(Math.hypot(o.x2-o.x,o.y2-o.y));
}
function cancelDrag(){
 if(!drag)return;
 if(drag.mode==='marquee'){const prior=drag;drag=null;setSelection(prior.selectionBefore);wallMultiSelect=prior.wallModeBefore;refreshWallSelection();canvas.style.cursor=tool==='select'?'default':'crosshair';return;}
 const before=drag.before,ids=drag.ids||[selected].filter(Boolean);drag=null;
 if(before){loadWorkspace(JSON.parse(before));setSelection(ids);refresh();}
 canvas.style.cursor=tool==='hand'?'grab':tool==='select'?'default':'crosshair';invalidate();
}

function drawWallSelection(w){
 ctx.save();ctx.strokeStyle=color('--accent');ctx.lineWidth=Math.max(w.thickness,3/view.z);ctx.setLineDash([6/view.z,4/view.z]);ctx.beginPath();ctx.moveTo(w.x,w.y);ctx.lineTo(w.x2,w.y2);ctx.stroke();ctx.restore();
}

function drawMarquee(){
 const r=ScenicSelection.rect(drag.start,drag.end);ctx.save();ctx.strokeStyle=color('--accent');ctx.fillStyle='#E6002615';ctx.lineWidth=1.3/view.z;ctx.fillRect(r.left,r.top,r.right-r.left,r.bottom-r.top);ctx.setLineDash([5/view.z,3/view.z]);ctx.strokeRect(r.left,r.top,r.right-r.left,r.bottom-r.top);ctx.setLineDash([]);ctx.fillStyle=color('--accent-ink');ctx.font=`${11/view.z}px Futura,sans-serif`;ctx.textAlign='left';ctx.fillText(`${selectionItems().length} selected`,r.left+5/view.z,r.top-8/view.z);ctx.restore();
}

function cameraViewReadout(o){const v=ScenicModel.cameraView(o);return `Horizontal view: ${v.fov.toFixed(1)}° · Width at ${formatLength(v.distance)}: ${formatLength(v.width)}`;}
function drawCameraCoverage(o,walls){
 ctx.save();pathPolygon(ctx,ScenicModel.cameraCoverage(o,walls));
 ctx.fillStyle=doc.theme==='dark'?'#9eb7e312':'#587ba412';ctx.fill();
 ctx.strokeStyle=o.id===selected?'#587ba4c0':'#8ea9d080';ctx.lineWidth=(o.id===selected?1.5:1)/view.z;
 ctx.setLineDash([4/view.z,5/view.z]);ctx.stroke();ctx.restore();
}
