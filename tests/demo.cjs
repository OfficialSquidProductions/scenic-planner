const assert=require('node:assert/strict');
const demo=require('./fixtures/legacy-demo.js'),file=require('../dist/project-file.js'),model=require('../dist/model.js'),shots=require('../dist/shot-list.js');
const project=demo.project();file.validate(project);assert(model.validProject(project));
assert.equal(project.scenes.length,8);assert.equal(project.name,'DEMO · The Last Light');
assert.equal(project.scenes.flatMap(s=>s.shotList).length,16);
assert(project.scenes[0].notes.includes('We should have left yesterday.'));
assert(project.scenes[3].notes.includes('One hundred and twelve steps.'));
assert(project.scenes[7].notes.includes('Now I am.'));
for(const scene of project.scenes){
 assert.match(scene.notes,/FICTIONAL DEMO/);assert.equal(shots.coverage(scene).linked,2);
 const floor=scene.objects.find(o=>o.type==='room');
 for(const camera of scene.objects.filter(o=>o.type==='camera')){if(floor?.id.endsWith('-floor'))assert(Math.abs(camera.x-floor.x)<floor.width/2&&Math.abs(camera.y-floor.y)<floor.height/2);assert.equal(camera.lens,Number(scene.shotList.find(s=>s.id===camera.shotId).lens));}
}
const personal={...demo.project(),projectId:'personal',name:'Personal work'};delete personal.demoKey;
const old={...demo.project(),projectId:'legacy',demoKey:'scenic-the-last-cue-v1',name:'DEMO · The Last Cue'};
const workspace={version:2,activeProject:personal.projectId,projects:[personal,old],extension:{keep:true}};
const before=structuredClone(workspace);let seq=0;const id=()=>`copy-${++seq}`;
const first=demo.plan(workspace,id);assert.deepEqual(workspace,before);assert.equal(first.workspace.projects.length,3);assert.deepEqual(first.workspace.projects.slice(0,2),before.projects);
const owned=demo.managed(first.workspace);owned.name='My edited demo';owned.scenes[0].notes='Preserve this edit';
const repeat=demo.plan(first.workspace,id);assert.equal(repeat.workspace.projects.length,3);assert.equal(demo.managed(repeat.workspace).scenes[0].notes,'Preserve this edit');
const imported=file.prepareImport(file.parse(file.serialize(owned)),repeat.workspace,id);assert.equal(demo.managed(imported.workspace).projectId,owned.projectId);assert.throws(()=>demo.plan(imported.workspace,id,imported.project.projectId),/Only the demo created here/);
const reset=demo.plan(imported.workspace,id,owned.projectId);assert.equal(reset.workspace.projects.length,4);assert.deepEqual(reset.workspace.projects.find(p=>p.projectId===imported.project.projectId),imported.project);assert.match(demo.managed(reset.workspace).scenes[0].notes,/FICTIONAL DEMO/);
const stale={...reset.workspace,_demoProjects:{[demo.key]:'deleted'}};const fresh=demo.plan(stale,id);assert.equal(fresh.workspace.projects.length,5);assert.equal(demo.managed(fresh.workspace).projectId,'copy-'+seq);
assert.notEqual(demo.project().scenes[0].objects,project.scenes[0].objects);
console.log('PASS: eight original scenes,16 linked shots, portable roundtrip; legacy/real/imported projects preserved; repeat, reset ownership and stale registry safe.');

for(const name of ['app.js','workflow.js','index.html'])assert(!require('node:fs').readFileSync('dist/'+name,'utf8').match(/ScenicDemo|loadDemoProduction|load-demo|demo-guide|demo-reset/),name+' ships demo entry points');
assert(!require('node:fs').existsSync('dist/demo.js'));
