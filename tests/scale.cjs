const assert=require('node:assert/strict'),catalog=require('../dist/catalog.js'),model=require('../dist/model.js'),selection=require('../dist/selection.js'),transforms=require('../dist/transforms.js');
const near=(a,b)=>assert(Math.abs(a-b)<1e-6,`${a} != ${b}`);
// Independently calculate the actual SVG path bounds, including curve extrema.
function pathBounds(path){
 const tokens=path.match(/[A-Za-z]|[-+]?(?:\d*\.\d+|\d+)(?:e[-+]?\d+)?/g)||[],points=[];let i=0,x=0,y=0,sx=0,sy=0;
 const add=(a,b)=>points.push([a,b]),number=()=>Number(tokens[i++]);
 while(i<tokens.length){const cmd=tokens[i++];
  if(cmd==='M'||cmd==='L'){x=number();y=number();if(cmd==='M'){sx=x;sy=y;}add(x,y);}
  else if(cmd==='H'){x=number();add(x,y);}
  else if(cmd==='V'){y=number();add(x,y);}
  else if(cmd==='Z'){x=sx;y=sy;add(x,y);}
  else if(cmd==='Q'){
   const cx=number(),cy=number(),ex=number(),ey=number();
   for(const t of [(x-cx)/(x-2*cx+ex),(y-cy)/(y-2*cy+ey)])if(t>0&&t<1)add((1-t)**2*x+2*(1-t)*t*cx+t*t*ex,(1-t)**2*y+2*(1-t)*t*cy+t*t*ey);
   x=ex;y=ey;add(x,y);
  }else if(cmd==='A'){
   // SVG endpoint-to-center conversion for axis-aligned ellipses.
   const rx=number(),ry=number(),rotation=number(),large=number(),sweep=number(),ex=number(),ey=number();assert.equal(rotation,0);assert([0,1].includes(large));
   const px=(x-ex)/2,py=(y-ey)/2,f=(large===sweep?-1:1)*Math.sqrt(Math.max(0,(rx*rx*ry*ry-rx*rx*py*py-ry*ry*px*px)/(rx*rx*py*py+ry*ry*px*px)));
   const cx=(x+ex)/2+f*rx*py/ry,cy=(y+ey)/2-f*ry*px/rx,start=Math.atan2((y-cy)/ry,(x-cx)/rx);let delta=Math.atan2((ey-cy)/ry,(ex-cx)/rx)-start;if(sweep&&delta<0)delta+=2*Math.PI;if(!sweep&&delta>0)delta-=2*Math.PI;
   for(let j=0;j<4;j++){const a=j*Math.PI/2,d=((a-start)*(sweep?1:-1)%(2*Math.PI)+2*Math.PI)%(2*Math.PI);if(d<=Math.abs(delta)+1e-9)add(cx+rx*Math.cos(a),cy+ry*Math.sin(a));}
   x=ex;y=ey;add(x,y);
  }else throw Error('Unsupported path command '+cmd);
 }
 return points;
}
for(const [shape,paths] of Object.entries(catalog.shapes)){
 const pts=paths.flatMap(pathBounds),xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]),actual=[Math.min(...xs),Math.min(...ys),Math.max(...xs)-Math.min(...xs),Math.max(...ys)-Math.min(...ys)];
 const bounds=catalog.shapeBounds[shape];actual.forEach((v,i)=>{try{near(v,bounds[i]);}catch(e){throw Error(`${shape}: ${e.message}`);}});
 for(const item of catalog.items.filter(o=>o.shape===shape)){
  const scaled=pts.map(([x,y])=>[(x-bounds[0])*item.width/bounds[2]-item.width/2,(y-bounds[1])*item.height/bounds[3]-item.height/2]);
  near(Math.min(...scaled.map(p=>p[0])),-item.width/2);near(Math.max(...scaled.map(p=>p[0])),item.width/2);near(Math.min(...scaled.map(p=>p[1])),-item.height/2);near(Math.max(...scaled.map(p=>p[1])),item.height/2);
 }
}
for(const inches of [-120,-13.3,0,.1,11.9,12,60,80,144,192])near(catalog.parseLength(catalog.formatLength(inches*3)),inches*3);
near(catalog.parseLength('1 ft'),36);near(catalog.parseLength('1 in'),3);near(catalog.DEFAULT_WALL_THICKNESS,13.5);
assert.deepEqual([catalog.get('bed').width,catalog.get('bed').height],[180,240]);assert.deepEqual([catalog.get('apple-box-full').width,catalog.get('apple-box-full').height],[60,36]);
const actor={id:'actor',type:'actor',name:'Actor',x:0,y:0,rotation:0};assert.deepEqual(model.actorFootprint(actor),{width:54,height:72});
assert(model.actorContains(actor,{x:27,y:0}));assert(!model.actorContains(actor,{x:28,y:0}));assert(model.actorContains(actor,{x:0,y:36}));assert(!model.actorContains(actor,{x:0,y:37}));
assert(!model.actorContains({...actor,rotation:90},{x:0,y:28}));assert(model.actorContains({...actor,rotation:90},{x:36,y:0}));
assert.deepEqual(selection.inBox([actor],{x:26,y:-1},{x:28,y:1}),['actor']);assert.deepEqual(selection.inBox([actor],{x:26,y:35},{x:28,y:37}),[]);
assert.deepEqual(selection.inBox([{...actor,rotation:90}],{x:34,y:-1},{x:36,y:1}),['actor']);
for(const width of [54,180,600]){const a={...actor,width,height:72};assert(transforms.handles(a,1)[0].base.x>width/2);}
console.log('Scale verified: every catalog path bound and normalized footprint, feet/inches round trips, documented mattress/apple-box sizes, editable actor envelopes, rotated picking/marquee bounds, and clear facing handles.');
