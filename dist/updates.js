/* The installed changelog is bundled so it also works offline. */
(() => {
 'use strict';
 const dialog=document.getElementById('changelog');
 const content=document.getElementById('changelog-entries');
 const data=window.ScenicChangelog;
 if(data){
  document.getElementById('changelog-version').textContent=`Installed version ${data.version}`;
  for(const [index,entry] of data.entries.entries()){
   const section=document.createElement('section');section.className='changelog-entry';
   const heading=document.createElement('h2');heading.textContent=`Scenic ${entry.version}`;
   const badge=document.createElement('span');badge.className='changelog-badge';badge.textContent=index===0?'Current version':'Previous release';
   const list=document.createElement('ul');
   for(const change of entry.changes){const item=document.createElement('li');item.textContent=change;list.append(item);}
   section.append(heading,badge,list);content.append(section);
  }
 }else content.textContent='Release notes are unavailable in this build.';
 document.getElementById('show-changelog').onclick=()=>{
  if(window.webkit?.messageHandlers?.scenic && window.ScenicDesktop){
   window.ScenicDesktop.request('showChangelog').catch(()=>{
    content.textContent='Release notes could not be opened. Try What’s New in the Scenic menu.';
    document.getElementById('settings').close();dialog.showModal();
   });
   return;
  }
  const settings=document.getElementById('settings');if(settings.open)settings.close();
  if(!dialog.open){dialog.showModal();content.scrollTop=0;}
 };
 document.getElementById('close-changelog').onclick=()=>dialog.close();
})();
