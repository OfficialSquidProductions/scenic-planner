const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const shots=require('../dist/shot-list.js'),model=require('../dist/model.js');
let sequence=0;const id=()=>`id-${++sequence}`;
const rows=[shots.columns.map(([heading])=>heading),
 ['Day 1','12','12A','A wide, quiet room','Wide','Static','A','35','Tripod','10','15','','Planned','0','','Essential','Hold "the pause"\nThen pan.'],
 ['Day 2','12','12B','Jamie reaction','Close-up','Handheld','B','85','Shoulder rig','5','10','17','Done','3','2','Preferred',''],
 ['Unscheduled','14A','14AA','POV','POV','Dolly','A','24–70','Dolly','20','5','','Omitted','0','','Optional','=keep original']];
const csv='\uFEFF'+rows.map(row=>row.map(shots.csvCell).join(',')).join('\r\n');
const scenes=shots.importCSV(csv,id);assert.equal(scenes.length,2);assert.deepEqual(scenes.map(s=>s.objects),[[],[]]);assert.equal(scenes[0].shotList.length,2);assert.equal(scenes[1].title,'Scene 14A');
for(let i=1;i<rows.length;i++){
 const source=rows[i],shot=scenes.flatMap(s=>s.shotList).find(s=>s.number===source[2]);
 shots.columns.forEach(([,key],index)=>assert.equal(shot[key],source[index],key));assert.equal(shot.checked,false,'Shooting status does not imply Scenic coverage');
}
const scene=scenes[0],camera={id:id(),name:'My camera',type:'camera',x:5,y:6,rotation:90,lens:50,fov:40,shot:'Medium',notes:'Map notes',height:'Eye level'};
scene.objects.push(camera);shots.linkCamera(camera,scene.shotList[0]);assert.equal(camera.lens,35);assert.equal(camera.shot,'Wide');assert.equal(camera.notes,'Map notes');assert.equal(camera.rotation,90);assert.equal(shots.linkedCameras(scene,scene.shotList[0])[0],camera);assert.deepEqual(shots.coverage(scene),{total:2,linked:1,checked:0});
scene.shotList[0].checked=true;assert.deepEqual(shots.coverage(scene),{total:2,linked:1,checked:1});assert.deepEqual(shots.coverage(scenes[1]),{total:0,linked:0,checked:0});
shots.linkCamera(camera,scene.shotList[1]);assert.equal(camera.lens,85);assert.equal(shots.linkedCameras(scene,scene.shotList[0]).length,0);shots.linkCamera(camera,null);assert.equal(camera.shotId,undefined);assert.equal(camera.lens,85);
shots.linkCamera(camera,scenes[1].shotList[0]);assert.equal(camera.lens,85,'A lens range stays in source details without corrupting the map lens');assert.equal(camera.shot,'POV');shots.linkCamera(camera,scene.shotList[0]);
const project={version:1,projectId:id(),name:'CSV coverage',active:scene.id,scenes};assert(model.validProject(project));const workspace=model.workspaceFrom(project,id());assert(model.validWorkspace(JSON.parse(JSON.stringify(workspace))));assert.equal(JSON.parse(JSON.stringify(project)).scenes[0].objects[0].shotId,scene.shotList[0].id);
const exported=shots.parseCSV(shots.exportCSV(scene));assert.equal(exported[1].at(-2),'My camera');assert.equal(exported[1].at(-1),'Yes');const roundtrip=shots.importCSV(shots.exportCSV(scene),id);assert.equal(roundtrip[0].shotList[0].notes,scene.shotList[0].notes);
for(const mutation of [p=>p.scenes[0].shotList[0].checked='yes',p=>p.scenes[0].shotList[0].lens={},p=>p.scenes[0].shotList.push(p.scenes[0].shotList[0]),p=>p.scenes[0].objects[0].shotId='missing']){const bad=structuredClone(project);mutation(bad);assert.equal(model.validProject(bad),false);}
for(const invalid of ['', 'Scene,Shot\r\n', 'Name,Lens\nA,50', 'Scene,Shot\n12,', 'Scene,Shot\n,12A', 'Scene,Shot\n12,"unfinished', 'Scene,Shot\n12,"A"tail', 'Scene,Shot\n12,A,extra', 'Scene,Scene,Shot\n12,12,A'])assert.throws(()=>shots.importCSV(invalid,id));
assert.deepEqual(shots.parseCSV('Scene,Shot\r12,A\r\r14,B'),[['Scene','Shot'],['12','A'],['14','B']]);
assert.throws(()=>shots.importCSV('Scene,Shot\n'+Array.from({length:101},(_,i)=>`${i},A`).join('\n'),id),/100 scenes/);
assert.throws(()=>shots.importCSV('Scene,Shot\n'+Array.from({length:2001},(_,i)=>`12,A${i}`).join('\n'),id),/2,000 shots/);
// Optionally exercise Production Desk's actual exporter with entirely synthetic data.
if(process.argv[2]){
 const production={id:'synthetic',_shotSettings:{startTime:'08:00'},breakdowns:[{id:'scene-12',type:'scene',scene:'12'}],_shots:[{id:'shot-A',sceneId:'scene-12',number:'A',description:rows[1][3],size:'Wide',movement:'Static',camera:'A',lens:'35',equipment:'Tripod',setupMinutes:10,shootMinutes:15,actualMinutes:null,status:'Planned',takes:0,circleTake:'',priority:'Essential',notes:rows[1][16]}]};
 let actualCSV;const context=vm.createContext({});vm.runInContext(fs.readFileSync(process.argv[2],'utf8').replace(/export function /g,'function ')+'\nglobalThis.createShotDesk=createShotDesk;',context);
 context.createShotDesk({project:()=>production,groups:()=>[['scene-12']],slug:()=>'',id,stamp:()=>'',esc:s=>s,download:(name,data)=>{actualCSV=data;}}).csv();
 const imported=shots.importCSV(actualCSV,id);assert.equal(imported[0].shotList[0].number,'12A');assert.equal(imported[0].shotList[0].lens,'35');assert.equal(imported[0].shotList[0].notes,production._shots[0].notes);console.log('Production Desk actual CSV exporter → Scenic importer passed.');
}
console.log('Shot-list import passed: exact fields, quoted/multiline CSV, blank scenes, linking/relinking/unlinking, framing/lens, omitted totals, coverage, portable storage, safe export, and malformed/oversized input.');
