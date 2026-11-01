/* Bounded binary exports and the real editor renderer, shared by native hosts. */
(function(root){
'use strict';
const MAX_BYTES=80*1024*1024,encoder=new TextEncoder();
const bytes=text=>encoder.encode(text),sum=parts=>parts.reduce((n,p)=>n+p.length,0);
function safeName(value,fallback='Scenes'){return String(value).normalize('NFKD').replace(/[^a-z0-9 _-]/gi,'').trim().replace(/\s+/g,' ').slice(0,70)||fallback;}
function filename(scene,index){return String(index+1).padStart(3,'0')+' - '+safeName(scene.title,'Scene')+'.png';}
function pdf(images,width=1800,height=1250){
 if(!images.length||images.length>100)throw Error('Choose a production with 1 to 100 scenes.');
 const objects=[],pages=images.map((_,i)=>3+i*3);
 objects.push(bytes('<< /Type /Catalog /Pages 2 0 R >>'),bytes('<< /Type /Pages /Count '+images.length+' /Kids ['+pages.map(n=>n+' 0 R').join(' ')+'] >>'));
 images.forEach((image,i)=>{if(!(image instanceof Uint8Array)||image.length<4||image[0]!==255||image[1]!==216)throw Error('A scene image could not be encoded.');const p=pages[i],content=bytes('q\n'+width+' 0 0 '+height+' 0 0 cm\n/Scene Do\nQ\n');
  objects.push(bytes('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 '+width+' '+height+'] /Resources << /XObject << /Scene '+(p+2)+' 0 R >> >> /Contents '+(p+1)+' 0 R >>'));
  objects.push(join([bytes('<< /Length '+content.length+' >>\nstream\n'),content,bytes('endstream')]));
  objects.push(join([bytes('<< /Type /XObject /Subtype /Image /Width '+width+' /Height '+height+' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '+image.length+' >>\nstream\n'),image,bytes('\nendstream')]));
 });
 const parts=[bytes('%PDF-1.4\n%Scenic\n')],offsets=[0];let length=parts[0].length;
 objects.forEach((o,i)=>{offsets.push(length);const chunk=join([bytes((i+1)+' 0 obj\n'),o,bytes('\nendobj\n')]);parts.push(chunk);length+=chunk.length;if(length>MAX_BYTES)throw Error('This export exceeds 80 MB. Export fewer scenes in separate productions.');});
 parts.push(bytes('xref\n0 '+offsets.length+'\n0000000000 65535 f \n'+offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')+'trailer\n<< /Size '+offsets.length+' /Root 1 0 R >>\nstartxref\n'+length+'\n%%EOF\n'));return join(parts);
}
function join(parts){const size=sum(parts);if(size>MAX_BYTES)throw Error('This export exceeds 80 MB. Export fewer scenes in separate productions.');const out=new Uint8Array(size);let n=0;for(const part of parts){out.set(part,n);n+=part.length;}return out;}
function crc(data){let c=0xffffffff;for(const b of data){c^=b;for(let j=0;j<8;j++)c=(c>>>1)^((c&1)?0xedb88320:0);}return (c^0xffffffff)>>>0;}
function zip(files){const parts=[],central=[];let offset=0;for(const file of files){const name=bytes(file.name),data=file.data,c=crc(data),local=new Uint8Array(30),v=new DataView(local.buffer);v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(12,33,true);v.setUint32(14,c,true);v.setUint32(18,data.length,true);v.setUint32(22,data.length,true);v.setUint16(26,name.length,true);parts.push(local,name,data);const h=new Uint8Array(46),d=new DataView(h.buffer);d.setUint32(0,0x02014b50,true);d.setUint16(4,20,true);d.setUint16(6,20,true);d.setUint16(14,33,true);d.setUint32(16,c,true);d.setUint32(20,data.length,true);d.setUint32(24,data.length,true);d.setUint16(28,name.length,true);d.setUint32(42,offset,true);central.push(h,name);offset+=local.length+name.length+data.length;if(offset>MAX_BYTES)throw Error('This export exceeds 80 MB.');}const end=new Uint8Array(22),v=new DataView(end.buffer);v.setUint32(0,0x06054b50,true);v.setUint16(8,files.length,true);v.setUint16(10,files.length,true);v.setUint32(12,sum(central),true);v.setUint32(16,offset,true);return join([...parts,...central,end]);}
const api={MAX_BYTES,safeName,filename,pdf,zip};if(typeof module==='object'&&module.exports)module.exports=api;else root.ScenicBatchFiles=api;
})(globalThis);

if(typeof window!=='undefined')(()=>{
 let active=null,last={running:false,message:''};
 const yieldFrame=()=>new Promise(resolve=>setTimeout(resolve,0));
 function status(){const s=active||last;return {productionId:s.productionId||'',name:s.name||'',running:!!s.running,completed:s.completed||0,total:s.total||0,message:s.message||''};}
 function cancel(productionId){if(active?.productionId!==productionId)return false;active.cancelled=true;active.message='Cancelling export…';return true;}
 function cancelled(job){if(job.cancelled)throw Error('Export cancelled.');}
 async function raster(project,target,index,format){
  for(const o of target.objects.filter(o=>(o.type==='image'||o.type==='floor')&&o.src)){const image=imageFor(o);if(!image.complete)await image.decode();if(!image.naturalWidth)throw Error('A reference or floor image in '+target.title+' could not be read.');}
  const previous={doc,canvas,ctx,size,view,selected,selectedIds,playback,drag,theme:document.documentElement.dataset.theme};
  try{
   document.documentElement.dataset.theme=project.theme;drag=null;const map=document.createElement('canvas');map.width=1800;map.height=1165;doc=project;doc.active=target.id;canvas=map;ctx=map.getContext('2d');size={w:1800,h:1165};selected=null;selectedIds=new Set();playback=null;fit();draw(true);
   const surface=document.createElement('canvas');surface.width=1800;surface.height=1250;ctx=surface.getContext('2d');ctx.drawImage(map,0,85);ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle=color('--paper');ctx.fillRect(0,0,1800,85);ctx.fillStyle=color('--ink');ctx.font='25px Futura,sans-serif';ctx.fillText(String(index+1).padStart(2,'0')+' · '+target.title,45,40,1710);ctx.font='11px Futura,sans-serif';ctx.fillStyle=color('--muted');ctx.fillText(project.name+'   /   SCENIC · SQUID PRODUCTIONS',45,64,1710);
   const encoded=surface.toDataURL(format==='pdf'?'image/jpeg':'image/png',.94).split(',')[1];if(!encoded)throw Error('The scene image could not be created.');return Uint8Array.from(atob(encoded),c=>c.charCodeAt(0));
  }finally{doc=previous.doc;canvas=previous.canvas;ctx=previous.ctx;size=previous.size;view=previous.view;selected=previous.selected;selectedIds=previous.selectedIds;playback=previous.playback;drag=previous.drag;document.documentElement.dataset.theme=previous.theme;updateZoom();invalidate();}
 }
 async function start(productionId,format){
  if(active)throw Error('Finish or cancel the current scene export first.');if(productionId!==doc.projectId)throw Error('Reopen Scenes for the active production.');if(!['pdf','png'].includes(format))throw Error('Choose PDF or PNG.');if(drag)throw Error('Finish moving the current item before exporting.');
  const project=structuredClone(doc);if(!project.scenes.length||project.scenes.length>100)throw Error('Choose a production with 1 to 100 scenes.');const job=active={productionId,name:project.name,running:true,completed:0,total:project.scenes.length,message:'Preparing '+project.scenes.length+' scenes…',cancelled:false};const files=[];let totalBytes=0;
  try{
   if(format==='png'&&window.ScenicDesktop){job.token=await ScenicDesktop.request('beginScenePNGExport',{name:ScenicBatchFiles.safeName(project.name),count:job.total});if(!job.token){job.cancelled=true;cancelled(job);}}
   for(let i=0;i<project.scenes.length;i++){cancelled(job);job.message='Rendering '+(i+1)+' / '+job.total+' · '+project.scenes[i].title;await yieldFrame();const data=await raster(project,project.scenes[i],i,format);cancelled(job);totalBytes+=data.length;if(totalBytes>ScenicBatchFiles.MAX_BYTES)throw Error('This export exceeds 80 MB. Export fewer scenes in separate productions.');const name=ScenicBatchFiles.filename(project.scenes[i],i);
    if(job.token){const blob=new Blob([data],{type:'image/png'}),encoded=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result.split(',')[1]);r.onerror=()=>reject(Error('Could not encode the scene image.'));r.readAsDataURL(blob);});await ScenicDesktop.request('appendScenePNGExport',{token:job.token,index:i,filename:name,base64:encoded});}else files.push({name,data});job.completed=i+1;
   }
   cancelled(job);job.message='Choose where to save…';let result;
   if(job.token)result=await ScenicDesktop.request('finishScenePNGExport',{token:job.token});
   else{const data=format==='pdf'?ScenicBatchFiles.pdf(files.map(f=>f.data)):ScenicBatchFiles.zip(files),name=ScenicBatchFiles.safeName(project.name)+' - all scenes.'+(format==='pdf'?'pdf':'zip'),blob=new Blob([data],{type:format==='pdf'?'application/pdf':'application/zip'});if(window.ScenicDesktop)result=await ScenicDesktop.exportFile(blob,name);else{download(blob,name);result=true;}}
   job.message=result?'Exported '+job.total+' scenes'+(format==='pdf'?' in one PDF.':window.ScenicDesktop?' as separate PNG files.':' as separate PNG files in a ZIP.'):'Export cancelled.';return {completed:!!result,message:job.message,count:job.total};
  }catch(error){job.message=error.message||'The scenes could not be exported.';if(job.token)try{await ScenicDesktop.request('cancelScenePNGExport',{token:job.token});}catch{}if(job.cancelled)return {completed:false,message:'Export cancelled.'};throw error;}
  finally{job.running=false;last={productionId,name:job.name,running:false,completed:job.completed,total:job.total,message:job.message};active=null;}
 }
 window.ScenicBatchExport={start,status,cancel};
})();
