#!/usr/bin/env python3
"""Test the packaged app, installer, installed copy, and a preserving reinstall."""
import hashlib,json,os,pathlib,subprocess,tempfile,time
ROOT=pathlib.Path(__file__).resolve().parents[1];OUT=ROOT/'release/windows-verification';OUT.mkdir(parents=True,exist_ok=True)
def smoke(exe,label):
 report=OUT/(label+'.json');subprocess.run([str(exe),'--smoke-test',str(report)],check=True,timeout=120)
 result=json.loads(report.read_text());assert result['passed'],result;print(label+': passed',flush=True)
exe=ROOT/'release/windows/win-unpacked/Scenic.exe';smoke(exe,'packaged')
installer=ROOT/'release/windows/Scenic-Windows-Setup.exe'
with tempfile.TemporaryDirectory(prefix='scenic-install-') as tmp:
 target=pathlib.Path(tmp)/'Scenic';subprocess.run([str(installer),'/S','/D='+str(target)],check=True,timeout=180)
 installed=target/'Scenic.exe';assert installed.exists();smoke(installed,'installed')
 data=OUT/'test-data/workspace.json';before=hashlib.sha256(data.read_bytes()).hexdigest()
 subprocess.run([str(installer),'/S','/D='+str(target)],check=True,timeout=180)
 assert hashlib.sha256(data.read_bytes()).hexdigest()==before;smoke(installed,'reinstalled')
 (OUT/'installer.json').write_text(json.dumps({'passed':True,'silentInstall':True,'reinstallPreservesWorkspace':True,'sha256':hashlib.sha256(installer.read_bytes()).hexdigest()},indent=2))
