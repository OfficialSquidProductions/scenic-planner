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
 const state=ScenicModel.sunState(o);localShape(o,()=>{ctx.strokeStyle=state.daylight&&o.enabled?'#e4b65d':color('--muted');ctx.fillStyle='#d8ad5922';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,18,0,Math.PI*2);ctx.fill();ctx.stroke();for(let i=0;i<8;i++){const a=i*Math.PI/4;ctx.beginPath();ctx.moveTo(Math.cos(a)*23,Math.sin(a)*23);ctx.lineTo(Math.cos(a)*29,Math.sin(a)*29);ctx.stroke();}});label(o,'Sun · '+timeLabel(o.time),43);
}
