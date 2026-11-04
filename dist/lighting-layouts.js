/* Shot lighting is opt-in. The visible map is materialized, while every other
   layout and the original shared baseline remain editable, independent copies. */
(function(root){
'use strict';
const catalog=typeof module==='object'&&module.exports?require('./catalog.js'):root.ScenicCatalog;
const copy=value=>structuredClone(value),own=o=>o?.type==='light'||!!catalog.isModifier?.(o);
const state=s=>({ambient:s.ambient,objects:copy(s.objects.filter(own))});
function entries(s){
 const rows=(s.shotList||[]).map(shot=>({key:'shot:'+shot.id,label:'Shot '+shot.number,number:shot.number}));
 rows.sort((a,b)=>String(a.number).localeCompare(String(b.number),'en',{numeric:true,sensitivity:'base'}));
 const linked=new Set((s.shotList||[]).map(s=>s.id));
 for(const camera of s.objects.filter(o=>o.type==='camera'&&!linked.has(o.shotId)))rows.push({key:'camera:'+camera.id,label:camera.name,number:camera.name});
 return rows;
}
function current(s){return s.shotLighting?.enabled?s.shotLighting.active:'shared';}
function label(s,key=current(s)){return key==='shared'?'Shared lighting':entries(s).find(e=>e.key===key)?.label||s.shotLighting?.layouts.find(e=>e.key===key)?.label||'Saved lighting';}
function flush(s){
 const data=s.shotLighting;if(!data?.enabled)return;
 const value=state(s);
 if(data.active==='shared')data.shared=value;
 else{let layout=data.layouts.find(l=>l.key===data.active);if(!layout){layout={key:data.active,label:label(s)};data.layouts.push(layout);}Object.assign(layout,value);}
}
function materialize(s,value){
 const objects=[...s.objects.filter(o=>!own(o)),...copy(value.objects)];
 if(objects.length>2000||new Set(objects.map(o=>o.id)).size!==objects.length)throw Error('This lighting layout conflicts with another item or exceeds 2,000 items.');
 s.objects=objects;s.ambient=value.ambient;
}
function enable(s,on){
 if(typeof on!=='boolean')throw Error('Choose whether shot lighting is enabled.');
 if(!!s.shotLighting?.enabled===on)return false;
 if(on){
  if(!s.shotLighting)s.shotLighting={version:1,enabled:false,active:'shared',shared:state(s),layouts:[]};
  // Edits made with shot mode off become the shared baseline, without replacing variants.
  s.shotLighting.shared=state(s);s.shotLighting.enabled=true;s.shotLighting.active='shared';
 }else{flush(s);materialize(s,s.shotLighting.shared);s.shotLighting.enabled=false;s.shotLighting.active='shared';}
 return true;
}
function activate(s,key){
 if(!s.shotLighting?.enabled||key===s.shotLighting.active)return false;
 const data=s.shotLighting;
 if(key!=='shared'&&!entries(s).some(e=>e.key===key)&&!data.layouts.some(e=>e.key===key))throw Error('That shot or camera is no longer available.');
 flush(s);let target=key==='shared'?data.shared:data.layouts.find(l=>l.key===key);
 if(!target){if(data.layouts.length>=2000)throw Error('This scene already has 2,000 saved lighting layouts.');target={key,label:label(s,key),...copy(data.shared)};}
 // Check before changing active; errors preserve the current visible layout.
 materialize(s,target);if(key!=='shared'&&!data.layouts.includes(target))data.layouts.push(target);data.active=key;return true;
}
function forCamera(s,camera){return (s.shotList||[]).some(shot=>shot.id===camera.shotId)?'shot:'+camera.shotId:'camera:'+camera.id;}
function allObjects(s){
 const d=s.shotLighting;return [...s.objects,...(d?[...d.shared.objects,...d.layouts.flatMap(l=>l.objects)]:[])];
}
function shotScene(s,key){
 const target=copy(s);flush(target);
 if(!target.shotLighting?.enabled)throw Error('Enable separate lighting per shot in Scene properties first.');
 if(key!=='shared')activate(target,key);
 else if(current(target)!=='shared')activate(target,'shared');
 const title=s.title+' · '+label(target,key);target.title=title;
 // Export snapshots need no mutable variant state.
 delete target.shotLighting;return target;
}
function validate(s,validateObjects){
 const d=s.shotLighting;if(d===undefined)return true;
 if(!d||d.version!==1||typeof d.enabled!=='boolean'||typeof d.active!=='string'||!Array.isArray(d.layouts)||d.layouts.length>2000||!d.shared)return false;
 const validKey=k=>typeof k==='string'&&/^(shot|camera):[a-zA-Z0-9_.:-]{1,200}$/.test(k);
 if(d.active!=='shared'&&!validKey(d.active)||!d.enabled&&d.active!=='shared')return false;
 const keys=new Set();
 for(const value of [d.shared,...d.layouts]){
  if(!value||!Number.isFinite(value.ambient)||value.ambient<0||value.ambient>100||!Array.isArray(value.objects)||value.objects.length>2000||!value.objects.every(own))return false;
  if(value!==d.shared){if(!validKey(value.key)||keys.has(value.key)||typeof value.label!=='string'||value.label.length>2000)return false;keys.add(value.key);}
  const composed=[...s.objects.filter(o=>!own(o)),...value.objects];
  if(!validateObjects({...s,objects:composed,ambient:value.ambient,shotLighting:undefined}))return false;
 }
 return d.active==='shared'||keys.has(d.active);
}
function cloneState(source,target,next,objectIds,shotIds){
 if(!source.shotLighting)return;
 const original=copy(source);flush(original);const d=copy(original.shotLighting);
 const ids=new Map(objectIds);
 for(const o of allObjects(original))if(!ids.has(o.id))ids.set(o.id,next());
 const remapKey=key=>key==='shared'?'shared':key.startsWith('shot:')?'shot:'+(shotIds.get(key.slice(5))||next()):'camera:'+(ids.get(key.slice(7))||next());
 const keys=new Map(d.layouts.map(l=>[l.key,remapKey(l.key)]));
 const remap=value=>{for(const o of value.objects){o.id=ids.get(o.id);if(o.marks)for(const m of o.marks)if(m.id)m.id=next();}};
 remap(d.shared);for(const layout of d.layouts){layout.key=keys.get(layout.key);remap(layout);}
 d.active=d.active==='shared'?'shared':keys.get(d.active);target.shotLighting=d;
}
const api={own,entries,current,label,flush,enable,activate,forCamera,allObjects,shotScene,validate,cloneState};
if(typeof module==='object'&&module.exports)module.exports=api;else root.ScenicLightingLayouts=api;
})(globalThis);
