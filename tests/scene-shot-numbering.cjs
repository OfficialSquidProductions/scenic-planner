const assert=require('node:assert/strict'),fs=require('node:fs');
const shots=require('../dist/shot-list.js'),model=require('../dist/model.js'),portable=require('../dist/project-file.js');
let n=0;const id=()=>`numbering-${++n}`;
const csv=rows=>['Scene,Shot,Description,Script coverage',...rows.map(([scene,number])=>[scene,number,`Description ${number}`,`Coverage ${number}`].map(shots.csvCell).join(','))].join('\r\n');
// Seventeen shots, nine scene numbers, four linked screenplay scenes. Row order
// is deliberately unrelated to scene order, and scene numbers are noncontiguous.
const numbers=['17.2','3.2','1.1','21.1','7.1','3.1','12.2','9.2','5.1','17.1','7.2','12.1','9.1','5.2','24.1','1.2','21.2'];
const source=csv(numbers.map((v,i)=>[String([1,2,4,8][i%4]),v]));
const incoming=shots.importCSV(source,id);
assert.equal(incoming.length,9);assert.equal(incoming.flatMap(s=>s.shotList).length,17);
for(const scene of incoming)for(const shot of scene.shotList){
 assert.equal(shot.scene,shot.number.split('.')[0]);assert.equal(scene.title,'Scene '+shot.scene);
 assert.equal(shot.description,`Description ${shot.number}`);assert.equal(shot.scriptCoverage,`Coverage ${shot.number}`);
}
assert.deepEqual(incoming.flatMap(s=>s.shotList).map(s=>s.number).sort(),numbers.slice().sort());
const project={version:1,projectId:id(),name:'Synthetic numbering',theme:'light',active:incoming[0].id,scenes:incoming};
project.scenes[0].title='Renamed scene';project.scenes[0].shotList[0].checked=true;
const camera={id:id(),type:'camera',name:'Linked camera',x:100,y:100,rotation:0,lens:35,fov:40,shot:'Wide',notes:'',height:'Eye level'};
project.scenes[0].objects.push(camera);shots.linkCamera(camera,project.scenes[0].shotList[0]);
const ids=project.scenes.flatMap(s=>s.shotList).map(s=>s.id),objects=JSON.stringify(project.scenes[0].objects);
for(let i=0;i<3;i++){
 project.scenes=shots.mergeImport(project,shots.importCSV(source,id)).scenes;
 assert.equal(project.scenes.length,9);assert.deepEqual(project.scenes.flatMap(s=>s.shotList).map(s=>s.id),ids);
 assert.equal(project.scenes[0].shotList[0].checked,true);assert.equal(project.scenes[0].title,'Renamed scene');assert.equal(JSON.stringify(project.scenes[0].objects),objects);
}
assert(model.validProject(portable.parse(portable.serialize(project))));
for(const scene of project.scenes){const again=shots.importCSV(shots.exportCSV(scene),id);assert.equal(again.length,1);assert.deepEqual(again[0].shotList.map(s=>[s.scene,s.number,s.scriptCoverage]),scene.shotList.map(s=>[s.scene,s.number,s.scriptCoverage]));}
// Ambiguous/suffix-only/lettered forms retain explicit Scene; leading zeroes
// and alphanumeric scene numbers in full dotted identifiers remain literal.
for(const [scene,number,expected] of [['12','12A','12'],['14A','14AAA','14A'],['12','A','12'],['12','2','12'],['12','.2','12'],['12','01.3','01'],['12','14A.2','14A'],['12','3.2A','3'],['12','note.part','12'],['12','3.2.1','12']])assert.equal(shots.importCSV(csv([[scene,number]]),id)[0].shotList[0].scene,expected);
// A pre-fix import must not silently duplicate shots or move existing maps.
const legacy=structuredClone(project);legacy.scenes[0].shotList[0].scene='4';const legacyBefore=JSON.stringify(legacy);
assert.throws(()=>shots.mergeImport(legacy,shots.importCSV(source,id)),/new production/);assert.equal(JSON.stringify(legacy),legacyBefore);
assert.throws(()=>shots.importCSV(csv([['1','3.2'],['4','3.2']]),id),/repeats shot/);
assert.throws(()=>shots.importCSV(csv(Array.from({length:101},(_,i)=>['1',`${i+1}.1`])),id),/100 scenes/);
if(process.argv[2]){
 const actual=shots.importCSV(fs.readFileSync(process.argv[2],'utf8'),id),list=actual.flatMap(s=>s.shotList);
 assert.equal(list.length,17);assert.deepEqual(actual.map(s=>s.shotList[0].scene),['1','2','4','5','6','7','8','9']);
 console.log('Read-only actual CSV: all 17 shots preserved; 8 populated scene numbers (scene 3 has no shot row), previously only 4.');
}
console.log('Scene numbering passed: 17 shots / 9 scenes, noncontiguous prefixes, shuffled rows, fields, formats, duplicates, reimport with retained IDs/camera/coverage, export and portable roundtrips.');
