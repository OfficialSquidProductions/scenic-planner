/* Pure viewport math shared by the iPad adapter and its regression tests. */
(function(root){
 'use strict';
 function measure(points){const [a,b]=points;return {x:(a.x+b.x)/2,y:(a.y+b.y)/2,distance:Math.hypot(b.x-a.x,b.y-a.y)};}
 function transform(initial,current,view){
  const z=Math.max(.1,Math.min(4,view.z*current.distance/Math.max(1,initial.distance)));
  return {z,x:current.x-(initial.x-view.x)/view.z*z,y:current.y-(initial.y-view.y)/view.z*z};
 }
 const api={measure,transform};if(typeof module==='object'&&module.exports)module.exports=api;else root.ScenicIPadGestures=api;
})(globalThis);
