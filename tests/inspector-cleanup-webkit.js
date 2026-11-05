// Native WebKit regression test with synthetic, in-memory project storage.
const checks=[],check=(value,label)=>{if(!value)throw Error(label);checks.push(label);};
const field=prop=>document.querySelector(`#inspector-content [data-prop="${prop}"]`);
const change=(prop,value)=>{const el=field(prop);check(!!el,'Control available: '+prop);el.dispatchEvent(new FocusEvent('focus'));if(el.type==='checkbox')el.checked=value;else el.value=value;el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));};
const forbidden=['Original details stay below','With this item selected','Editable planning envelope','vertical-throughput approximation','Approximate 2D','The dashed line is the optical surface','Gold reflects a warm','Distance reduces brightness','Legacy appearance is retained','North: 0°','Manual sun study'];
const compact=label=>{const text=$('inspector-content').textContent;check(forbidden.every(phrase=>!text.includes(phrase)),label+' omits verbose helper copy');};
const fit=async label=>{
 for(const width of [190,220,268,380]){
  document.documentElement.style.setProperty('--right-width',width+'px');
  await new Promise(r=>setTimeout(r,20));
  const button=$('reset-info-label'),actions=button.parentElement,panel=$('inspector-content');
  const b=button.getBoundingClientRect(),a=actions.getBoundingClientRect(),p=panel.getBoundingClientRect(),next=actions.nextElementSibling.getBoundingClientRect();
  check(b.left>=p.left-1&&b.right<=p.right+1&&b.width>0&&b.height>20,label+' reset fits '+width+'px inspector');
  check(a.height>=b.height&&next.top>=b.bottom+12,label+' reset is separate from next control at '+width+'px');
  button.scrollIntoView({block:'center'});
  const visible=button.getBoundingClientRect(),hit=document.elementFromPoint(visible.left+visible.width/2,visible.top+visible.height/2);
  check(hit===button||button.contains(hit),label+' reset receives clicks at '+width+'px');
 }
};
try{
 doc={version:1,projectId:'inspector-cleanup',name:'SYNTHETIC INSPECTOR CHECK',theme:'light',active:'s',scenes:[{id:'s',title:'Compact controls',ambient:30,objects:[]}]};workspace={version:2,activeProject:doc.projectId,projects:[doc]};history=[];future=[];showShots(false);applyTheme();commit();resize();
 check(!document.querySelector('.map-legend'),'Static camera/talent/light legend is removed');check(!!$('canvas-hint')&&!!$('north-compass')&&!!document.querySelector('.canvas-badge'),'Canvas guidance, north compass and preview badge remain');const initialZoom=view.z;$('zoom-in').click();check(view.z>initialZoom,'Zoom in remains functional without legend');$('zoom-out').click();check(view.z<initialZoom*1.15,'Zoom out remains functional without legend');$('fit').click();check(Number.isFinite(view.z)&&view.z>0,'Fit scene remains functional without legend');
 addObject('camera',{x:400,y:300});const cameraId=selected;Object.assign(object(),{labelOffsetX:45,labelOffsetY:-30,notes:'Keep these camera notes'});commit();compact('Camera');await fit('Camera');
 change('labelConnector',false);check(object().labelConnector===false,'Camera connector toggle works');change('labelOffsetX','2 ft');check(object().labelOffsetX===24*UNITS_PER_INCH,'Label offset remains editable');
 const beforeReset=JSON.stringify(object());$('reset-info-label').click();check(object().labelOffsetX===undefined&&object().labelOffsetY===undefined,'Reset clears only the label offsets');check(object().notes==='Keep these camera notes'&&object().x===400&&object().y===300&&!object().labelConnector,'Reset preserves camera pose, notes and connector setting');
 undo();choose(cameraId);check(JSON.stringify(object())===beforeReset,'Reset undoes exactly');redo();choose(cameraId);check(object().labelOffsetX===undefined,'Reset redoes');$('reset-info-label').click();check(object().labelOffsetY===undefined,'Repeated reset stays safe');
 document.documentElement.style.setProperty('--right-width','190px');$('reset-info-label').scrollIntoView({block:'center'});await new Promise(r=>setTimeout(r,50));await ScenicDesktop.request('captureSnapshot',{name:'camera-narrow'});
 doc.theme='dark';applyTheme();await fit('Dark camera');doc.theme='light';applyTheme();
 const csv='Scene,Shot,Description,Camera,Lens mm,Size,Notes\nCOMPACT,1A,Compact check,A,35,Wide,Source notes';await $('shot-list-input').onchange({target:{files:[new File([csv],'compact.csv',{type:'text/csv'})],value:''}});$('confirm-shot-import').click();showShots(false);addObject('camera',{x:300,y:250});const linkedId=selected,shot=scene().shotList[0];$('camera-shot-link').value=shot.id;$('camera-shot-link').dispatchEvent(new Event('change'));compact('Linked camera');const coverage=$('camera-shot-checked');check(coverage&&coverage.parentElement.textContent.trim()==='Coverage','Coverage retains an accessible compact checkbox');coverage.click();check(scene().shotList[0].checked,'Coverage checkbox still updates its shot');check($('inspector-content').textContent.includes('Source notes'),'Original shot data remains available');
 addObject('actor',{x:260,y:360});compact('Talent');change('width','2 ft');change('height','3 ft');check(object().width===24*UNITS_PER_INCH&&object().height===36*UNITS_PER_INCH,'Talent dimensions remain editable');
 const presets=Object.keys(ScenicCatalog.lightPresets).filter(asset=>asset!=='sun');
 for(const asset of presets){
  addObject('asset:'+asset,{x:500,y:300});compact(asset);check(['power','temperature','radius','beam','rotation'].every(prop=>!!field(prop)),asset+' keeps light controls');check(['barnTop','barnBottom','barnLeft','barnRight'].every(prop=>!!field(prop)),asset+' keeps four door angles');change('barnDoors',true);check(!$('barn-door-adjustments').disabled,asset+' enables door controls');change('barnLeft',30);check(object().barnLeft===30,asset+' changes left door');change('barnDoors',false);check($('barn-door-adjustments').disabled&&object().barnLeft===30,asset+' disables without losing angle');
  if(ScenicCatalog.studioProfile(object())){change('studioOptics',false);change('studioOptics',true);check(object().studioOptics&&!$('studio-preview-help'),asset+' falloff toggle works without helper paragraphs');}
  await fit(asset);
 }
 addObject('asset:sun',{x:450,y:200});compact('Manual sun');check(!!document.querySelector('.sun-readout'),'Manual sun keeps its calculated readout');change('solarReal',true);compact('Geographic sun');check(!!field('latitude')&&!!document.querySelector('.sun-readout'),'Geographic sun keeps inputs and validation');
 for(const asset of ['flex-silver','flex-gold','flex-white','flex-black','negative-fill','bounce-board','diffusion-kit']){
  addObject('asset:'+asset,{x:600,y:400});compact(asset);check(!!$('modifier-size-readout'),asset+' retains size readout');check(!field('width')&&!field('height'),asset+' retains proportional-only geometry');change('modifierEnabled',false);change('modifierEnabled',true);change('modifierStrength',65);change('rotation',35);check(object().modifierEnabled&&object().modifierStrength===65&&object().rotation===35,asset+' controls remain functional');if(asset==='bounce-board'){change('bounceSide','Black');check(object().bounceSide==='Black','Bounce-board surface switch works');}
 }
 document.documentElement.style.setProperty('--right-width','268px');addObject('asset:flex-gold',{x:620,y:350});$('properties-panel').scrollTop=0;await new Promise(r=>setTimeout(r,50));await ScenicDesktop.request('captureSnapshot',{name:'gold-reflector'});
 const encoded=ScenicProjectFile.serialize(doc),expected=JSON.stringify(doc.scenes);loadWorkspace(ScenicModel.workspaceFrom(ScenicProjectFile.parse(encoded),doc.projectId));commit();check(JSON.stringify(doc.scenes)===expected,'Portable save/reopen preserves scene objects and settings');choose(linkedId);check(scene().shotList[0].checked&&object().shotId===shot.id,'Save/reopen preserves coverage and shot link');
 const beforeExport=JSON.stringify(workspaceData()),png=await ScenicBatchExport.map(doc.projectId,doc.active);check(png.data.length>1000&&png.data[0]===137,'Map PNG export works');check(JSON.stringify(workspaceData())===beforeExport,'Export preserves workspace');await scenicFlush();
 return {passed:true,count:checks.length,checks};
}catch(error){return {passed:false,count:checks.length,checks,error:error.message,stack:error.stack};}
