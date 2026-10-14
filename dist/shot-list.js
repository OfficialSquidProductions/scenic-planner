/* Production Desk CSV interchange and coverage data. No editor or DOM dependencies. */
(function(root){
'use strict';
const columns=[['Day','day'],['Scene','scene'],['Shot','number'],['Description','description'],['Size','size'],['Movement','movement'],['Camera','camera'],['Lens mm','lens'],['Equipment','equipment'],['Setup minutes','setupMinutes'],['Shoot minutes','shootMinutes'],['Actual minutes','actualMinutes'],['Status','status'],['Takes','takes'],['Circle take','circleTake'],['Priority','priority'],['Notes','notes']];
const sizes=['Wide','Medium wide','Medium','Medium close-up','Close-up','Extreme close-up','Insert','Over the shoulder','POV'];
const matchKey=value=>value.trim().toUpperCase();
function parseCSV(text){
 if(typeof text!=='string'||text.length>10*1024*1024)throw Error('Choose a shot list smaller than 10 MB.');
 text=text.replace(/^\uFEFF/,'');
 const rows=[];let row=[],value='',quoted=false,closed=false;
 const field=()=>{row.push(value);value='';closed=false;};
 const line=()=>{field();if(row.some(v=>v.trim()))rows.push(row);row=[];if(rows.length>10001)throw Error('A shot list can contain up to 10,000 shots.');};
 for(let i=0;i<text.length;i++){
  const c=text[i];
  if(quoted){if(c==='"'){if(text[i+1]==='"'){value+='"';i++;}else{quoted=false;closed=true;}}else value+=c;}
  else if(c===',')field();
  else if(c==='\r'||c==='\n'){if(c==='\r'&&text[i+1]==='\n')i++;line();}
  else if(c==='"'&&!value&&!closed)quoted=true;
  else{if(closed||c==='"')throw Error('The CSV has an invalid quoted field. Export the shot list again from Production Desk.');value+=c;}
  if(value.length>20000||row.length>100)throw Error('The CSV contains an oversized field or too many columns.');
 }
 if(quoted)throw Error('The CSV has an unfinished quoted field. Export the shot list again from Production Desk.');
 if(value||row.length||closed)line();
 return rows;
}
function importCSV(text,id){
 const rows=parseCSV(text);if(rows.length<2)throw Error('This CSV contains no shots. Export shots from Production Desk first.');
 const headers=rows.shift().map(v=>v.trim().toLowerCase());
 if(!headers.includes('scene')||!headers.includes('shot'))throw Error('Choose a Production Desk shot-list CSV with Scene and Shot columns.');
 if(new Set(headers).size!==headers.length)throw Error('The CSV contains duplicate column headings.');
 const groups=new Map();
 rows.forEach((row,i)=>{
  if(row.length!==headers.length)throw Error(`Row ${i+2} has the wrong number of columns.`);
  const shot={id:id(),checked:false};
  for(const [heading,key] of columns){const index=headers.indexOf(heading.toLowerCase());shot[key]=index<0?'':row[index].replace(/^'(?=[=+@\-\t\r])/,'');}
  shot.scene=shot.scene.trim();shot.number=shot.number.trim();
  if(!shot.scene||!shot.number)throw Error(`Row ${i+2} needs a scene and a shot number.`);
  const key=matchKey(shot.scene);
  if(!groups.has(key))groups.set(key,[]);
  if(groups.get(key).some(s=>matchKey(s.number)===matchKey(shot.number)))throw Error(`Scene ${shot.scene} repeats shot ${shot.number}. Use unique shot numbers in Production Desk before importing.`);
  groups.get(key).push(shot);
  if(groups.size>100||groups.get(key).length>2000)throw Error('Import up to 100 scenes with up to 2,000 shots per scene.');
 });
 return [...groups.values()].map(shotList=>({id:id(),title:'Scene '+shotList[0].scene,subtitle:'Scene '+shotList[0].scene,notes:'',ambient:30,objects:[],shotList}));
}
// Scene identity comes from the imported number, so renaming a Scenic scene is safe.
function sceneKey(scene){const keys=new Set((scene.shotList||[]).map(s=>matchKey(s.scene)));return keys.size===1?[...keys][0]:null;}
function planImport(project,incoming,selectedIds=incoming.map(s=>s.id),targets={}){
 const selected=new Set(selectedIds),entries=[],errors=[];
 let newScenes=0,updatedScenes=0,newShots=0,updatedShots=0,retainedShots=0;
 for(const source of incoming){
  const matches=project.scenes.filter(s=>sceneKey(s)===sceneKey(source)),target=targets[source.id]?matches.find(s=>s.id===targets[source.id]):matches.length===1?matches[0]:null;
  const entry={source,matches,target,selected:selected.has(source.id),added:0,updated:0,retained:0};entries.push(entry);
  if(!entry.selected)continue;
  if(matches.length&&!target){errors.push(`Choose an existing scene to update for ${source.title}.`);continue;}
  if(target){
   const existing=target.shotList||[],keys=new Set(existing.map(s=>matchKey(s.number))),sourceKeys=new Set(source.shotList.map(s=>matchKey(s.number)));
   if(keys.size!==existing.length){errors.push(`${target.title} has repeated shot numbers. Give its shots unique numbers before reimporting.`);continue;}
   entry.updated=source.shotList.filter(s=>keys.has(matchKey(s.number))).length;entry.added=source.shotList.length-entry.updated;entry.retained=existing.filter(s=>!sourceKeys.has(matchKey(s.number))).length;
   if(existing.length+entry.added>2000)errors.push(`${target.title} would exceed 2,000 shots. Deselect it to import the other scenes.`);
   updatedScenes++;
  }else{entry.added=source.shotList.length;newScenes++;}
  newShots+=entry.added;updatedShots+=entry.updated;retainedShots+=entry.retained;
 }
 const selectedEntries=entries.filter(e=>e.selected),targetIds=selectedEntries.filter(e=>e.target).map(e=>e.target.id);
 if(new Set(targetIds).size!==targetIds.length)errors.push('Two imported scenes cannot update the same Scenic scene.');
 if(project.scenes.length+newScenes>100)errors.push('This selection would exceed 100 scenes. Deselect new scenes or create a new production.');
 return {entries,errors,selectedCount:selectedEntries.length,newScenes,updatedScenes,newShots,updatedShots,retainedShots};
}
function mergeImport(project,incoming,selectedIds,targets){
 const plan=planImport(project,incoming,selectedIds,targets);
 if(!plan.selectedCount)throw Error('Select at least one scene to import.');
 if(plan.errors.length)throw Error(plan.errors[0]);
 const scenes=project.scenes.slice();let active;
 for(const entry of plan.entries.filter(e=>e.selected)){
  const {source,target}=entry;
  if(!target){const added=structuredClone(source);scenes.push(added);active=active||added.id;continue;}
  const existingByNumber=new Map(target.shotList.map(s=>[matchKey(s.number),s]));
  const shotList=source.shotList.map(updated=>{
   const existing=existingByNumber.get(matchKey(updated.number));
   if(!existing)return structuredClone(updated);
   existingByNumber.delete(matchKey(updated.number));
   return {...existing,...updated,id:existing.id,checked:existing.checked};
  });
  shotList.push(...[...existingByNumber.values()].map(s=>({...s})));
  scenes[scenes.indexOf(target)]={...target,shotList};active=active||target.id;
 }
 return {scenes,active,plan};
}
function validList(list){
 return Array.isArray(list)&&list.length<=2000&&new Set(list.map(s=>s?.id)).size===list.length&&list.every(s=>s&&typeof s.id==='string'&&s.id.length>0&&typeof s.checked==='boolean'&&columns.every(([,key])=>typeof s[key]==='string'&&s[key].length<=20000)&&s.scene.trim()&&s.number.trim());
}
function linkedCameras(scene,shot){return scene.objects.filter(o=>o.type==='camera'&&o.shotId===shot.id);}
function coverage(scene){const shots=(scene.shotList||[]).filter(s=>s.status.toLowerCase()!=='omitted');return {total:shots.length,linked:shots.filter(s=>linkedCameras(scene,s).length).length,checked:shots.filter(s=>s.checked).length};}
function linkCamera(camera,shot){
 if(!shot){delete camera.shotId;return;}
 camera.shotId=shot.id;
 const lens=Number(shot.lens.trim().replace(/\s*mm$/i,''));if(lens>=8&&lens<=600)camera.lens=lens;
 const size=sizes.find(s=>s.toLowerCase()===shot.size.toLowerCase());if(size)camera.shot=size;
}
function csvCell(value){let v=String(value??'');if(/^[=+@\-\t\r]/.test(v))v="'"+v;return '"'+v.replace(/"/g,'""')+'"';}
function exportCSV(scene){return [columns.map(([label])=>label).concat(['Scenic cameras','Coverage checked']),...(scene.shotList||[]).map(s=>columns.map(([,key])=>s[key]).concat([linkedCameras(scene,s).map(c=>c.name).join('; '),s.checked?'Yes':'No']))].map(row=>row.map(csvCell).join(',')).join('\r\n');}
const api={columns,sizes,parseCSV,importCSV,planImport,mergeImport,validList,linkedCameras,coverage,linkCamera,csvCell,exportCSV};
if(typeof module==='object'&&module.exports)module.exports=api;else root.ScenicShotList=api;
})(globalThis);
