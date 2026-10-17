/* Pure marquee geometry, shared by the editor and selection tests. */
(function(root){
'use strict';
const model=typeof module==='object'&&module.exports?require('./model.js'):root.ScenicModel;
const rect=(a,b)=>({left:Math.min(a.x,b.x),right:Math.max(a.x,b.x),top:Math.min(a.y,b.y),bottom:Math.max(a.y,b.y)});
function segmentTouches(w,r,pad=0){
 const dx=w.x2-w.x,dy=w.y2-w.y;let low=0,high=1;
 for(const [p,q] of [[-dx,w.x-r.left+pad],[dx,r.right+pad-w.x],[-dy,w.y-r.top+pad],[dy,r.bottom+pad-w.y]]){if(Math.abs(p)<1e-12){if(q<0)return false;}else{const t=q/p;if(p<0)low=Math.max(low,t);else high=Math.min(high,t);if(low>high)return false;}}
 return true;
}
function polygonTouches(points,r){
 const box=[{x:r.left,y:r.top},{x:r.right,y:r.top},{x:r.right,y:r.bottom},{x:r.left,y:r.bottom}],axes=[{x:1,y:0},{x:0,y:1}];
 for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];axes.push({x:a.y-b.y,y:b.x-a.x});}
 return axes.every(axis=>{const a=points.map(p=>p.x*axis.x+p.y*axis.y),b=box.map(p=>p.x*axis.x+p.y*axis.y);return Math.max(...a)>=Math.min(...b)-1e-7&&Math.max(...b)>=Math.min(...a)-1e-7;});
}
function touches(o,r,objects){
 if(o.locked)return false;
 if(o.type==='wall')return segmentTouches(o,r,o.thickness/2);
 if(o.type==='room')return model.roomSegments(o).some(w=>segmentTouches(w,r,w.thickness/2));
 if(o.type==='wallGroup')return objects.some(w=>o.wallIds.includes(w.id)&&w.type==='wall'&&touches(w,r,objects));
 if(o.type==='actor'){
  // Map the rectangle into the ellipse's unit circle. Edge distance gives an
  // exact intersection test, including rotated actors and narrow marquee boxes.
  const f=model.actorFootprint(o),a=-(o.rotation||0)*Math.PI/180,c=Math.cos(a),s=Math.sin(a);
  const points=[[r.left,r.top],[r.right,r.top],[r.right,r.bottom],[r.left,r.bottom]].map(([x,y])=>({x:((x-o.x)*c-(y-o.y)*s)/(f.width/2),y:((x-o.x)*s+(y-o.y)*c)/(f.height/2)}));
  if(o.x>=r.left&&o.x<=r.right&&o.y>=r.top&&o.y<=r.bottom)return true;
  return points.some((p,i)=>{const q=points[(i+1)%4],dx=q.x-p.x,dy=q.y-p.y,t=Math.max(0,Math.min(1,-(p.x*dx+p.y*dy)/(dx*dx+dy*dy||1)));return Math.hypot(p.x+t*dx,p.y+t*dy)<=1;});
 }
 if(['camera','light'].includes(o.type)){const radius=o.kind==='sun'?29:o.type==='actor'?19:23,x=Math.max(r.left,Math.min(r.right,o.x)),y=Math.max(r.top,Math.min(r.bottom,o.y));return Math.hypot(o.x-x,o.y-y)<=radius;}
 const a=(o.rotation||0)*Math.PI/180,c=Math.cos(a),s=Math.sin(a),w=o.width/2,h=o.height/2;
 return polygonTouches([[-w,-h],[w,-h],[w,h],[-w,h]].map(([x,y])=>({x:o.x+x*c-y*s,y:o.y+x*s+y*c})),r);
}
function inBox(objects,a,b){
 const r=rect(a,b),grouped=new Set(objects.filter(o=>o.type==='wallGroup').flatMap(o=>o.wallIds));
 return objects.filter(o=>!grouped.has(o.id)&&touches(o,r,objects)).map(o=>o.id);
}
const api={rect,segmentTouches,polygonTouches,inBox};
if(typeof module==='object'&&module.exports)module.exports=api;else root.ScenicSelection=api;
})(globalThis);
