const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('SquidPlatform',process.platform==='darwin'?'MacBook':'Desktop');
contextBridge.exposeInMainWorld('ScenicWindows',{request:(action,payload={})=>ipcRenderer.invoke('scenic:request',action,payload)});
