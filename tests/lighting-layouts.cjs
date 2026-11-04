const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const layouts=require('../dist/lighting-layouts.js'),model=require('../dist/model.js'),shots=require('../dist/shot-list.js'),portable=require('../dist/project-file.js'),copies=require('../dist/object-copy.js');
let n=0;const uid=()=>`qa-${++n}`;
const imported=shots.importCSV('Scene,Shot,Description\n3,3.10,Later\n3,3.2,Earlier',uid)[0];
const light={id:'lamp',type:'light',name:'Key',x:200,y:120,rotation:0,power:70,temperature:3200,beam:60,radius:400,enabled:true};
const camera=(id,shotId)=>({id,type:'camera',name:id,x:400,y:300,rotation:0,lens:35,fov:40,...(shotId?{shotId}:{})});
const s={...imported,objects:[{id:'floor',type:'floor',name:'Existing set',x:0,y:0,width:300,height:300,rotation:0,color:'#ccaa88'},light,camera('cam-a',imported.shotList[0].id),camera('cam-b',imported.shotList[1].id),camera('cam-c')]};
const p={version:1,projectId:'project',name:'Synthetic lighting QA',theme:'light',active:s.id,scenes:[s]};
const original=JSON.stringify(s);assert(model.validProject(p));assert.equal(JSON.parse(portable.serialize(p)).portable.version,1);assert(!s.shotLighting);
layouts.enable(s,true);assert.equal(layouts.current(s),'shared');assert.deepEqual(layouts.entries(s).map(e=>e.label),['Shot 3.2','Shot 3.10','cam-c']);
const first=layouts.entries(s)[0].key,second=layouts.entries(s)[1].key;
assert(layouts.activate(s,first));s.objects.find(o=>o.id==='lamp').x=800;s.ambient=17;layouts.flush(s);
assert(layouts.activate(s,second));assert.equal(s.objects.find(o=>o.id==='lamp').x,200);assert.equal(s.ambient,30);
s.objects=s.objects.filter(o=>o.id!=='lamp');layouts.flush(s);assert.equal(s.shotLighting.layouts.find(l=>l.key===second).objects.length,0);
layouts.activate(s,first);assert.equal(s.objects.find(o=>o.id==='lamp').x,800);assert.equal(s.ambient,17);assert.equal(s.objects.find(o=>o.id==='floor').width,300);
// Disable restores original baseline, keeps all shot edits, and permits reversible shared editing.
layouts.enable(s,false);assert.equal(s.objects.find(o=>o.id==='lamp').x,200);assert.equal(s.shotLighting.layouts.length,2);s.objects.find(o=>o.id==='lamp').power=40;
layouts.enable(s,true);layouts.activate(s,first);assert.equal(s.objects.find(o=>o.id==='lamp').power,70);assert.equal(s.objects.find(o=>o.id==='lamp').x,800);
layouts.activate(s,'camera:cam-c');assert.equal(s.objects.find(o=>o.id==='lamp').power,40);assert.equal(s.objects.find(o=>o.id==='lamp').x,200);
const beforeExport=JSON.stringify(s),rendered=layouts.shotScene(s,first);assert.match(rendered.title,/Shot 3\.2$/);assert.equal(rendered.objects.find(o=>o.id==='lamp').x,800);assert.equal(JSON.stringify(s),beforeExport);assert(!rendered.shotLighting);
const saved=portable.serialize(p);assert.equal(JSON.parse(saved).portable.version,2);assert(model.validProject(portable.parse(saved)));assert.equal(JSON.stringify(portable.parse(saved).scenes[0].shotLighting),JSON.stringify(s.shotLighting));
// Same baseline IDs intentionally repeat across layouts; independent scene copies remap every retained object/key.
const duplicate=copies.duplicateScene(p,s.id,uid);const cloneProject={...p,active:duplicate.id,scenes:[s,duplicate]};assert(model.validProject(cloneProject));
assert.notEqual(duplicate.objects.find(o=>o.type==='light').id,'lamp');assert.notEqual(duplicate.shotLighting.layouts[0].key,s.shotLighting.layouts[0].key);
const sourceState=JSON.stringify(s);duplicate.shotLighting.layouts[0].objects[0].x=-888;assert.equal(JSON.stringify(s),sourceState);assert(model.validProject(cloneProject));
const payload=copies.capture(p,s.id,['lamp'],uid);const pasted=copies.planPaste(cloneProject,duplicate.id,payload,uid);assert.equal(pasted.scene.objects.filter(o=>o.type==='light').length,2);
// Removed shots keep recoverable saved layouts; invalid hidden content cannot bypass validation.
s.shotList=s.shotList.filter(x=>'shot:'+x.id!==first);for(const c of s.objects)if(c.shotId&&!s.shotList.some(x=>x.id===c.shotId))delete c.shotId;assert(model.validProject(p));assert(s.shotLighting.layouts.some(l=>l.key===first));
for(const change of [x=>x.shotLighting.layouts[0].objects[0].power=NaN,x=>x.shotLighting.layouts[0].objects.push({...x.shotLighting.layouts[0].objects[0]}),x=>x.shotLighting.layouts[0].objects[0].type='actor',x=>x.shotLighting.active='shot:missing']){const bad=structuredClone(p);change(bad.scenes[0]);assert.equal(model.validProject(bad),false);}
let oldRejected=false;const oldSource=require('node:child_process').execFileSync('git',['show','7dc4366:dist/project-file.js'],{encoding:'utf8'}),sandbox={module:{exports:{}},require:()=>model,TextEncoder,atob,structuredClone};vm.runInNewContext(oldSource,sandbox);try{sandbox.module.exports.parse(saved);}catch(e){oldRejected=/unsupported format/.test(e.message);}assert(oldRejected,'Prior version must reject new portable metadata instead of flattening layouts');
assert.equal(JSON.parse(original).objects.length,5);
console.log('Shot lighting: opt-in legacy compatibility, natural shot order, separate edits/deletion/ambient, retained disabled baseline/variants, new camera inheritance, immutable labeled export, portable reopen, whole-scene/cross-scene copy independence, orphan retention and strict hidden-state validation passed.');
