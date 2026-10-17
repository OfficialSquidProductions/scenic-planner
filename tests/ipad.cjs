const assert=require('node:assert/strict');
const {measure,transform}=require('../dist/ipad-gestures.js');
const a=measure([{x:100,y:100},{x:200,y:100}]);
assert.deepEqual(a,{x:150,y:100,distance:100});
assert.deepEqual(transform(a,{x:170,y:120,distance:200},{x:0,y:0,z:1}),{z:2,x:-130,y:-80});
assert.deepEqual(transform(a,{x:170,y:120,distance:100},{x:10,y:20,z:1}),{z:1,x:30,y:40});
assert.equal(transform(a,{x:0,y:0,distance:100000},{x:0,y:0,z:1}).z,4);
assert.equal(transform(a,{x:0,y:0,distance:0},{x:0,y:0,z:1}).z,.1);
for(const zoom of [.1,.5,1,4]){
 const v={x:23,y:-8,z:zoom},r=transform(a,{...a,distance:150},v);
 assert(Math.abs((a.x-r.x)/r.z-(a.x-v.x)/v.z)<1e-8);
 assert(Math.abs((a.y-r.y)/r.z-(a.y-v.y)/v.z)<1e-8);
}
console.log('PASS: iPad pinch anchor, simultaneous pan, zoom limits, and viewport invariance');
