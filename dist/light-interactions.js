/* Bounded 2D planning optics: direct rays, opaque flags, surface reflection and
   transmitted diffusion. Energies are relative; rendered opacity is a display
   curve, not lux, exposure, spectra, vertical photometry or global illumination. */
(function(root){
'use strict';
const common=typeof module==='object'&&module.exports,catalog=common?require('./catalog.js'):root.ScenicCatalog,geometry=common?require('./engine.js'):root.ScenicGeometry,model=common?require('./model.js'):root.ScenicModel;
const PI=Math.PI,TAU=PI*2,EPS=.03,LIMITS={lights:48,emitters:192,depth:3,rays:384,cell:180};
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),dot=(a,b)=>a.x*b.x+a.y*b.y,unit=v=>{const d=Math.hypot(v.x,v.y)||1;return{x:v.x/d,y:v.y/d};},turn=a=>Math.atan2(Math.sin(a),Math.cos(a));
function screen(o){const a=(o.rotation||0)*PI/180,t={x:Math.cos(a),y:Math.sin(a)},n={x:t.y,y:-t.x},half=o.width/2;return {id:o.id,object:o,n,x:o.x-t.x*half,y:o.y-t.y*half,x2:o.x+t.x*half,y2:o.y+t.y*half,modifier:true};}
function material(o,incoming){
 const n=screen(o).n,front=dot(incoming,n)<0,facing=front?n:{x:-n.x,y:-n.y};let kind=o.asset;
 if(['flex-silver','flex-gold','flex-white'].includes(kind)&&!front)return {kind:'absorb',normal:facing,efficiency:0,spread:0,tint:[1,1,1]};
 if(kind==='bounce-board')kind=(o.bounceSide||'White')===(front?'White':'Black')?'flex-white':'flex-black';
 if(kind==='negative-fill'||kind==='flex-black')return {kind:'absorb',normal:facing,efficiency:0,spread:0,tint:[1,1,1]};
 if(kind==='diffusion-kit')return {kind:'diffuse',normal:{x:-facing.x,y:-facing.y},efficiency:.72,spread:150*PI/180,tint:[1,1,1]};
 if(kind==='flex-silver')return {kind:'reflect',normal:facing,efficiency:.84,spread:38*PI/180,tint:[1,1,1]};
 if(kind==='flex-gold')return {kind:'reflect',normal:facing,efficiency:.70,spread:95*PI/180,tint:[1,.78,.40]};
 return {kind:'white',normal:facing,efficiency:.67,spread:155*PI/180,tint:[1,1,1]};
}
function fixture(o){
 const studio=catalog.studioOutput(o),half=clamp(o.beam,1,360)*PI/360,outer=studio?Math.min(PI,half*1.5):half;let lo=-outer,hi=outer,throughput=1;
 if(o.barnDoors){
  const leaf=key=>{const a=clamp(o[key]??0,-75,90)*PI/180;return Math.atan2(11-22*Math.sin(a),14+22*Math.cos(a));};
  lo=Math.max(lo,-leaf('barnLeft'));hi=Math.min(hi,leaf('barnRight'));
  const vertical=key=>Math.max(0,Math.cos(Math.max(0,clamp(o[key]??0,-75,90))*PI/180));throughput=(vertical('barnTop')+vertical('barnBottom'))/2;
 }
 const gain=studio?studio.relative*(catalog.STUDIO_REFERENCE_DISTANCE**2+studio.core**2)/studio.core**2:1;
 return {id:o.id,sourceId:o.id,x:o.x,y:o.y,angle:(o.rotation||0)*PI/180,start:lo,end:hi,radius:o.radius,energy:o.power/100*throughput*gain,rgb:model.lightColor(o),kind:'direct',depth:0,path:[],...(studio?{photometric:true,core:studio.core,halfPeak:half,outer}:{} )};
}
function fixtures(o){
 const base=fixture(o),profile=catalog.studioOutput(o);if(!profile||profile.samples===1)return [base];
 const n={x:-Math.sin(base.angle),y:Math.cos(base.angle)};
 return [-.35,0,.35].map((u,i)=>({...base,id:base.id+':sample'+i,x:base.x+n.x*profile.aperture*u,y:base.y+n.y*profile.aperture*u,energy:base.energy/3}));
}
function attenuation(e,d){
 if(!e.photometric)return falloff(d/e.radius);
 const t=clamp((1-d/e.radius)/.18,0,1),taper=t*t*(3-2*t);
 return e.core**2/(e.core**2+d*d)*taper;
}
function angularProfile(e,offset){
 if(!e.photometric)return 1;
 const gaussian=Math.exp(-Math.LN2*(offset/e.halfPeak)**2),t=clamp((e.outer-Math.abs(offset))/(e.outer*.15),0,1);
 return gaussian*t*t*(3-2*t);
}
function spatial(obstacles){
 const cells=new Map(),long=[];const cell=LIMITS.cell;
 obstacles.forEach((o,index)=>{o.index=index;o.minX=Math.min(o.x,o.x2);o.maxX=Math.max(o.x,o.x2);o.minY=Math.min(o.y,o.y2);o.maxY=Math.max(o.y,o.y2);const x0=Math.floor(o.minX/cell),x1=Math.floor(o.maxX/cell),y0=Math.floor(o.minY/cell),y1=Math.floor(o.maxY/cell);if((x1-x0+1)*(y1-y0+1)>256){long.push(o);return;}for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++){const k=x+','+y;if(!cells.has(k))cells.set(k,[]);cells.get(k).push(o);}});
 return {cells,long,obstacles};
}
function priority(o,incoming={x:0,y:1}){return !o.modifier?3:material(o.object,incoming).kind==='absorb'?0:o.object.asset==='diffusion-kit'?1:2;}
function firstHit(origin,angle,radius,index,skipId,stats){
 const d={x:Math.cos(angle),y:Math.sin(angle)},seen=new Set();let distance=radius,hit=null;
 const inspect=o=>{if(seen.has(o.index)||o.id===skipId)return;seen.add(o.index);stats.intersections++;const t=geometry.rayDistance(origin,angle,o,{x:o.x2,y:o.y2},Infinity);if(t<EPS||t>distance+EPS||t>radius)return;if(t<distance-EPS||!hit||priority(o,d)<priority(hit,d)||priority(o,d)===priority(hit,d)&&String(o.id).localeCompare(String(hit.id))<0){distance=t;hit=o;}};
 index.long.forEach(inspect);const c=LIMITS.cell;let x=Math.floor(origin.x/c),y=Math.floor(origin.y/c),stepX=d.x>=0?1:-1,stepY=d.y>=0?1:-1;
 let tx=Math.abs(d.x)<1e-12?Infinity:((stepX>0?(x+1)*c:x*c)-origin.x)/d.x,ty=Math.abs(d.y)<1e-12?Infinity:((stepY>0?(y+1)*c:y*c)-origin.y)/d.y,dx=Math.abs(c/d.x),dy=Math.abs(c/d.y),travel=0;
 for(let count=0;travel<=distance+EPS&&count<256;count++){(index.cells.get(x+','+y)||[]).forEach(inspect);if(tx<ty){travel=tx;tx+=dx;x+=stepX;}else{travel=ty;ty+=dy;y+=stepY;}}
 return {distance,hit,x:origin.x+d.x*distance,y:origin.y+d.y*distance,direction:d};
}
function rayAngles(e,index){
 const span=e.end-e.start,full=span>=TAU-1e-6,count=full?128:80,angles=[];
 for(let i=0;i<=count;i++)angles.push(e.start+span*i/count);
 const nearby=index.obstacles.filter(o=>o.id!==e.skipId&&o.maxX>=e.x-e.radius&&o.minX<=e.x+e.radius&&o.maxY>=e.y-e.radius&&o.minY<=e.y+e.radius).sort((a,b)=>Math.hypot((a.x+a.x2)/2-e.x,(a.y+a.y2)/2-e.y)-Math.hypot((b.x+b.x2)/2-e.x,(b.y+b.y2)/2-e.y)).slice(0,40);
 for(const o of nearby)for(const p of [o,{x:o.x2,y:o.y2}]){const a=turn(Math.atan2(p.y-e.y,p.x-e.x)-e.angle);for(const delta of [-.00001,0,.00001]){const v=a+delta;if(v>e.start&&v<e.end)angles.push(v);}}
 return [...new Set(angles)].sort((a,b)=>a-b).slice(0,LIMITS.rays);
}
const falloff=t=>Math.max(0,1-t)**1.35;
function secondary(group,e){
 const o=group.surface.object,incoming=unit({x:group.dx,y:group.dy}),m=material(o,incoming),amount=clamp(o.modifierStrength??100,0,100)/100,point={x:group.x/group.flux,y:group.y/group.flux},radius=Math.max(1,e.radius-group.distance/group.flux),incidence=Math.abs(dot(incoming,m.normal));
 const reflected=unit({x:incoming.x-2*dot(incoming,m.normal)*m.normal.x,y:incoming.y-2*dot(incoming,m.normal)*m.normal.y});
 const direction=m.kind==='diffuse'?unit({x:incoming.x*.45+m.normal.x*.55,y:incoming.y*.45+m.normal.y*.55}):m.kind==='white'?m.normal:reflected;
 const base={id:e.id+':'+o.id+':'+group.bin,sourceId:e.sourceId,radius,depth:e.depth+1,path:[...e.path,o.id],skipId:o.id,rgb:e.rgb.map((c,i)=>Math.round(c*m.tint[i])),kind:m.kind,energy:group.flux*amount*m.efficiency*(m.kind==='absorb'?0:e.photometric?1:.35+.65*incidence),angle:Math.atan2(direction.y,direction.x),normal:m.normal,...(e.photometric?{photometric:true,core:Math.max(12,Math.min(120,o.width/3))}:{} )};
 const out=[];
 if(base.energy>.00002&&radius>2)out.push({...base,x:point.x+direction.x*.12,y:point.y+direction.y*.12,start:-m.spread/2,end:m.spread/2});
 if(amount<1&&radius>2)out.push({...base,id:base.id+':through',x:point.x+incoming.x*.12,y:point.y+incoming.y*.12,energy:group.flux*(1-amount),angle:Math.atan2(incoming.y,incoming.x),start:-Math.max(.01,group.spread)/2,end:Math.max(.01,group.spread)/2,rgb:e.rgb,kind:'through',normal:null});
 return out;
}
function solve(objects,walls,options={}){
 const stats={intersections:0,rays:0,emitters:0,truncated:false},surfaces=objects.filter(o=>catalog.isModifier(o)&&o.modifierEnabled!==false&&(o.modifierStrength??100)>0).map(screen),index=spatial([...walls.map((w,i)=>({...w,id:'wall:'+i})),...surfaces]);
 const lights=objects.filter(o=>o.type==='light'&&o.kind!=='sun'&&o.enabled&&o.power>0);if(lights.length>LIMITS.lights)stats.truncated=true;
 const queue=lights.slice(0,LIMITS.lights).flatMap(fixtures),beams=[],events=[];
 const sun=options.sun;
 if(sun?.daylight&&sun.strength>0){
  const incoming={x:Math.cos(sun.rayAngle),y:Math.sin(sun.rayAngle)},rgb=geometry.temperature(sun.temperature);
  if(surfaces.length>64)stats.truncated=true;for(const surface of surfaces.slice(0,64)){const flux=sun.strength/3;for(let bin=0;bin<3;bin++){const t=(bin+.5)/3,p={x:surface.x+(surface.x2-surface.x)*t,y:surface.y+(surface.y2-surface.y)*t},up=firstHit(p, sun.rayAngle+PI,20000,index,surface.id,stats);if(up.hit)continue;
   const group={surface,bin,flux,x:p.x*flux,y:p.y*flux,dx:incoming.x*flux,dy:incoming.y*flux,distance:0,spread:.01};
   for(const child of secondary(group,{id:'sun',sourceId:objects.find(o=>o.kind==='sun')?.id||'sun',radius:1500,depth:0,path:[],rgb}))if(queue.length<LIMITS.emitters)queue.push(child);else stats.truncated=true;events.push({surfaceId:surface.id,sourceId:'sun',kind:material(surface.object,incoming).kind,energy:flux});
  }}
 }
 for(let cursor=0;cursor<queue.length;cursor++){
  if(cursor>=LIMITS.emitters){stats.truncated=true;break;}const e=queue[cursor];if(e.end<=e.start||e.energy<.00002||e.radius<=0)continue;
  const angles=rayAngles(e,index),rays=[],groups=new Map(),span=e.end-e.start;
  for(let i=0;i<angles.length;i++){
   const offset=angles[i],a=e.angle+offset,hemisphere=!e.normal||Math.cos(a)*e.normal.x+Math.sin(a)*e.normal.y>0,profile=hemisphere?(['direct','through'].includes(e.kind)?e.kind==='direct'?angularProfile(e,offset):1:Math.max(0,Math.cos(offset/(span/2)*PI/2))**1.2):0;
   const result=firstHit(e,a,e.radius,index,e.skipId,stats),weight=((i?offset-angles[i-1]:0)+(i<angles.length-1?angles[i+1]-offset:0))/2/span,flux=e.energy*weight*profile*attenuation(e,result.distance);
   rays.push({x:result.x,y:result.y,angle:a,profile,hitId:result.hit?.id||null});stats.rays++;
   const surface=result.hit;if(!surface?.modifier||flux<.0000001)continue;
   if(e.path.includes(surface.id)||e.depth>=LIMITS.depth){if(material(surface.object,result.direction).kind!=='absorb')stats.truncated=true;continue;}
   const length=(surface.x2-surface.x)**2+(surface.y2-surface.y)**2,u=((result.x-surface.x)*(surface.x2-surface.x)+(result.y-surface.y)*(surface.y2-surface.y))/(length||1),bin=Math.min(2,Math.max(0,Math.floor(u*3))),key=surface.id+':'+bin;
   if(!groups.has(key))groups.set(key,{surface,bin,flux:0,x:0,y:0,dx:0,dy:0,distance:0,min:offset,max:offset,spread:0});const g=groups.get(key);g.flux+=flux;g.x+=result.x*flux;g.y+=result.y*flux;g.dx+=result.direction.x*flux;g.dy+=result.direction.y*flux;g.distance+=result.distance*flux;g.min=Math.min(g.min,offset);g.max=Math.max(g.max,offset);g.spread=g.max-g.min;
  }
  beams.push({...e,rays});stats.emitters++;
  for(const g of groups.values()){
   const output=secondary(g,e);events.push({surfaceId:g.surface.id,sourceId:e.sourceId,kind:material(g.surface.object,unit({x:g.dx,y:g.dy})).kind,energy:g.flux,outputEnergy:output.reduce((n,e)=>n+e.energy,0)});
   for(const child of output)if(queue.length<LIMITS.emitters)queue.push(child);else stats.truncated=true;
  }
 }
 return {beams,surfaces,events,stats};
}
function draw(c,result){
 for(const beam of result.beams){if(beam.rays.length<2)continue;c.save();const alpha=beam.kind==='direct'?.68*beam.energy:Math.min(.68,Math.sqrt(beam.energy)*1.4),g=c.createRadialGradient(beam.x,beam.y,0,beam.x,beam.y,beam.radius);if(beam.photometric){for(const t of [0,.03,.08,.16,.28,.45,.65,.82,1]){const value=beam.energy*attenuation(beam,t*beam.radius),display=['reflect','white','diffuse'].includes(beam.kind)?Math.sqrt(Math.max(0,value)):Math.max(0,value),opacity=.78*(1-Math.exp(-display*.65));g.addColorStop(t,`rgba(${beam.rgb},${opacity})`);}}else{g.addColorStop(0,`rgba(${beam.rgb},${alpha})`);g.addColorStop(.22,`rgba(${beam.rgb},${alpha*.59})`);g.addColorStop(.60,`rgba(${beam.rgb},${alpha*.22})`);g.addColorStop(1,`rgba(${beam.rgb},0)`);}c.fillStyle=g;
  if(['direct','through'].includes(beam.kind)&&!beam.photometric){c.beginPath();c.moveTo(beam.x,beam.y);for(const p of beam.rays)c.lineTo(p.x,p.y);c.closePath();c.fill();c.restore();continue;}
  for(let i=0;i<beam.rays.length-1;i++){const p=beam.rays[i],q=beam.rays[i+1];c.globalAlpha=(p.profile+q.profile)/2;c.beginPath();c.moveTo(beam.x,beam.y);c.lineTo(p.x,p.y);c.lineTo(q.x,q.y);c.closePath();c.fill();}c.restore();
 }
}
const api={LIMITS,screen,material,fixture,fixtures,attenuation,angularProfile,spatial,firstHit,solve,draw};if(common)module.exports=api;else root.ScenicLightInteractions=api;
})(globalThis);
