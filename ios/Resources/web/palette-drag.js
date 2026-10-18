/* Palette placement shares the editor's constructors and viewport conversion.
   Touch waits for a hold; a swipe before the hold remains ordinary scrolling. */
(()=>{
 'use strict';
 const root=document.documentElement,selector='#library [data-asset],#library [data-tool],#tools [data-tool]',tools=new Set(['camera','light','actor','wall']);
 const help=document.createElement('p');help.id='palette-drag-help';help.className='palette-drag-help';help.textContent=window.ScenicIPad?'Hold, then drag · Swipe to scroll':'Click, then map · Or drag to place';
 $('library-heading').after(help);
 const status=document.createElement('div');status.className='visually-hidden';status.setAttribute('role','status');status.setAttribute('aria-live','polite');document.body.append(status);
 const ghost=document.createElement('div');ghost.id='palette-drag-preview';ghost.setAttribute('aria-hidden','true');ghost.hidden=true;document.body.append(ghost);
 const marker=document.createElement('div');marker.id='palette-drop-marker';marker.setAttribute('aria-hidden','true');marker.hidden=true;document.body.append(marker);
 let gesture=null,timer=null,suppressClick=null,blockedTouches=false;
 function suppress(item){suppressClick={type:item.type,until:Date.now()+800};}
 function source(target){
  const button=target.closest?.(selector);if(!button||button.disabled)return null;
  const asset=button.dataset.asset&&ScenicCatalog.get(button.dataset.asset),type=asset?'asset:'+asset.id:button.dataset.tool;
  if(!asset&&!tools.has(type))return null;
  return {button,type,name:asset?.name||({camera:'Camera',light:'Light',actor:'Talent',wall:'Wall'})[type]};
 }
 function decorate(){if(window.ScenicIPad)$('library-heading').querySelector('.tiny').textContent='TAP OR HOLD & DRAG';document.querySelectorAll(selector).forEach(button=>{if(!source(button))return;button.setAttribute('aria-describedby',help.id);button.draggable=false;});}
 decorate();new MutationObserver(decorate).observe($('library'),{childList:true,subtree:true});
 function allowed(){return !projectExchangeBusy&&!document.querySelector('dialog[open]')&&!document.body.inert;}
 function announce(text){if(status.textContent!==text)status.textContent=text;}
 function consume(event){if(event.cancelable)event.preventDefault();event.stopImmediatePropagation();}
 function clear(){
  clearTimeout(timer);timer=null;
  const previous=gesture;gesture=null;
  if(previous){previous.button.classList.remove('palette-hold');try{if(root.hasPointerCapture(previous.id))root.releasePointerCapture(previous.id);}catch{}}
  root.classList.remove('palette-dragging');ghost.hidden=marker.hidden=true;wrap.classList.remove('palette-drop-ready');
 }
 function cancel(){if(!gesture)return;const item=gesture;clear();if(item.active){suppress(item);announce('Placement cancelled. No item added.');}}
 function abandon(){cancel();blockedTouches=false;}
 function begin(item,point,id,touch){
  if(!allowed())return;
  suppressClick=false;gesture={...item,id,touch,x:point.clientX,y:point.clientY,project:doc.projectId,scene:scene().id,active:false,armed:!touch};
  if(touch)timer=setTimeout(()=>{if(!gesture)return;gesture.armed=true;gesture.button.classList.add('palette-hold');announce('Ready to drag '+gesture.name+'. Move to the scene map.');},320);
 }
 function target(point){
  if(!gesture||!gesture.button.isConnected||!allowed()||shotView||doc.projectId!==gesture.project||scene().id!==gesture.scene)return null;
  if(gesture.type==='asset:sun'&&scene().objects.some(o=>o.kind==='sun'))return null;
  const r=canvas.getBoundingClientRect();
  if(!r.width||!r.height||point.clientX<r.left||point.clientX>=r.right||point.clientY<r.top||point.clientY>=r.bottom||document.elementFromPoint(point.clientX,point.clientY)!==canvas)return null;
  return snapped(world(point));
 }
 function move(point,event){
  if(!gesture)return;
  const distance=Math.hypot(point.clientX-gesture.x,point.clientY-gesture.y);
  if(!gesture.active){
   if(gesture.touch&&!gesture.armed){if(distance>10)clear();return;}
   if(distance<6)return;
   gesture.active=true;root.classList.add('palette-dragging');ghost.hidden=false;
   if(!gesture.touch)try{root.setPointerCapture(gesture.id);}catch{}
  }
  consume(event);
  const p=target(point),valid=!!p;
  ghost.textContent=(valid?'＋ ':'× ')+gesture.name+' · '+(valid?(gesture.type==='wall'?'Drop to start wall':'Drop to add'):'Move to Scene map');
  ghost.classList.toggle('valid',valid);
  ghost.style.left=Math.max(8,Math.min(innerWidth-228,point.clientX+16))+'px';ghost.style.top=Math.max(8,Math.min(innerHeight-64,point.clientY-64))+'px';
  marker.hidden=!valid;wrap.classList.toggle('palette-drop-ready',valid);
  if(valid){const r=canvas.getBoundingClientRect();marker.style.left=r.left+view.x+p.x*view.z+'px';marker.style.top=r.top+view.y+p.y*view.z+'px';}
  announce(valid?(gesture.type==='wall'?'Drop to start the wall. Then choose its endpoint.':'Drop to add '+gesture.name+'.'):'Move over the scene map. Release outside it to cancel.');
 }
 function end(point,event){
  if(!gesture)return;
  if(!gesture.active){clear();return;}
  consume(event);const p=target(point),item=gesture;clear();suppress(item);
  if(!p){announce('Placement cancelled. No item added.');return;}
  stopPlayback();
  if(item.type==='wall'){setTool('wall');wallStart=p;hover=p;invalidate();toast('Wall start placed · choose an endpoint');announce('Wall start placed. Tap or click its endpoint.');}
  else{addObject(item.type,p);announce(item.name+' added to the scene.');}
 }
 document.addEventListener('pointerdown',e=>{
  if(e.pointerType==='touch'){if(gesture){blockedTouches=true;cancel();}else if(!blockedTouches)suppressClick=null;if(blockedTouches)consume(e);return;}
  cancel();suppressClick=false;if(e.button!==0)return;const item=source(e.target);if(item)begin(item,e,e.pointerId,false);
 },true);
 document.addEventListener('pointermove',e=>{if(gesture&&!gesture.touch&&e.pointerId===gesture.id)move(e,e);},true);
 document.addEventListener('pointerup',e=>{if(gesture&&!gesture.touch&&e.pointerId===gesture.id)end(e,e);},true);
 document.addEventListener('pointercancel',e=>{if(gesture&&!gesture.touch&&e.pointerId===gesture.id)cancel();},true);
 document.addEventListener('lostpointercapture',e=>{if(e.target===root&&gesture?.active&&!gesture.touch&&e.pointerId===gesture.id)cancel();},true);
 document.addEventListener('touchstart',e=>{
  if(blockedTouches){consume(e);return;}
  if(gesture&&e.touches.length>1){cancel();blockedTouches=true;consume(e);return;}
  suppressClick=false;if(e.touches.length!==1)return;const item=source(e.target);if(item)begin(item,e.touches[0],e.touches[0].identifier,true);
 },{capture:true,passive:false});
 document.addEventListener('touchmove',e=>{
  if(blockedTouches){consume(e);return;}
  if(!gesture?.touch)return;const point=Array.from(e.changedTouches).find(p=>p.identifier===gesture.id);if(point)move(point,e);
 },{capture:true,passive:false});
 document.addEventListener('touchend',e=>{
  if(blockedTouches){consume(e);if(!e.touches.length)blockedTouches=false;return;}
  if(!gesture?.touch)return;const point=Array.from(e.changedTouches).find(p=>p.identifier===gesture.id);if(point)end(point,e);
 },{capture:true,passive:false});
 document.addEventListener('touchcancel',e=>{if(gesture?.touch)cancel();if(blockedTouches){consume(e);if(!e.touches.length)blockedTouches=false;}},{capture:true,passive:false});
 document.addEventListener('click',e=>{
  const previous=suppressClick;suppressClick=null;
  // Only the drag's compatibility click is suppressed. A later accessibility
  // activation (which may have no pointerdown) must still reach Undo or a panel.
  if(previous&&Date.now()<previous.until&&e.detail!==0&&(e.target===root||e.target===document||e.target===document.body||source(e.target)?.type===previous.type))consume(e);
 },true);
 document.addEventListener('dragstart',e=>{if(source(e.target))e.preventDefault();},true);
 document.addEventListener('contextmenu',e=>{if(gesture?.touch)e.preventDefault();},true);
 window.addEventListener('keydown',e=>{if(gesture?.active&&e.key==='Escape'){consume(e);cancel();}},true);
 window.addEventListener('blur',abandon);window.addEventListener('resize',abandon);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)abandon();});
})();
