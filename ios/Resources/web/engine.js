/* Shared geometry for wall-aware 2D lighting. Also loadable in Node for verification. */
(function(root){
 const cross=(a,b)=>a.x*b.y-a.y*b.x;
 function rayDistance(origin,angle,a,b,max=Infinity){
  const d={x:Math.cos(angle),y:Math.sin(angle)},s={x:b.x-a.x,y:b.y-a.y},q={x:a.x-origin.x,y:a.y-origin.y};
  const den=cross(d,s);if(Math.abs(den)<1e-9)return max;
  const t=cross(q,s)/den,u=cross(q,d)/den;
  return t>=0&&u>=-1e-8&&u<=1+1e-8&&t<max?t:max;
 }
 function visibility(origin,walls,radius){
  const angles=[];for(let i=0;i<512;i++)angles.push(i*Math.PI*2/512);
  for(const w of walls)for(const p of [{x:w.x,y:w.y},{x:w.x2,y:w.y2}]){const a=Math.atan2(p.y-origin.y,p.x-origin.x);angles.push(a-0.00001,a,a+0.00001);}
  for(let i=0;i<angles.length;i++)angles[i]=(angles[i]%(Math.PI*2)+Math.PI*2)%(Math.PI*2);
  angles.sort((a,b)=>a-b);
  return angles.map(a=>{let d=radius;for(const w of walls)d=rayDistance(origin,a,{x:w.x,y:w.y},{x:w.x2,y:w.y2},d);return{x:origin.x+Math.cos(a)*d,y:origin.y+Math.sin(a)*d};});
 }
 function blocked(a,b,walls){let d=Math.hypot(b.x-a.x,b.y-a.y),ang=Math.atan2(b.y-a.y,b.x-a.x);return walls.some(w=>rayDistance(a,ang,{x:w.x,y:w.y},{x:w.x2,y:w.y2},d)<d-1e-6);}
 function temperature(k){if(k<3500)return [255,193+Math.round((k-2000)*.027),111+Math.round((k-2000)*.055)];if(k<5000)return[255,234,195];if(k<6000)return[245,242,229];return[185,210,255];}
 const api={rayDistance,visibility,blocked,temperature};root.ScenicGeometry=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
