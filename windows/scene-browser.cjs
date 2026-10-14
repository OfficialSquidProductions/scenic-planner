class SceneBrowser{
 constructor({BrowserWindow,win,rootURL,preload}){this.BrowserWindow=BrowserWindow;this.editor=win;this.url=new URL('scene-browser.html',rootURL).href;this.preload=preload;this.window=null;this.snapshot=null;}
 accepts(event){return !!this.window&&event.sender===this.window.webContents&&event.senderFrame===this.window.webContents.mainFrame&&event.senderFrame.url===this.url;}
 async update(snapshot,show=false){
  if(!snapshot||typeof snapshot.productionId!=='string'||typeof snapshot.name!=='string'||typeof snapshot.active!=='string'||!Array.isArray(snapshot.scenes)||!snapshot.scenes.every(s=>typeof s.id==='string'&&typeof s.title==='string'&&Number.isInteger(s.number))||Buffer.byteLength(JSON.stringify(snapshot))>2*1024*1024)throw Error('Invalid scene browser data.');
  if(!this.window&&!show)return false;this.snapshot=snapshot;
  if(!this.window){
   const window=new this.BrowserWindow({width:1040,height:740,minWidth:600,minHeight:400,title:snapshot.name+' · Scenes · Scenic',backgroundColor:'#191419',webPreferences:{preload:this.preload,nodeIntegration:false,contextIsolation:true,sandbox:true,spellcheck:false}});this.window=window;
   window.webContents.setWindowOpenHandler(()=>({action:'deny'}));window.webContents.on('will-navigate',(event,url)=>{if(url!==this.url)event.preventDefault();});
   window.on('closed',()=>{this.window=null;this.snapshot=null;this.editor.webContents.executeJavaScript('window.ScenicSceneBrowser?.closed()').catch(()=>{});});
   await window.loadURL(this.url);
  }else await this.window.webContents.executeJavaScript('window.ScenicSceneBrowserWindow?.render('+JSON.stringify(snapshot)+')');
  this.window.setTitle(snapshot.name+' · Scenes · Scenic');if(show){this.window.show();this.window.focus();}return true;
 }
 async request(action,payload={}){
  if(action==='sceneBrowserReady')return this.snapshot;
  if(!['scenePreview','selectScene'].includes(action)||typeof payload.productionId!=='string'||typeof payload.sceneId!=='string')throw Error('Unsupported scene browser request.');
  const method=action==='scenePreview'?'preview':'select',args=JSON.stringify([payload.productionId,payload.sceneId]);
  const result=await this.editor.webContents.executeJavaScript(`window.ScenicSceneBrowser.${method}(...${args})`);
  if(action==='selectScene'&&result===true){if(this.editor.isMinimized())this.editor.restore();this.editor.show();this.editor.focus();}
  return result;
 }
}
module.exports={SceneBrowser};
