// Run with the native RendererCheck harness and synthetic in-memory storage.
const checks=[],assert=(ok,message)=>{if(!ok)throw Error(message);checks.push(message);};
const importedButton=$('import-shot-list'),exportButton=$('export-shots'),input=$('shot-list-input');
function toolbar(){
 assert(document.querySelectorAll('#import-shot-list').length===1&&document.querySelectorAll('#export-shots').length===1,'One import and one export action');
 assert(importedButton.closest('#shot-list')&&exportButton.parentElement===importedButton.parentElement,'Import and export are paired in Shot List');
 assert(!document.querySelector('.production-picker #import-shot-list'),'Old Productions import action removed');
 assert(exportButton.textContent==='Export Shot List CSV','Exact export label preserved');
 assert(importedButton.getAttribute('aria-label')==='Import shot list CSV','Import accessible label preserved');
 assert($('import-shot-list')===importedButton&&$('export-shots')===exportButton,'Actions survive content rendering');
}
function reachable(){
 $('shot-list').scrollTop=0;
 for(const node of [importedButton,exportButton]){
  const r=node.getBoundingClientRect(),at=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
  assert(r.width>=44&&r.height>=44&&r.x>=0&&r.right<=innerWidth+1&&r.y>=0&&r.bottom<=innerHeight+1,'Toolbar target fits viewport: '+node.id);
  assert(at===node||node.contains(at),'Toolbar action receives pointer input: '+node.id);
 }
}
const exports=[],originalDownload=download;
download=(blob,name)=>exports.push({blob,name});
showShots(true);toolbar();await new Promise(r=>setTimeout(r,100));reachable();
const expected=scene().objects.filter(o=>o.type==='camera');
exportButton.click();assert(exports.length===1&&exports[0].name==='scenic-shot-list.csv','Camera-only export handler remains connected');
const cameraCSV=ScenicShotList.parseCSV(await exports[0].blob.text());
assert(cameraCSV.length===expected.length+1&&cameraCSV[0].join('|')==='Setup|Name|Shot size|Lens (mm)|Height|Notes','Camera-only CSV schema and setup count preserved');
for(let i=0;i<expected.length;i++)assert(cameraCSV[i+1][1]===expected[i].name&&cameraCSV[i+1][3]===String(expected[i].lens),'Camera CSV values preserved: '+i);
const originalScenes=JSON.stringify(doc.scenes),oldCount=doc.scenes.length;
let opens=0;const originalClick=input.click;input.click=()=>opens++;
importedButton.click();assert(opens===1,'Moved import opens the existing file-input route once');input.click=originalClick;
const csv='Scene,Shot,Description,Camera,Lens mm,Notes\r\nTOOLBAR-QA,1A,"A toolbar import, with comma",A,35,Local synthetic check';
await input.onchange({target:{files:[new File([csv],'toolbar-qa.csv',{type:'text/csv'})],value:''}});
assert($('shot-import').open&&!$('confirm-shot-import').disabled,'CSV input still parses and opens import preview');
$('confirm-shot-import').click();
assert(doc.scenes.length===oldCount+1&&JSON.stringify(doc.scenes.slice(0,oldCount))===originalScenes,'Confirm import adds a scene and preserves existing scenes');
assert(scene().shotList?.[0].description==='A toolbar import, with comma','Imported shot content preserved');
showShots(true);toolbar();await new Promise(r=>setTimeout(r,100));reachable();
exportButton.click();assert(exports.length===2,'Imported-shot export handler remains connected');
const text=await exports[1].blob.text(),parsed=ScenicShotList.importCSV(text,uid);
assert(text===ScenicShotList.exportCSV(scene())&&parsed[0].shotList[0].notes==='Local synthetic check','Imported CSV export and round trip preserve exact data');
refresh();toolbar();importedButton.focus();assert(document.activeElement===importedButton,'Import remains keyboard focusable after refresh');
exportButton.focus();assert(document.activeElement===exportButton,'Export remains keyboard focusable after refresh');
download=originalDownload;
return {passed:true,platform:window.SquidPlatform,viewport:{width:innerWidth,height:innerHeight},checks};
