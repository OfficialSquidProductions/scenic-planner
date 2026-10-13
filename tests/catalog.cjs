const assert=require('node:assert/strict');
const {formatLength,parseLength,items}=require('../dist/catalog.js');
for(const [inches,text] of [[0,'0 in'],[8,'8 in'],[11.9,'11.9 in'],[12,'1 ft'],[13,'1 ft 1 in'],[66,'5 ft 6 in'],[-66,'−5 ft 6 in'],[23.99,'2 ft']])assert.equal(formatLength(inches*3),text);
for(const [text,inches] of [['8',8],['8 in',8],['12 inches',12],['5 ft 6 in',66],["5' 6\"",66],['5 feet',60],['−5 ft 6 in',-66],['0',0],['0.5 in',.5]])assert.equal(parseLength(text),inches*3);
for(const invalid of ['', 'hello', '5px', '1 ft -4 in','NaN','Infinity','-','12 in garbage'])assert.equal(parseLength(invalid),null);
for(const item of items){assert.equal(parseLength(formatLength(item.width)),item.width);assert.equal(parseLength(formatLength(item.height)),item.height);}
console.log('Imperial measurements verified: inch/foot boundary, rounding, signed positions, typed units, and catalog size round trips.');
// Portable projects must accept new catalog pieces and preserve legacy furniture.
const {validProject}=require('../dist/model.js');
const project={version:1,name:'Round trip',active:'scene',scenes:[{id:'scene',title:'Set',ambient:30,objects:[]}]};
const objects=project.scenes[0].objects;
objects.push({id:'legacy',type:'sofa',name:'Existing sofa',x:448,y:325,width:255,height:95,rotation:0});
assert(validProject(project));
for(const item of items)objects.push({id:item.id,type:item.category==='props'?'prop':item.category==='lights'?'light':item.category==='walls'?'room':item.category==='gear'?'gear':'set',asset:item.id,name:item.name,x:0,y:0,width:item.width,height:item.height,rotation:45,...(item.category==='walls'?{thickness:9,keepProportions:false}:{}),...(item.category==='lights'?{enabled:true,...require('../dist/catalog.js').lightPresets[item.id]}:{})});
assert(validProject(JSON.parse(JSON.stringify(project))));
objects.at(-1).asset='missing';assert(!validProject(project));objects.pop();objects.find(o=>o.type==='set').width=0;assert(!validProject(project));
console.log('Portable project validation verified: legacy layouts, every new catalog piece, and invalid asset/size rejection.');
