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
function setupControls(){
 for(const name of ['properties','layers']){
  const tab=$(name+'-tab');tab.onclick=()=>showInspectorTab(name);
  tab.onkeydown=e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();e.stopPropagation();const next=e.key==='Home'?'properties':e.key==='End'?'layers':name==='properties'?'layers':'properties';showInspectorTab(next);$(next+'-tab').focus();}};
 }
 const sidebar=$('sidebar-panel'),browser=$('scene-browser'),divider=$('scene-resizer');let start=null;
 function clampHeight(height){
  if(!sidebar.clientHeight)return;
  const style=getComputedStyle(sidebar),others=[...sidebar.children].filter(el=>el!==browser&&!el.classList.contains('scene-builder')).reduce((total,el)=>total+el.getBoundingClientRect().height,0),padding=parseFloat(style.paddingTop)+parseFloat(style.paddingBottom),gaps=parseFloat(style.rowGap)*(sidebar.children.length-1);
  const max=Math.max(60,sidebar.clientHeight-others-padding-gaps-150),value=Math.max(60,Math.min(max,height));
  sidebar.style.setProperty('--scenes-height',value+'px');divider.setAttribute('aria-valuenow',Math.round(value));divider.setAttribute('aria-valuemax',Math.floor(max));localStorage.setItem('scenic-scenes-height',value);
 }
 const saved=Number(localStorage.getItem('scenic-scenes-height'));clampHeight(saved||140);
 divider.onpointerdown=e=>{e.preventDefault();divider.focus();start={y:e.clientY,height:browser.getBoundingClientRect().height};divider.setPointerCapture(e.pointerId);document.body.classList.add('resizing-scenes');};
 divider.onpointermove=e=>{if(start)clampHeight(start.height+e.clientY-start.y);};
 divider.onpointerup=divider.onpointercancel=()=>{start=null;document.body.classList.remove('resizing-scenes');};
 divider.onkeydown=e=>{if(['ArrowUp','ArrowDown','Home'].includes(e.key)){e.preventDefault();e.stopPropagation();clampHeight(e.key==='Home'?140:browser.getBoundingClientRect().height+(e.key==='ArrowDown'?24:-24));}};
 new ResizeObserver(()=>clampHeight(browser.getBoundingClientRect().height)).observe(sidebar);
}
