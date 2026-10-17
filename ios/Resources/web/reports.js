/* Crash reports stay on this device until the user opens an email draft. */
(() => {
 const EMAIL='alexanderhosier@squidproductions.org';
 const byId=id=>document.getElementById(id);
 let current=null;
 function status(message){byId('crash-report-status').textContent=message;}
 function browserReport(){try{return JSON.parse(localStorage.getItem('scenic-crash-report'))||null;}catch{return null;}}
 function errorText(error){return error instanceof Error?error.stack||error.message:typeof error==='string'?error:'An unhandled editor error occurred.';}
 function record(message){
  const text=String(message).slice(0,4000);
  if(window.ScenicDesktop){window.ScenicDesktop.request('logError',{message:text}).catch(()=>{});return;}
  const report={id:String(Date.now()),needsPrompt:true,log:`Scenic browser error\nRecorded: ${new Date().toISOString()}\n${text}`};
  try{localStorage.setItem('scenic-crash-report',JSON.stringify(report));}catch{}
 }
 window.addEventListener('error',event=>{if(event.message)record(errorText(event.error||event.message));});
 window.addEventListener('unhandledrejection',event=>record(errorText(event.reason)));
 async function get(){return window.ScenicDesktop?window.ScenicDesktop.request('getCrashReport'):browserReport()||{id:null,needsPrompt:false,log:'No browser crash log has been recorded. Describe what happened below.'};}
 async function dismiss(){
  if(window.ScenicDesktop)await window.ScenicDesktop.request('dismissCrashReport',{id:current?.id});
  else if(current?.id){current.needsPrompt=false;try{localStorage.setItem('scenic-crash-report',JSON.stringify(current));}catch{}}
 }
 async function show(automatic=false){
  try{
   current=await get();if(automatic&&!current.needsPrompt)return;
   byId('settings').close();
   byId('crash-report-intro').textContent=current.needsPrompt?'Scenic stopped unexpectedly. Would you like to send a crash report? Describe what you were doing when it happened.':'Send a crash report with a description of what happened.';
   byId('crash-report-log').value=current.log;status('');
   byId('crash-report').showModal();byId('crash-report-description').focus();
  }catch{status('Could not load the crash log. Contact '+EMAIL+'.');}
 }
 function text(){return `What happened:\n${byId('crash-report-description').value.trim()}\n\n${current?.log||''}`;}
 async function saveLog(){
  const blob=new Blob([text()],{type:'text/plain;charset=utf-8'});
  if(window.ScenicDesktop)return window.ScenicDesktop.exportFile(blob,'Scenic-crash-report.txt');
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='Scenic-crash-report.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);return true;
 }
 document.addEventListener('DOMContentLoaded',()=>{
  byId('report-crash').onclick=()=>show();
  byId('crash-report').addEventListener('close',()=>{dismiss().catch(()=>status('Could not dismiss the report.'));});
  byId('close-crash-report').onclick=()=>byId('crash-report').close();
  byId('save-crash-log').onclick=async()=>{try{if(await saveLog())status('Crash log saved. You can attach it to your email.');}catch{status('Could not save the crash log. Copy it from the preview.');}};
  byId('crash-report-form').onsubmit=async event=>{
   event.preventDefault();const button=byId('send-crash-report');button.disabled=true;status('');
   try{
    let result;
    if(window.ScenicDesktop)result=await window.ScenicDesktop.request('sendCrashReport',{description:byId('crash-report-description').value.trim()});
    else{
     const url=`mailto:${EMAIL}?subject=Scenic%20crash%20report&body=${encodeURIComponent(text())}`;
     const attachmentRequired=url.length>2000;
     if(attachmentRequired)await saveLog();
     window.location.href=attachmentRequired?`mailto:${EMAIL}?subject=Scenic%20crash%20report&body=Please%20attach%20Scenic-crash-report.txt%20with%20my%20description%20and%20crash%20log.`:url;
     result={attachmentRequired};
    }
    await dismiss();
    status(result?.attachmentRequired?'Email draft opened. Attach Scenic-crash-report.txt from the opened folder or your downloads, then send it in your email app.':'Email draft opened with your description and crash log. Review it and send it in your email app.');
   }catch{status('Could not open your email app. Save the crash log and email it to '+EMAIL+'.');}
   finally{button.disabled=false;}
  };
  show(true);
 });
})();
