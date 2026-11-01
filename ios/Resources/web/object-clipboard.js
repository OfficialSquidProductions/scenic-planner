/* Shared editor actions. Native hosts use the same copy/paste path as DOM events. */
const objectPasteCounts=new Map();
function objectClipboardFocusBlocked(target=document.activeElement){
 return !!(shotView||drag||document.querySelector('dialog[open]')||target?.isContentEditable||target?.closest?.('input,textarea,select,[contenteditable]:not([contenteditable="false"]),[role="textbox"]'));
}
function copySceneSelection(){
 if(objectClipboardFocusBlocked()||document.getSelection?.()?.toString())return null;
 const payload=ScenicObjectCopies.capture(doc,doc.active,selectionItems().map(o=>o.id),uid);
 if(!payload)return null;
 const text=ScenicObjectCopies.encode(payload);objectPasteCounts.clear();toast(`${payload.selection.length} ${payload.selection.length===1?'item':'items'} copied`);return text;
}
function pasteSceneSelection(text){
 if(objectClipboardFocusBlocked()||!ScenicObjectCopies.supported(text))return false;
 try{
  const payload=ScenicObjectCopies.decode(text),key=payload.token+':'+doc.projectId+':'+doc.active;
  const count=objectPasteCounts.get(key)||0,sameScene=payload.sourceProjectId===doc.projectId&&payload.sourceSceneId===doc.active;
  const plan=ScenicObjectCopies.planPaste(doc,doc.active,payload,uid,30*(count+Number(sameScene)));
  const candidate={...doc,editorSettings:{grid,snap,simulation},scenes:doc.scenes.map(s=>s.id===doc.active?plan.scene:s)};
  if(new TextEncoder().encode(JSON.stringify({...workspace,activeProject:doc.projectId,projects:workspace.projects.map(p=>p.projectId===doc.projectId?candidate:p)})).length>ScenicProjectFile.MAX_WORKSPACE)throw Error('This paste would exceed the workspace size limit.');
  snapshot();doc.scenes=doc.scenes.map(s=>s.id===doc.active?plan.scene:s);setTool('select');setSelection(plan.selection);wallMultiSelect=false;objectPasteCounts.set(key,count+1);commit();canvas.focus();toast(`${plan.count} ${plan.count===1?'item':'items'} pasted · Undo to restore`);
 }catch(error){toast(error.message||'This Scenic object copy could not be pasted.');}
 return true;
}
window.ScenicObjectClipboard={copy:copySceneSelection,paste:pasteSceneSelection};
document.addEventListener('copy',event=>{
 if(!event.clipboardData)return;
 try{const text=copySceneSelection();if(!text)return;event.clipboardData.setData('text/plain',text);event.preventDefault();}catch(error){toast(error.message);}
});
document.addEventListener('paste',event=>{
 if(objectClipboardFocusBlocked(event.target)||!event.clipboardData)return;
 if(pasteSceneSelection(event.clipboardData.getData('text/plain')))event.preventDefault();
});
