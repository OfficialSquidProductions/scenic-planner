const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('ScenicWindows',{request:(action,payload={})=>ipcRenderer.invoke('scenic:request',action,payload)});
