/* Wall selection and group editing. Walls retain their IDs and openings. */
function selectionItems(){
 const ids=selectedIds.has(selected)||wallMultiSelect?selectedIds:new Set(selected?[selected]:[]);
 return scene().objects.filter(o=>ids.has(o.id)&&!ScenicModel.wallGroupFor(scene().objects,o.id));
}
function wallSelection(){return selectionItems().filter(o=>o.type==='wall');}
function selectionHandleTarget(){return wallMultiSelect||selectionItems().length>1?null:object();}
function refreshWallSelection(){stopPlayback();updateCanvasHint();renderInspector();renderLayers();showInspectorTab('properties');invalidate();}
function setSelection(ids){selectedIds=new Set(ids);selected=[...selectedIds].at(-1)||null;}
function toggleSelection(id){
 const target=scene().objects.find(o=>o.id===id);if(!target||target.locked)return;
 id=ScenicModel.wallGroupFor(scene().objects,id)?.id||id;selectedIds=new Set(selectionItems().map(o=>o.id));
 if(selectedIds.has(id))selectedIds.delete(id);else selectedIds.add(id);
 selected=[...selectedIds].at(-1)||null;refreshWallSelection();
}
function toggleWallSelection(id){const wall=scene().objects.find(o=>o.id===id&&o.type==='wall');if(wall&&!ScenicModel.wallGroupFor(scene().objects,id))toggleSelection(id);}
function beginMarquee(point,event){drag={mode:'marquee',start:point,end:point,moved:false,add:!!event.shiftKey,selectionBefore:selectionItems().map(o=>o.id),wallModeBefore:wallMultiSelect};canvas.style.cursor='crosshair';}
function updateMarquee(point){
 drag.end=point;if(!drag.moved&&Math.hypot(point.x-drag.start.x,point.y-drag.start.y)*view.z<4)return;
 drag.moved=true;let ids=ScenicSelection.inBox(scene().objects,drag.start,point);
 if(drag.wallModeBefore)ids=ids.filter(id=>scene().objects.some(o=>o.id===id&&o.type==='wall'));
 setSelection([...new Set([...(drag.add?drag.selectionBefore:[]),...ids])]);invalidate();
}
function finishMarquee(){
 if(drag.moved)refreshWallSelection();
 else {const picked=hit(drag.start);if(drag.add&&picked)toggleSelection(picked.id);else if(drag.add){setSelection(drag.selectionBefore);refreshWallSelection();}else choose(picked?.id||null);}
 if(tool==='marquee')setTool('select');
}
function beginWallSelection(){if(object()?.type==='wall')selectedIds.add(selected);wallMultiSelect=!wallMultiSelect;setTool('select');refreshWallSelection();}
function groupSelectedWalls(){
 const result=ScenicModel.groupWalls(scene().objects,wallSelection().map(w=>w.id),uid());
 if(!result){toast('Select at least two ungrouped walls within the scene’s size and item limits.');return;}
 snapshot();scene().objects=result.objects;choose(result.group.id);commit();toast(`${result.group.wallIds.length} walls grouped · Undo to restore`);
}
function ungroupSelectedWalls(){
 const group=object();if(group?.type!=='wallGroup')return;
 snapshot();scene().objects=scene().objects.filter(o=>o.id!==group.id);selectedIds=new Set(group.wallIds);selected=group.wallIds[0];wallMultiSelect=false;commit();toast('Walls ungrouped · Undo to restore');
}
function renderWallSelectionInspector(){
 const items=selectionItems(),walls=wallSelection(),allWalls=items.length>0&&items.length===walls.length;if(items.length<2&&!wallMultiSelect)return false;
 $('selection-type').textContent=allWalls||wallMultiSelect?'WALLS':'SELECTION';
 $('inspector-content').innerHTML=`<div class="selected-head"><span class="selected-symbol">${svg('select')}</span><div><h3>${items.length} ${allWalls||wallMultiSelect?'walls':'items'} selected</h3><p>${allWalls||wallMultiSelect?'WALL':'MULTIPLE ITEM'} SELECTION</p></div></div><p class="empty-hint">${wallMultiSelect?'Click walls on the map or in Scene layers to add or remove them.':'Drag empty map space to box-select items. Shift adds to the selection; Shift-click adds or removes an item.'} Drag a selected item to move the selection together.</p>${allWalls?`<div class="property-actions"><button id="group-walls" ${walls.length<2?'disabled':''}>Group selected walls</button></div>`:''}<div class="property-actions">${wallMultiSelect?'<button id="done-wall-selection">Done selecting</button>':''}<button id="clear-wall-selection">Clear selection</button><button id="delete-selection" class="danger">Delete selected</button></div>`;
 if(allWalls)$('group-walls').onclick=groupSelectedWalls;$('clear-wall-selection').onclick=()=>choose(null);$('delete-selection').onclick=removeObject;if(wallMultiSelect)$('done-wall-selection').onclick=()=>{wallMultiSelect=false;refreshWallSelection();};return true;
}
function wallDragAttachments(o){const ids=o.type==='wallGroup'?o.wallIds:['wall','room'].includes(o.type)?[o.id]:[];return scene().objects.filter(item=>ids.includes(item.wallId)).map(item=>structuredClone(item));}
function wallDragSource(o){return o.type==='wallGroup'?scene().objects.filter(item=>item.id===o.id||o.wallIds.includes(item.id)).map(item=>structuredClone(item)):null;}
function applyWallGroupPose(group,pose,source){
 const result=ScenicModel.transformWallGroup(scene().objects,group.id,pose,source||scene().objects);if(!result)return false;
 scene().objects=result;ScenicModel.syncOpenings(scene().objects);return true;
}
function updateWallGroupProperty(group,previous){
 if(group.keepProportions){if(group.width!==previous.width)group.height=group.width*previous.height/previous.width;else if(group.height!==previous.height)group.width=group.height*previous.width/previous.height;}
 const source=scene().objects.map(o=>o.id===group.id?previous:o);
 if(!applyWallGroupPose(group,group,source)){Object.assign(group,previous);toast('The group must stay within the scene’s size limits.');}
 updateTransformReadout(object());
}
function duplicateWallGroup(){
 const group=object();if(group?.type!=='wallGroup')return false;
 if(scene().objects.length+group.wallIds.length+1>2000){toast('The scene has reached its item limit.');return true;}
 snapshot();const ids=new Map(group.wallIds.map(id=>[id,uid()]));
 const walls=scene().objects.filter(o=>ids.has(o.id)).map(o=>({...o,id:ids.get(o.id),name:o.name+' copy',x:o.x+30,y:o.y+30,x2:o.x2+30,y2:o.y2+30}));
 const copy={...group,id:uid(),name:group.name+' copy',x:group.x+30,y:group.y+30,wallIds:group.wallIds.map(id=>ids.get(id))};
 scene().objects.push(...walls,copy);choose(copy.id);commit();return true;
}
function deleteWallSelection(){
 const items=selectionItems(),group=object();if(items.length<2&&group?.type!=='wallGroup')return false;
 const ids=new Set(items.flatMap(o=>o.type==='wallGroup'?[o.id,...o.wallIds]:[o.id]));
 snapshot();scene().objects=scene().objects.filter(o=>!ids.has(o.id));choose(null);commit();return true;
}
function duplicateMultiSelection(){
 const items=selectionItems();if(items.length<2)return false;
 if(items.some(o=>o.kind==='sun')){toast('Only one sun is allowed per scene');return true;}
 const ids=new Map(items.flatMap(o=>o.type==='wallGroup'?[o.id,...o.wallIds]:[o.id]).map(id=>[id,uid()]));
 if(scene().objects.length+ids.size>2000){toast('The scene has reached its item limit.');return true;}
 snapshot();const copies=scene().objects.filter(o=>ids.has(o.id)).map(o=>{const copy=structuredClone(o);copy.id=ids.get(o.id);copy.name+=' copy';copy.x+=30;copy.y+=30;if(copy.type==='wall'){copy.x2+=30;copy.y2+=30;}if(copy.wallId){if(ids.has(copy.wallId)){copy.wallId=ids.get(copy.wallId);if(copy.wallIds)copy.wallIds=copy.wallIds.filter(id=>ids.has(id)).map(id=>ids.get(id));}else{delete copy.wallId;delete copy.wallT;delete copy.wallIds;}}else if(copy.type==='wallGroup')copy.wallIds=copy.wallIds.map(id=>ids.get(id));if(copy.marks)copy.marks.forEach(m=>{m.x+=30;m.y+=30;});return copy;});
 scene().objects.push(...copies);setSelection(items.map(o=>ids.get(o.id)));commit();return true;
}
function nudgeSelection(dx,dy){
 const items=selectionItems(),o=object();if(!o||items.length===1&&o.locked)return;snapshot();
 if(items.length>1){const result=ScenicModel.translateSelection(scene().objects,items.map(o=>o.id),dx,dy);if(result)scene().objects=result;}
 else if(o.type==='wallGroup')applyWallGroupPose(o,{x:o.x+dx,y:o.y+dy});
 else {o.x+=dx;o.y+=dy;if(o.type==='wall'){o.x2+=dx;o.y2+=dy;}}
 commit();
}
