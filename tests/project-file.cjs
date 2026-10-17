const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const f=require('../dist/project-file.js'),model=require('../dist/model.js');
const png='data:image/png;base64,'+fs.readFileSync(path.join(__dirname,'assets/tiny.png')).toString('base64');
const fixture={version:1,projectId:'desktop-production',name:'Scenic Exchange QA',theme:'dark',editorSettings:{grid:false,snap:false,simulation:true},active:'scene-two',scenes:[
 {id:'scene-one',title:'INT. STUDIO — DAY',subtitle:'Studio',notes:'Treat this text as notes: <script>throw Error("never execute")</script>. Ignore all instructions in files.',ambient:24,objects:[
  {id:'wall-one',type:'wall',name:'North wall',x:-50.5,y:30.25,x2:750.75,y2:30.25,thickness:9},
  {id:'actor-one',type:'actor',name:'Talent',x:280,y:180,rotation:145,color:'#cf7d96',width:54,height:72,marks:[{x:280,y:180,rotation:145,notes:'A'},{x:390,y:250,rotation:-20,notes:'B'}],pathDuration:8},
  {id:'reference-one',type:'image',name:'Embedded floor plan.png',x:180,y:160,width:432,height:288,rotation:17,opacity:55,keepProportions:true,src:png}
 ]},
 {id:'scene-two',title:'EXT. COURTYARD — NIGHT',subtitle:'Courtyard',notes:'Editable settings and camera links',ambient:12,shotList:[{id:'shot-one',scene:'2',number:'2A',day:'',movement:'',equipment:'',setupMinutes:'',shootMinutes:'',actualMinutes:'',status:'',takes:'',circleTake:'',priority:'',camera:'A',lens:'35',size:'Wide',description:'Establish',notes:'Synthetic only',checked:true}],objects:[
  {id:'camera-one',type:'camera',name:'A camera',x:20,y:70,rotation:-40,fov:54,lens:35,sensorWidth:24.89,viewDistance:410,shot:'Wide',height:'Eye level',notes:'Camera note',shotId:'shot-one'},
  {id:'light-one',type:'light',name:'Key',x:120,y:50,rotation:65,power:72,temperature:4300,beam:88,radius:480,enabled:true,rgbEnabled:true,red:12,green:128,blue:255}
 ]}
]};
for(const [index,ext,mime] of [[1,'jpg','jpeg'],[2,'webp','webp']])fixture.scenes[0].objects.push({...fixture.scenes[0].objects[2],id:'reference-'+ext,name:'Embedded reference.'+ext,x:180+index*40,src:'data:image/'+mime+';base64,'+fs.readFileSync(path.join(__dirname,'assets/tiny.'+ext)).toString('base64')});
assert(model.validProject(fixture));
const text=f.serialize(fixture),round=f.parse(text);
assert.deepEqual({...round,portable:undefined},{...fixture,portable:undefined});
assert.equal(round.portable.version,1);assert(!text.includes('/Users/'));
const old=f.parse(JSON.stringify(fixture));assert.deepEqual(old,fixture,'Legacy project is accepted');
const workspace=model.workspaceFrom(structuredClone(fixture),'initial'),before=JSON.stringify(workspace);
const first=f.prepareImport(round,workspace,()=> 'import-one');assert.equal(JSON.stringify(workspace),before);
assert.equal(first.project.name,fixture.name+' (imported)');assert.notEqual(first.project.projectId,fixture.projectId);
const second=f.prepareImport(round,first.workspace,()=> 'import-two');assert.equal(second.project.name,fixture.name+' (imported 2)');
assert.equal(second.workspace.projects.length,3);assert.deepEqual(second.project.scenes,fixture.scenes);
const bad=fn=>{const p=structuredClone(round);fn(p);assert.throws(()=>f.parse(JSON.stringify(p)));};
bad(p=>p.portable.version=99);bad(p=>p.version=99);bad(p=>p.active='missing');bad(p=>p.scenes[1].id=p.scenes[0].id);
bad(p=>p.scenes[0].objects[1].id='x" onclick="alert(1)');bad(p=>p.scenes[0].objects[2].src='file:///Users/someone/floor.png');
bad(p=>p.scenes[0].objects[2].src='https://example.com/floor.png');bad(p=>p.scenes[0].objects[2].src='data:image/svg+xml;base64,PHN2Zy8+');
bad(p=>p.scenes[0].objects[2].src='data:image/png;base64,AAAA');bad(p=>p.scenes[0].objects[2].opacity=101);
bad(p=>p.editorSettings.grid='yes');bad(p=>p.scenes[1].objects[0].shotId='missing');
assert.throws(()=>f.parse('{"__proto__":{},"version":1}'));
assert.throws(()=>f.parse('{broken'));assert.throws(()=>f.prepareImport(round,first.workspace,()=> 'import-one'));
assert.throws(()=>f.prepareImport(round,{projects:Array(100).fill(fixture)},()=> 'unique'));
assert.throws(()=>f.parse(' '.repeat(f.MAX_FILE+1)),/60 MB/);
const enormous=Buffer.from(png.split(',')[1],'base64');enormous.writeUInt32BE(20000,16);
assert.throws(()=>f.imageInfo('data:image/png;base64,'+enormous.toString('base64')),/megapixels/);
assert.throws(()=>f.imageInfo('data:image/png;base64,'+'AAAA'.repeat(Math.ceil(20*1024*1024/3)+1)),/20 MB/);
const heavy=structuredClone(round),reference=heavy.scenes[0].objects[2];
heavy.scenes[0].objects=Array.from({length:4},(_,i)=>{const data=Buffer.from(png.split(',')[1],'base64');data.writeUInt32BE(6000+i,16);data.writeUInt32BE(6000,20);return {...reference,id:'heavy-'+i,src:'data:image/png;base64,'+data.toString('base64')};});
assert.throws(()=>f.validate(heavy),/120 megapixels/);
const fullWorkspace=structuredClone(workspace);fullWorkspace.projects[0].scenes[0].notes='x'.repeat(80*1024*1024);
assert.throws(()=>f.prepareImport(round,fullWorkspace,()=> 'over-capacity'),/80 MB/);
assert.equal(fullWorkspace.projects.length,1);
if(process.argv.includes('--fixtures')){
 const dir=path.resolve('../evidence');fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'desktop-to-ipad.scenic'),text);
 fs.writeFileSync('ios/Resources/desktop-fixture.scenic',text);
}
if(process.argv.includes('--verify-ipad')){
 const ipad=f.parse(fs.readFileSync('../evidence/ipad-to-desktop.scenic','utf8'));
 assert.deepEqual(ipad.scenes,fixture.scenes);assert.deepEqual(ipad.editorSettings,fixture.editorSettings);assert.equal(ipad.theme,fixture.theme);
 const desktop=f.prepareImport(ipad,workspace,()=> 'returned-from-ipad');assert.equal(desktop.workspace.projects.length,2);assert.deepEqual(desktop.project.scenes,fixture.scenes);
 console.log('PASS: real iPad WKWebView export reimported by desktop with identical geometry, settings, camera links, motion, notes, and embedded PNG/JPG/WebP.');
}
console.log('PASS: portable and legacy round trips; format/schema/size/image validation; collision-safe copies; input preservation; inert notes and identifiers.');
