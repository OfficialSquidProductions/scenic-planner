const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
module.exports=async({win,store,flush,report})=>{
 const js=s=>win.webContents.executeJavaScript(s);const checks=[];
 for(let i=0;i<100;i++){if(await js('window.scenicReady===true'))break;await new Promise(r=>setTimeout(r,100));}
 assert.equal(await js('window.scenicReady'),true);assert.equal(await js('!!window.ScenicWindows && !!window.ScenicDesktop'),true);checks.push('Bundled offline editor and isolated native storage bridge load');
 assert.equal(await js("document.querySelector('#scene-canvas').width>0"),true);
 await js("document.getElementById('settings-button').click();document.getElementById('show-changelog').click()");
 assert.equal(await js("document.getElementById('changelog').open"),true);
 assert.equal(await js('window.ScenicChangelog.version'),require('./package.json').version);
 assert.ok((await js("document.getElementById('changelog-entries').innerText")).includes('Current version'));
 assert.ok((await js("document.getElementById('changelog-entries').innerText")).includes('Previous release'));
 const notesPNG=await win.webContents.capturePage();fs.writeFileSync(path.join(path.dirname(report),'windows-changelog.png'),notesPNG.toPNG());
 await js("document.getElementById('close-changelog').click()");assert.equal(await js("document.getElementById('changelog').open"),false);
 checks.push('Offline changelog opens from Settings, matches the installed version, shows recent history, and closes');
 const initial=await js('workspaceData().projects.length');
 await js("document.getElementById('add-scene').click()");const scenes=await js('doc.scenes.length');assert.ok(scenes>1);
 await js("document.getElementById('undo').click()");assert.equal(await js('doc.scenes.length'),scenes-1);
 await js("document.getElementById('redo').click()");assert.equal(await js('doc.scenes.length'),scenes);checks.push('New scene, Undo and Redo');
 await js("document.getElementById('project-name').focus();document.getElementById('project-name').value='Windows verification';document.getElementById('project-name').dispatchEvent(new Event('input'));document.getElementById('project-name').dispatchEvent(new Event('change'))");
 assert.equal(await flush(),true);const saved=fs.readFileSync(store.current,'utf8');assert.ok(saved.includes('Windows verification'));assert.equal(JSON.parse(saved).projects.length,initial);checks.push('Workspace edits save atomically outside installation');
 await js("document.getElementById('theme').click()");const theme=await js('document.documentElement.dataset.theme');assert.ok(['light','dark'].includes(theme));await flush();
 await new Promise(resolve=>{win.webContents.once('did-finish-load',resolve);win.reload();});for(let i=0;i<100;i++){if(await js('window.scenicReady===true'))break;await new Promise(r=>setTimeout(r,100));}
 assert.equal(await js("document.getElementById('project-name').value"),'Windows verification');assert.equal(await js('document.documentElement.dataset.theme'),theme);checks.push('Workspace and appearance restored after reload');
 const beforeCrash=fs.readFileSync(store.current,'utf8');
 const reloaded=new Promise(resolve=>win.webContents.once('did-finish-load',resolve));
 win.webContents.forcefullyCrashRenderer();await reloaded;
 for(let i=0;i<100;i++){if(await js("window.scenicReady===true && document.getElementById('crash-report').open"))break;await new Promise(r=>setTimeout(r,100));}
 assert.equal(await js("document.getElementById('crash-report').open"),true);
 assert.equal(await js("document.getElementById('project-name').value"),'Windows verification');
 assert.equal(fs.readFileSync(store.current,'utf8'),beforeCrash);
 assert.match(await js("document.getElementById('crash-report-log').value"),/Editor process stopped/);
 assert.equal(await js("document.getElementById('crash-report-description').required"),true);
 await js("document.getElementById('crash-report-description').value='Synthetic renderer crash verification'");
 const crashPNG=await win.webContents.capturePage();fs.writeFileSync(path.join(path.dirname(report),'windows-crash-report.png'),crashPNG.toPNG());
 await js("document.getElementById('close-crash-report').click()");
 for(let i=0;i<100;i++){if(!(await js("window.ScenicDesktop.request('getCrashReport').then(report=>report.needsPrompt)")))break;await new Promise(r=>setTimeout(r,100));}
 assert.equal(await js("window.ScenicDesktop.request('getCrashReport').then(report=>report.needsPrompt)"),false);
 await js("document.getElementById('settings-button').click();document.getElementById('report-crash').click()");
 for(let i=0;i<100;i++){if(await js("document.getElementById('crash-report').open"))break;await new Promise(r=>setTimeout(r,100));}
 assert.equal(await js("document.getElementById('crash-report').open"),true);
 await js("document.getElementById('close-crash-report').click()");
 checks.push('Actual renderer crash reloads the saved workspace and prompts for description/log review; dismiss and Settings reopen work without sending email');
 await js("window.__originalFlush=window.scenicFlush;window.scenicFlush=async()=>{throw Error('test save failure')};void 0");assert.equal(await flush(),false);await js('window.scenicFlush=window.__originalFlush;void 0');assert.equal(await flush(),true);checks.push('Failed save blocks update/exit gate; retry succeeds');
 const before=fs.readFileSync(store.current,'utf8');await assert.rejects(js("window.ScenicDesktop.request('saveProject',{project:'invalid'})"));assert.equal(fs.readFileSync(store.current,'utf8'),before);checks.push('Invalid native save rejected without modifying workspace');
 assert.equal(await js("typeof window.require"),'undefined');assert.equal(win.webContents.getLastWebPreferences().contextIsolation,true);assert.equal(win.webContents.getLastWebPreferences().sandbox,true);checks.push('Renderer has no Node access, runs in sandbox and isolated context');
 const png=await win.webContents.capturePage();fs.writeFileSync(path.join(path.dirname(report),'windows.png'),png.toPNG());
 return {passed:true,platform:process.platform,version:require('./package.json').version,checks};
};
