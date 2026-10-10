/* Native macOS bridge. In a browser this file has no effect. */
(() => {
 const handler=window.webkit?.messageHandlers?.scenic;
 if(window.ScenicWindows){
  window.ScenicDesktop={request:window.ScenicWindows.request,async exportFile(blob,filename){const base64=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result.split(',')[1]);r.onerror=reject;r.readAsDataURL(blob);});return this.request('exportFile',{filename,base64});}};
  document.documentElement.classList.add('desktop-app');return;
 }
 if(!handler)return;
 const pending=new Map();let next=0;
 window.ScenicDesktop={
  receive(id,result,error){const p=pending.get(id);if(!p)return;pending.delete(id);error?p.reject(new Error(error)):p.resolve(result);},
  request(action,payload={}){return new Promise((resolve,reject)=>{const id=String(++next);pending.set(id,{resolve,reject});handler.postMessage({id,action,...payload});});},
  async exportFile(blob,filename){const base64=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result.split(',')[1]);r.onerror=reject;r.readAsDataURL(blob);});return this.request('exportFile',{filename,base64});}
 };
 document.documentElement.classList.add('desktop-app');
 document.addEventListener('DOMContentLoaded',()=>document.querySelector('.brand').addEventListener('click',e=>e.preventDefault()));
})();
