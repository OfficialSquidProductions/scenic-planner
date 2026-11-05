const assert=require('node:assert/strict'),fs=require('node:fs');
for(const base of ['dist','ios/Resources/web']){
 const html=fs.readFileSync(base+'/index.html','utf8');
 assert.doesNotMatch(html,/map-legend|camera-dot|actor-dot|light-dot/,base+' removes the fixed-color legend');
 for(const id of ['scene-canvas','canvas-hint','canvas-mode','north-compass','zoom-out','zoom-label','zoom-in','fit'])assert(html.includes('id="'+id+'"'),base+' preserves '+id);
 for(const file of ['style.css','ipad.css'])assert.doesNotMatch(fs.readFileSync(base+'/'+file,'utf8'),/map-legend|camera-dot|actor-dot|light-dot/,base+' removes unused legend styling');
}
console.log('Canvas legend removal passed for desktop and bundled iOS markup; canvas guidance, preview badge, compass and zoom controls retained.');
