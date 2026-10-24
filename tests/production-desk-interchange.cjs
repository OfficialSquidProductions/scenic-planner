/* Audit the genuine Production Desk Shot list exporter with synthetic data.
   node tests/production-desk-interchange.cjs /path/to/ProductionDesk/web/shots.js
   Without that path, replay the checked-in genuine export fixture in CI. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const shots=require('../dist/shot-list.js'),model=require('../dist/model.js'),portable=require('../dist/project-file.js');
const fixture=path.join(__dirname,'fixtures/production-desk-shot-list.csv');let sequence=0;const uid=()=>`interchange-${++sequence}`;
async function main(){
 let csv;
 if(process.argv[2]){
  const source=path.resolve(process.argv[2]);
  global.document={createElement:()=>({setAttribute(){},append(){}}),body:{append(){}},addEventListener(){}};global.window={addEventListener(){}};
  const {createShotDesk}=await import(require('node:url').pathToFileURL(source));
  const scenes=[['s12','12'],['s14a','14A'],['s01','01']].map(([id,scene])=>({id,scene,type:'scene'}));
  const item=(id,sceneId,number,extra={})=>({id,sceneId,number,description:'Wide, quiet "room"\nThen turn — café',size:'Medium close-up',movement:'Tracking',camera:'B',lens:'85',equipment:'Dolly, tripod',setupMinutes:12,shootMinutes:25,actualMinutes:17,status:'Done',takes:4,circleTake:'3',priority:'Essential',notes:'=preserve formula-like text\nQuoted "notes"',...extra});
  const project={id:'synthetic-production',_shotSettings:{startTime:'08:00'},breakdowns:scenes,_shots:[item('shot-a','s12','A'),item('shot-b','s12','2',{status:'Omitted',lens:'24–70',actualMinutes:null}),item('shot-c','s14a','AA',{status:'Planned',notes:'Unscheduled; preserve Unicode ✓'}),item('shot-d','s01','01.3',{status:'Ready',description:'Insert of road, carpet and floor'})],_linedScript:{documents:[{filename:'Rich "Plan".pdf',marks:[{type:'coverage',shotId:'shot-a',page:0,endPage:2,style:'wavy',note:'Off camera, pause\nSecond line'},{type:'coverage',shotId:'shot-a',page:3,endPage:3,style:'straight',note:'Close "reaction"'}]}]}};
  let filename;
  createShotDesk({project:()=>project,groups:()=>[['s12'],['s01']],slug:b=>b.scene,id:uid,stamp:()=>'',esc:s=>s,download:(name,text,type)=>{filename=name;csv=text;assert.match(type,/text\/csv/);}}).csv();
  assert.equal(filename,'shot-list.csv');assert(csv.includes('Script coverage'));fs.writeFileSync(fixture,csv);
  fs.writeFileSync(path.join(__dirname,'fixtures/production-desk-shot-list-provenance.json'),JSON.stringify({source:'Production Desk web/shots.js actual createShotDesk().csv()',sourceSHA256:crypto.createHash('sha256').update(fs.readFileSync(source)).digest('hex'),export:'Shot list → Export shots; all filters',synthetic:true,expectedShotNumbers:['12A','12.2','14AAA','01.3'],fields:18},null,2)+'\n');
 }else csv=fs.readFileSync(fixture,'utf8');
 const incoming=shots.importCSV(csv,uid),all=incoming.flatMap(s=>s.shotList);
 assert.equal(incoming.length,3);assert.deepEqual(all.map(s=>s.number),['12A','12.2','14AAA','01.3']);assert.deepEqual(incoming.map(s=>s.shotList[0].scene),['12','14A','01']);
 const parsed=shots.parseCSV(csv),headings=parsed.shift();
 for(const row of parsed){const entry=all.find(s=>s.number===row[headings.indexOf('Shot')]);for(const [heading,key] of shots.columns){const value=row[headings.indexOf(heading)].replace(/^'(?=[=+@\-\t\r])/,'');assert.equal(entry[key],value,heading);}}
 assert.match(all[0].scriptCoverage,/Rich "Plan"\.pdf/);assert.match(all[0].scriptCoverage,/pp\. 1–3/);assert.match(all[0].scriptCoverage,/Off camera, pause\nSecond line/);assert.equal(all[1].lens,'24–70');assert.equal(all[1].actualMinutes,'');assert.equal(all[1].status,'Omitted');assert.equal(all[0].day,'Day 1');assert.equal(all[2].day,'Unscheduled');assert.equal(all[3].day,'Day 2');
 const project={version:1,projectId:uid(),name:'Rich interchange fixture',theme:'light',active:incoming[0].id,scenes:incoming};
 const first=project.scenes[0],camera={id:uid(),type:'camera',name:'Existing mapped camera',x:125,y:240,rotation:90,lens:50,fov:40,shot:'Wide',notes:'Keep map notes',height:'Eye level'};
 const png='data:image/png;base64,'+fs.readFileSync(path.join(__dirname,'assets/tiny.png')).toString('base64');first.objects=[{id:uid(),type:'floor',name:'Existing carpet',x:100,y:200,width:648,height:216,rotation:30,color:'#b7aa96',src:png},camera];shots.linkCamera(camera,first.shotList[0]);first.shotList[0].checked=true;
 const geometry=JSON.stringify(first.objects),ids=all.map(s=>s.id),initialCount=project.scenes.length;
 for(let n=0;n<3;n++){const again=shots.importCSV('\uFEFF'+csv,uid),merged=shots.mergeImport(project,again);project.scenes=merged.scenes;assert.equal(project.scenes.length,initialCount);assert.deepEqual(project.scenes.flatMap(s=>s.shotList).map(s=>s.id),ids);assert.equal(JSON.stringify(project.scenes[0].objects),geometry);assert.equal(project.scenes[0].shotList[0].checked,true);}
 const updateRows=shots.parseCSV(csv);updateRows[1][headings.indexOf('Description')]='Updated description';updateRows[1][headings.indexOf('Script coverage')]='Updated coverage metadata';updateRows.splice(2,1);
 const updates=shots.importCSV(updateRows.map(row=>row.map(shots.csvCell).join(',')).join('\r\n'),uid),selection=[updates[0].id],otherBefore=JSON.stringify(project.scenes.slice(1));project.scenes=shots.mergeImport(project,updates,selection).scenes;
 assert.equal(project.scenes[0].shotList.length,2,'Filtered-out shots remain');assert.equal(project.scenes[0].shotList[0].description,'Updated description');assert.equal(project.scenes[0].shotList[0].scriptCoverage,'Updated coverage metadata');assert.equal(JSON.stringify(project.scenes[0].objects),geometry);assert.equal(JSON.stringify(project.scenes.slice(1)),otherBefore);
 const saved=portable.serialize(project),reopened=portable.parse(saved);assert(model.validProject(reopened));assert.equal(reopened.scenes[0].objects[0].src,png);assert.equal(reopened.scenes[0].shotList[0].scriptCoverage,'Updated coverage metadata');assert.equal(reopened.scenes[0].objects[1].shotId,ids[0]);
 const legacy=structuredClone(project);legacy.scenes.forEach(s=>s.shotList.forEach(shot=>delete shot.scriptCoverage));assert(model.validProject(legacy),'Older projects without the optional coverage field remain valid');
 const before=JSON.stringify(project);
 for(const bad of ['', 'Scene,Shot\n12,"unfinished', 'Scene,Shot\n12,A,extra','Scene,Scene,Shot\n12,12,A','Scene,Shot\n12,A\n12,a','Scene\tShot\n12\tA','Scene,Description\n12,breakdown export','PK\\x03\\x04fake-xlsx'])assert.throws(()=>shots.importCSV(bad,uid));
 assert.equal(JSON.stringify(project),before,'Invalid CSV never mutates the existing production');
 for(const newline of ['\n','\r','\r\n'])assert.equal(shots.importCSV('Scene,Shot,Description'+newline+'12,12A,"line one\nline two"',uid)[0].shotList[0].description,'line one\nline two');
 const exported=shots.exportCSV(project.scenes[0]);assert.match(exported,/Script coverage/);assert.equal(shots.importCSV(exported,uid)[0].shotList[0].scriptCoverage,'Updated coverage metadata');
 console.log('Production Desk genuine-export interchange passed: all18 source fields, scene/shot identifiers, numeric suffixes, metadata/coverage, quoting/BOM/newlines, selected and repeated deduplicated imports, retained absent shots, linked camera and floor preservation, invalid formats/input, portable save/reopen.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
