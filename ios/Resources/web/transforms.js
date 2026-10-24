/* Pure map-handle geometry. All deltas use the pose at pointer-down. */
(function(root){
'use strict';
const model=typeof module==='object'&&module.exports?require('./model.js'):root.ScenicModel;
const boxTypes=new Set(['floor','wallGroup','room','image','sofa','table','prop','set','gear']);
const angle=o=>o.type==='wall'?Math.atan2(o.y2-o.y,o.x2-o.x):(o.rotation||0)*Math.PI/180;
const center=o=>o.type==='wall'?{x:(o.x+o.x2)/2,y:(o.y+o.y2)/2}:{x:o.x,y:o.y};
const rotate=(p,a)=>({x:p.x*Math.cos(a)-p.y*Math.sin(a),y:p.x*Math.sin(a)+p.y*Math.cos(a)});
const normalize=degrees=>((degrees+180)%360+360)%360-180;
const aimable=o=>!!o&&(o.type==='actor'||o.type==='camera'||o.type==='light'&&o.kind!=='sun');
const supported=o=>!!o&&!o.locked&&(o.type==='wall'||boxTypes.has(o.type)||aimable(o));
function handles(o,zoom=1){
 if(!supported(o))return [];
 const c=center(o),a=angle(o),toWorld=p=>{const r=rotate(p,a);return{x:c.x+r.x,y:c.y+r.y};};
 if(aimable(o)){const base=Math.max(o.type==='actor'?model.actorFootprint(o).width/2+10:o.type==='light'?24:28,20/zoom);return [{kind:'rotate',...toWorld({x:base+28/zoom,y:0}),base:toWorld({x:base,y:0})}];}
 if(o.type==='wall')return [
  {kind:'rotate',...toWorld({x:0,y:-(o.thickness/2+30/zoom)}),base:c},
  {kind:'start',x:o.x,y:o.y},{kind:'end',x:o.x2,y:o.y2}
 ];
 const w=o.width/2+6/zoom,h=o.height/2+6/zoom;
 const positions=[[-1,-1],[1,-1],[1,1],[-1,1],[0,-1],[1,0],[0,1],[-1,0]];
 return [{kind:'rotate',...toWorld({x:0,y:-h-28/zoom}),base:toWorld({x:0,y:-h})},...positions.map(([sx,sy])=>({kind:'resize',sx,sy,...toWorld({x:sx*w,y:sy*h})}))];
}
function hit(o,p,zoom){return handles(o,zoom).find(h=>Math.hypot(p.x-h.x,p.y-h.y)<=10/zoom)||null;}
function cursor(o,h){
 if(!h)return null;if(h.kind==='rotate')return 'grab';if(h.kind!=='resize')return 'move';
 const a=angle(o)+Math.atan2(h.sy,h.sx),i=((Math.round(a/(Math.PI/4))%4)+4)%4;
 return ['ew-resize','nwse-resize','ns-resize','nesw-resize'][i];
}
function apply(o,h,start,p,{step=0,proportional=false,angleStep=0,min=1.5,max=5000}={}){
 if(!supported(o)||aimable(o)&&h.kind!=='rotate')return {};
 const c=center(o),a=angle(o),dx=p.x-start.x,dy=p.y-start.y;
 if(Math.hypot(dx,dy)<1e-9)return aimable(o)?{rotation:o.rotation||0}:o.type==='wall'?{x:o.x,y:o.y,x2:o.x2,y2:o.y2}:{x:o.x,y:o.y,width:o.width,height:o.height,rotation:o.rotation};
 const quantize=n=>step?Math.round(n/step)*step:n,clamp=n=>Math.max(min,Math.min(max,n));
 if(h.kind==='rotate'){
  const from=Math.atan2(start.y-c.y,start.x-c.x),to=Math.atan2(p.y-c.y,p.x-c.x);
  let next=a+normalize((to-from)*180/Math.PI)*Math.PI/180;
  if(angleStep)next=Math.round(next/(angleStep*Math.PI/180))*angleStep*Math.PI/180;
  if(o.type!=='wall')return {rotation:normalize(next*180/Math.PI)};
  const half=Math.hypot(o.x2-o.x,o.y2-o.y)/2,r=rotate({x:half,y:0},next);
  return {x:c.x-r.x,y:c.y-r.y,x2:c.x+r.x,y2:c.y+r.y};
 }
 if(o.type==='wall'){
  const key=h.kind==='start'?'start':'end',other=key==='start'?{x:o.x2,y:o.y2}:o;
  let q={x:quantize((key==='start'?o.x:o.x2)+dx),y:quantize((key==='start'?o.y:o.y2)+dy)};
  if(Math.hypot(q.x-other.x,q.y-other.y)<min){const old=key==='start'?o:{x:o.x2,y:o.y2},dir=Math.atan2(old.y-other.y,old.x-other.x);q={x:other.x+Math.cos(dir)*min,y:other.y+Math.sin(dir)*min};}
  return key==='start'?q:{x2:q.x,y2:q.y};
 }
 const d=rotate({x:dx,y:dy},-a);
 let w=h.sx?clamp(quantize(o.width+h.sx*d.x)):o.width;
 let height=h.sy?clamp(quantize(o.height+h.sy*d.y)):o.height;
 if(proportional&&(h.sx||h.sy)){
  let scale=h.sx&&h.sy?(o.width*w+o.height*height)/(o.width*o.width+o.height*o.height):h.sx?w/o.width:height/o.height;
  scale=Math.max(Math.max(min/o.width,min/o.height),Math.min(Math.min(max/o.width,max/o.height),scale));
  w=o.width*scale;height=o.height*scale;
 }
 const shift=rotate({x:h.sx*(w-o.width)/2,y:h.sy*(height-o.height)/2},a);
 return {x:o.x+shift.x,y:o.y+shift.y,width:w,height};
}
const api={angle,center,rotate,normalize,aimable,supported,handles,hit,cursor,apply};
if(typeof module==='object'&&module.exports)module.exports=api;else root.ScenicTransforms=api;
})(globalThis);
