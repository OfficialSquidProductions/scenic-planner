/* Display controls: resizable scene browser, inspector tabs, scene transport, and RGB. */
function transportIcon(paused){return `<svg viewBox="0 0 24 24" aria-hidden="true">${paused?'<path d="M8 5v14M16 5v14"/>':'<path d="M7 4l14 8-14 8z"/>'}</svg>`;}
function stopPlayback(){playback=null;renderTransport();invalidate();}
function toggleScenePlayback(){
 const duration=ScenicModel.motionDuration(scene().objects);if(!duration)return;
 showShots(false);wallStart=null;
 if(playback?.mode==='scene'&&!playback.finished){
  if(playback.paused){playback.start=performance.now();playback.paused=false;}
  else{playback.elapsed=ScenicModel.playbackElapsed(playback,performance.now());playback.paused=true;}
 }else playback={mode:'scene',start:performance.now(),elapsed:0,duration,paused:false,finished:false};
 renderTransport();renderInspector();invalidate();
}
function renderTransport(){
 const button=$('play-scene');if(!button)return;
 const active=playback?.mode==='scene',playing=active&&!playback.paused;
 const label=playing?'Pause scene':active?(playback.finished?'Replay scene':'Resume scene'):'Play scene';
 button.innerHTML=transportIcon(playing);button.setAttribute('aria-label',label);button.title=label+' movement';button.classList.toggle('active',active);button.disabled=!ScenicModel.motionDuration(scene().objects);renderTransportTime();
}
function renderTransportTime(){const el=$('scene-playback-time');if(!el)return;const active=playback?.mode==='scene';const text=active?`${(ScenicModel.playbackElapsed(playback,performance.now())/1000).toFixed(1)} / ${(playback.duration/1000).toFixed(0)}s`:'';if(el.textContent!==text)el.textContent=text;}
function showInspectorTab(mode){
 const layers=mode==='layers';$('properties-panel').hidden=layers;$('layers-panel').hidden=!layers;
 for(const name of ['properties','layers']){const active=layers?name==='layers':name==='properties';const tab=$(name+'-tab');tab.setAttribute('aria-selected',active);tab.tabIndex=active?0:-1;}
}
function rgbInspector(o){const base=ScenicGeometry.temperature(o.temperature),channels=[o.red??base[0],o.green??base[1],o.blue??base[2]];return `<div class="section-label">RGB COLOR</div>${toggleField('Use RGB color','rgbEnabled',o.rgbEnabled)}<div class="rgb-color-preview"><i id="rgb-swatch" style="background:rgb(${channels.join(',')})"></i><span id="rgb-readout">${o.rgbEnabled?'RGB '+channels.join(' · '):'Color temperature active'}</span></div>${range('Red','red',channels[0],0,255)}${range('Green','green',channels[1],0,255)}${range('Blue','blue',channels[2],0,255)}`;}
function updateRGB(o,prop){
 if(o.type!=='light'||o.kind==='sun')return;
 if(['red','green','blue'].includes(prop))o.rgbEnabled=true;
 if(prop==='temperature')o.rgbEnabled=false;
 const toggle=document.querySelector('[data-prop="rgbEnabled"]');if(toggle)toggle.checked=!!o.rgbEnabled;
 const base=ScenicGeometry.temperature(o.temperature),channels=[o.red??base[0],o.green??base[1],o.blue??base[2]],swatch=$('rgb-swatch'),readout=$('rgb-readout');
 if(swatch)swatch.style.background=`rgb(${channels.join(',')})`;
 if(readout)readout.textContent=o.rgbEnabled?'RGB '+channels.join(' · '):'Color temperature active';
 for(const [index,key] of ['red','green','blue'].entries()){const field=document.querySelector(`[data-prop="${key}"]`);if(field)field.value=channels[index];const out=$('out-'+key);if(out)out.textContent=channels[index];}
}
function setupToolbarResize(){
 const heading=$('scene-heading'),handle=$('toolbar-resizer'),key='scenic-toolbar-heading-height';
 let preferred=null,drag=null;
 try{const stored=localStorage.getItem(key);if(stored!==null&&Number.isFinite(Number(stored)))preferred=Number(stored);}catch{}
 function bounds(){return {min:heading.getBoundingClientRect().width<450?94:64,max:parseFloat(getComputedStyle(heading).getPropertyValue('--scene-heading-expanded-height'))||129};}
 function apply(height=preferred){
  const {min,max}=bounds(),value=Math.max(min,Math.min(max,height===null?max:height));
  heading.style.setProperty('--scene-heading-height',value+'px');heading.classList.toggle('compact-heading',value<112);
  handle.setAttribute('aria-valuemin',min);handle.setAttribute('aria-valuemax',max);handle.setAttribute('aria-valuenow',Math.round(value));
  return value;
 }
 function commit(height){preferred=apply(height);try{localStorage.setItem(key,preferred);}catch{}}
 function finish(cancelled=false){
  if(!drag)return;const previous=drag;drag=null;
  if(cancelled){preferred=previous.preferred;apply();}else commit(heading.getBoundingClientRect().height);
  document.body.classList.remove('resizing-toolbar');
  if(handle.hasPointerCapture?.(previous.id))handle.releasePointerCapture(previous.id);
 }
 handle.onpointerdown=e=>{
  if(e.button!==0||drag)return;e.preventDefault();e.stopPropagation();handle.focus();
  drag={id:e.pointerId,y:e.clientY,height:heading.getBoundingClientRect().height,preferred};
  handle.setPointerCapture(e.pointerId);document.body.classList.add('resizing-toolbar');
 };
 handle.onpointermove=e=>{if(drag&&drag.id===e.pointerId){e.preventDefault();apply(drag.height+e.clientY-drag.y);}};
 handle.onpointerup=e=>{if(drag?.id===e.pointerId)finish();};
 handle.onpointercancel=e=>{if(drag?.id===e.pointerId)finish(true);};
 handle.onlostpointercapture=()=>finish(true);
 handle.onkeydown=e=>{
  if(e.key==='Escape'&&drag){e.preventDefault();e.stopPropagation();finish(true);return;}
  if(['ArrowUp','ArrowDown','Home','End'].includes(e.key)){
   e.preventDefault();e.stopPropagation();const {min,max}=bounds();
   commit(e.key==='Home'?max:e.key==='End'?min:heading.getBoundingClientRect().height+(e.key==='ArrowDown'?12:-12));
  }
 };
 handle.ondblclick=()=>commit(bounds().max);
 window.addEventListener('resize',()=>{if(!drag)apply();});
 if(heading.parentElement)new ResizeObserver(()=>{if(!drag)apply();}).observe(heading.parentElement);
 apply();
}
function setupControls(){
 setupToolbarResize();
 for(const name of ['properties','layers']){
  const tab=$(name+'-tab');tab.onclick=()=>showInspectorTab(name);
  tab.onkeydown=e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();e.stopPropagation();const next=e.key==='Home'?'properties':e.key==='End'?'layers':name==='properties'?'layers':'properties';showInspectorTab(next);$(next+'-tab').focus();}};
 }
 const sidebar=$('sidebar-panel'),browser=$('scene-browser'),divider=$('scene-resizer');let start=null;
 function clampHeight(height){
  if(!sidebar.clientHeight)return;
  const style=getComputedStyle(sidebar),others=[...sidebar.children].filter(el=>el!==browser&&!el.classList.contains('scene-builder')).reduce((total,el)=>total+el.getBoundingClientRect().height,0),padding=parseFloat(style.paddingTop)+parseFloat(style.paddingBottom),gaps=parseFloat(style.rowGap)*(sidebar.children.length-1);
  const max=Math.max(60,sidebar.clientHeight-others-padding-gaps-150),value=Math.max(60,Math.min(max,height));
  sidebar.style.setProperty('--scenes-height',value+'px');divider.setAttribute('aria-valuenow',Math.round(value));divider.setAttribute('aria-valuemax',Math.floor(max));localStorage.setItem('scenic-scenes-height-compact',value);
 }
 const saved=Number(localStorage.getItem('scenic-scenes-height-compact'));clampHeight(saved||88);
 divider.onpointerdown=e=>{e.preventDefault();divider.focus();start={y:e.clientY,height:browser.getBoundingClientRect().height};divider.setPointerCapture(e.pointerId);document.body.classList.add('resizing-scenes');};
 divider.onpointermove=e=>{if(start)clampHeight(start.height+e.clientY-start.y);};
 divider.onpointerup=divider.onpointercancel=()=>{start=null;document.body.classList.remove('resizing-scenes');};
 divider.onkeydown=e=>{if(['ArrowUp','ArrowDown','Home'].includes(e.key)){e.preventDefault();e.stopPropagation();clampHeight(e.key==='Home'?88:browser.getBoundingClientRect().height+(e.key==='ArrowDown'?24:-24));}};
 new ResizeObserver(()=>clampHeight(browser.getBoundingClientRect().height)).observe(sidebar);
}
