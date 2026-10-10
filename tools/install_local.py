#!/usr/bin/env python3
"""Install or safely update the verified bundle, preserving project data."""
from pathlib import Path
import argparse,plistlib,shutil,subprocess,uuid
args=argparse.ArgumentParser()
args.add_argument('--update',action='store_true',help='Replace an existing Scenic app and retain its previous bundle.')
options=args.parse_args()
root=Path(__file__).resolve().parent.parent
source=root/'release/Scenic.app'
parent=Path.home()/'Applications'
destination=parent/'Scenic.app'
identity='org.squidproductions.scenic'
def valid(path):
    try:return plistlib.loads((path/'Contents/Info.plist').read_bytes()).get('CFBundleIdentifier')==identity
    except (OSError,ValueError):return False
if not valid(source):raise SystemExit('The Scenic app bundle is missing or invalid.')
if parent.is_symlink() or destination.is_symlink():raise SystemExit('Refusing to install into a symbolic link.')
if destination.exists():
    if not options.update:raise SystemExit('Scenic is already installed. Close it and use --update to replace it.')
    if not valid(destination):raise SystemExit('Refusing to replace an unrelated application.')
    running=subprocess.run(['pgrep','-f',str(destination/'Contents/MacOS/Scenic')],capture_output=True)
    if running.returncode==0:raise SystemExit('Close Scenic before updating, so it can save pending edits.')
    if running.returncode!=1:raise SystemExit('Could not determine whether Scenic is running.')
subprocess.run(['codesign','--verify','--deep','--strict',str(source)],check=True)
parent.mkdir(exist_ok=True)
staging=parent/('.Scenic-install-'+str(uuid.uuid4())+'.app')
previous=None
try:
    shutil.copytree(source,staging,symlinks=True)
    subprocess.run(['codesign','--verify','--deep','--strict',str(staging)],check=True)
    if destination.exists():
        backup=root/'.cache'/('Scenic-previous-'+str(uuid.uuid4())+'.app')
        backup.parent.mkdir(exist_ok=True)
        shutil.copytree(destination,backup,symlinks=True)
        previous=parent/('.Scenic-replaced-'+str(uuid.uuid4())+'.app')
        destination.rename(previous)
    try:staging.rename(destination)
    except BaseException:
        if previous:previous.rename(destination)
        raise
    if previous:shutil.rmtree(previous)
finally:
    if staging.exists():shutil.rmtree(staging)
print('Installed:',destination)
