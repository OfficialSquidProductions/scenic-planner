#!/usr/bin/env python3
"""Create the self-contained Windows x64 NSIS installer on Windows."""
import json, pathlib, subprocess, sys
ROOT=pathlib.Path(__file__).resolve().parents[1]
if sys.platform!='win32':raise SystemExit('Use a Windows x64 machine or the Windows GitHub Actions workflow.')
from PIL import Image
config=json.loads((ROOT/'desktop/release.json').read_text());p=ROOT/'windows/package.json';package=json.loads(p.read_text());package['version']=config['version'];p.write_text(json.dumps(package,indent=2)+'\n')
assets=ROOT/'windows/assets';assets.mkdir(exist_ok=True)
logo=Image.open(ROOT/'dist/assets/sp-blue.png').convert('RGBA');logo.thumbnail((256,256));logo.save(assets/'icon.ico',sizes=[(16,16),(32,32),(48,48),(64,64),(128,128),(256,256)])
subprocess.run(['npm.cmd','ci'],cwd=ROOT/'windows',check=True)
subprocess.run(['npm.cmd','run','dist'],cwd=ROOT/'windows',check=True)
