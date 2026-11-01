const checks=[],check=(value,message)=>{if(!value)throw Error(message);checks.push(message);};
const numbers=['17.2','3.2','1.1','21.1','7.1','3.1','12.2','9.2','5.1','17.1','7.2','12.1','9.1','5.2','24.1','1.2','21.2'];
if(verifyOnly){
 check(doc.name==='NUMBERED SCENES NATIVE QA','Cold launch restores the synthetic production');
 const populated=doc.scenes.filter(s=>s.shotList?.length),shots=populated.flatMap(s=>s.shotList);
 check(populated.length===9&&shots.length===17,'Cold launch retains nine populated scenes and seventeen shots');
 check(populated.every(s=>s.shotList.every(shot=>shot.scene===shot.number.split('.')[0])),'Cold launch preserves numbered grouping');
 check(shots.every(s=>s.description==='Description '+s.number&&s.scriptCoverage==='Coverage '+s.number+'\nSecond line'),'Cold launch preserves descriptions and coverage metadata');
 const linked=populated.flatMap(s=>s.objects).find(o=>o.type==='camera');check(linked&&shots.find(s=>s.id===linked.shotId)?.checked===true,'Cold launch preserves camera links and coverage checks');
 check(populated.flatMap(s=>s.objects).some(o=>o.type==='floor'&&o.src?.startsWith('data:image/png;base64,')),'Cold launch preserves embedded floor image');
 check(ScenicModel.validWorkspace(workspaceData()),'Cold launch retains a valid workspace');
 return {checks,scenes:9,shots:17};
}
newProject();doc.name='NUMBERED SCENES NATIVE QA';refresh();
const baseScenes=doc.scenes.length,base=JSON.stringify(doc.scenes),production=doc.projectId;
const headers=ScenicShotList.columns.map(([heading])=>heading);
const csv=[headers,...numbers.map((number,i)=>['Day 1',String([1,2,4,8][i%4]),number,'Description '+number,'Wide','Static','A','35','Tripod','10','20','15','Ready','2','1','Essential','Notes '+number,'Coverage '+number+'\nSecond line'])].map(row=>row.map(ScenicShotList.csvCell).join(',')).join('\r\n');
async function incoming(){await window.ScenicIPad.receiveFile({name:'Synthetic-numbered-scenes.csv',type:'text/csv',base64:btoa(csv)},'shots');}
await incoming();check($('shot-import').open,'Native CSV receiver opens preview');
check(document.querySelectorAll('[data-import-scene]').length===9,'Preview shows all nine numbered scenes');
check($('shot-import-summary').textContent.includes('9 selected scenes · 17 shots'),'Preview reports seventeen shots');$('confirm-shot-import').click();
check(doc.projectId===production&&JSON.stringify(doc.scenes.slice(0,baseScenes))===base,'Import preserves current production and existing scenes');
const imported=doc.scenes.slice(baseScenes),ids=imported.flatMap(s=>s.shotList).map(s=>s.id);
check(imported.length===9&&ids.length===17,'All shots and populated scenes are imported');
check(imported.every(s=>s.shotList.every(shot=>s.title==='Scene '+shot.number.split('.')[0]&&shot.scene===shot.number.split('.')[0])),'Full dotted numbering determines scene identity');
for(const shot of imported.flatMap(s=>s.shotList))check(shot.description==='Description '+shot.number&&shot.scriptCoverage==='Coverage '+shot.number+'\nSecond line'&&shot.lens==='35'&&shot.movement==='Static','Source details retained for '+shot.number);
addObject('camera',{x:200,y:200});const linked=object();ScenicShotList.linkCamera(linked,scene().shotList[0]);scene().shotList[0].checked=true;
addObject('floor',{x:400,y:400});const floor=object(),image=document.createElement('canvas');image.width=8;image.height=8;image.getContext('2d').fillRect(0,0,8,8);floor.src=image.toDataURL();floor.width=576;floor.height=288;
await incoming();$('confirm-shot-import').click();
check(doc.scenes.length===baseScenes+9&&JSON.stringify(doc.scenes.slice(baseScenes).flatMap(s=>s.shotList).map(s=>s.id))===JSON.stringify(ids),'Reimport keeps shot IDs without duplicating scenes or shots');
check(doc.scenes.flatMap(s=>s.objects).some(o=>o.id===linked.id&&o.shotId===ids[0]),'Reimport preserves linked camera');
for(const s of doc.scenes.slice(baseScenes)){const again=ScenicShotList.importCSV(ScenicShotList.exportCSV(s),uid);check(again[0].shotList.length===s.shotList.length,'CSV export roundtrip '+s.title);}
const portable=ScenicProjectFile.parse(ScenicProjectFile.serialize(doc));check(portable.scenes.flatMap(s=>s.shotList||[]).length===17,'Portable save/reopen retains seventeen shots');
check(!document.querySelector('[id*=demo]'),'No bundled demo entry points');check(ScenicModel.validWorkspace(workspaceData()),'Valid workspace after import and reimport');await window.scenicFlush();
return {checks,scenes:9,shots:17,viewport:{width:innerWidth,height:innerHeight}};
