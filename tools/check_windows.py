#!/usr/bin/env python3
"""Test the packaged app, installer, installed copy, and a preserving reinstall."""
import hashlib,json,os,pathlib,subprocess,tempfile,time
ROOT=pathlib.Path(__file__).resolve().parents[1];OUT=ROOT/'release/windows-verification';OUT.mkdir(parents=True,exist_ok=True)
metadata=json.loads(subprocess.check_output(['node','-e',"const fs=require('node:fs'),yaml=require('./windows/node_modules/js-yaml');process.stdout.write(JSON.stringify(yaml.load(fs.readFileSync('release/windows/latest.yml','utf8'))));"],cwd=ROOT,text=True))
config=json.loads((ROOT/'desktop/release.json').read_text())
assert metadata['version']==config['version']
assert metadata['releaseNotes']==(ROOT/'desktop/release-notes.txt').read_text(encoding='utf-8'), 'Windows update metadata must contain this release’s notes'
print('Windows update metadata: version and release notes verified',flush=True)
def smoke(exe,label):
 report=OUT/(label+'.json');result=subprocess.run([str(exe),'--smoke-test',str(report)],timeout=120)
 if result.returncode:
  if report.exists():print(report.read_text(),flush=True)
  result.check_returncode()
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
