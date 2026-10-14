/* The scene browser owns no workspace; every selection and preview comes from the editor. */
(() => {
 let isOpen=false,popup=null,revision=0,timer;
 const cache=new Map(),popupURL=new URL('scene-browser.html',location.href).href;
 function snapshot(){return {productionId:doc.projectId,name:doc.name,theme:doc.theme,active:doc.active,revision,scenes:doc.scenes.map((s,i)=>({id:s.id,title:s.title,number:i+1}))};}
 function browserSend(message){
  try{if(popup&&!popup.closed&&popup.location.href===popupURL)popup.postMessage(message,location.origin==='null'?'*':location.origin);}catch{}
 }
 async function preview(productionId,sceneId){
  if(productionId!==doc.projectId)return null;
  const targetScene=doc.scenes.find(s=>s.id===sceneId);if(!targetScene)return null;
  const version=revision,key=productionId+':'+sceneId;if(cache.has(key))return cache.get(key);
  await Promise.allSettled(targetScene.objects.filter(o=>o.type==='image').map(o=>{const image=imageFor(o);return image.complete?Promise.resolve():image.decode();}));
  if(productionId!==doc.projectId||version!==revision||!doc.scenes.includes(targetScene))return null;
  const previous={canvas,ctx,size,view,active:doc.active,selected,selectedIds,playback};
  try{
   const surface=document.createElement('canvas');surface.width=1200;surface.height=800;
   canvas=surface;ctx=surface.getContext('2d');size={w:1200,h:800};doc.active=sceneId;selected=null;selectedIds=new Set();playback=null;
   fit();draw(true);
   const thumbnail=document.createElement('canvas');thumbnail.width=480;thumbnail.height=320;thumbnail.getContext('2d').drawImage(surface,0,0,480,320);
   const image=thumbnail.toDataURL('image/jpeg',.76);cache.set(key,image);return image;
  }catch{return null;}
  finally{canvas=previous.canvas;ctx=previous.ctx;size=previous.size;view=previous.view;doc.active=previous.active;selected=previous.selected;selectedIds=previous.selectedIds;playback=previous.playback;updateZoom();invalidate();}
 }
 async function open(){
  try{
   if(window.ScenicDesktop){isOpen=true;await window.ScenicDesktop.request('openSceneBrowser',{snapshot:snapshot()});}
   else{popup=window.open(popupURL,'scenic-scene-browser','popup,width=1040,height=740');if(!popup)throw Error('Allow the scene-browser window in your browser.');isOpen=true;popup.focus();browserSend({channel:'scenic-scene-browser',snapshot:snapshot()});}
  }catch(error){isOpen=false;toast(error.message||'The scene browser could not open.');}
 }
 function changed(){
  revision++;cache.clear();clearTimeout(timer);if(!isOpen)return;
  timer=setTimeout(()=>{if(!isOpen)return;if(window.ScenicDesktop)window.ScenicDesktop.request('updateSceneBrowser',{snapshot:snapshot()}).catch(()=>{});else browserSend({channel:'scenic-scene-browser',snapshot:snapshot()});},250);
 }
 function select(productionId,sceneId){return productionId===doc.projectId&&activateScene(sceneId);}
 function closed(){isOpen=false;popup=null;cache.clear();}
 window.ScenicSceneBrowser={open,changed,preview,select,closed};
 $('browse-scenes').onclick=open;
 window.addEventListener('message',async event=>{
  if(event.source!==popup||event.origin!==location.origin||event.data?.channel!=='scenic-scene-browser')return;
  const {id,action,payload={}}=event.data;let result;
  if(action==='sceneBrowserReady')result=snapshot();
  else if(action==='scenePreview')result=await preview(payload.productionId,payload.sceneId);
  else if(action==='selectScene')result=select(payload.productionId,payload.sceneId);
  else if(action==='sceneBrowserClosed'){closed();return;}else return;
  browserSend({channel:'scenic-scene-browser',id,result});
 });
})();
