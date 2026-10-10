#!/usr/bin/env python3
"""Build Scenic.app from local assets using Apple's system frameworks. No web server."""
import pathlib, plistlib, shutil, subprocess, argparse
from macos_updates import release_config, sparkle_distribution, updater_plist, build_update_release
ROOT=pathlib.Path(__file__).resolve().parent.parent
OUT=ROOT/'release'
CACHE=ROOT/'.cache'

def run(*args):
    subprocess.run([str(a) for a in args],check=True)

def build(dmg, update=False):
    config=release_config();sparkle=sparkle_distribution(config)
    OUT.mkdir(exist_ok=True);CACHE.mkdir(exist_ok=True)
    destination=OUT/'Scenic.app'
    app=CACHE/'build-Scenic.app'
    if app.exists():shutil.rmtree(app)
    if destination.exists():
        info=plistlib.loads((destination/'Contents/Info.plist').read_bytes())
        if info.get('CFBundleIdentifier')!='org.squidproductions.scenic':raise RuntimeError('Refusing to replace unrelated app')
    contents=app/'Contents';res=contents/'Resources';mac=contents/'MacOS'
    res.mkdir(parents=True);mac.mkdir()
    frameworks=contents/'Frameworks';frameworks.mkdir()
    shutil.copytree(sparkle/'Sparkle.framework',frameworks/'Sparkle.framework',symlinks=True)
    shutil.copy2(sparkle/'LICENSE',res/'Sparkle-LICENSE.txt')
    shutil.copy2(ROOT/'LICENSE',res/'Scenic-LICENSE.txt')
    for arch in ['arm64','x86_64']:
        run('swiftc','-O','-module-cache-path',CACHE/'swift','-target',arch+'-apple-macos13.3','-F',frameworks,'-framework','Sparkle','-Xlinker','-rpath','-Xlinker','@executable_path/../Frameworks',ROOT/'macos/Scenic.swift',ROOT/'macos/Updates.swift','-o',CACHE/('Scenic-'+arch))
    run('lipo','-create',CACHE/'Scenic-arm64',CACHE/'Scenic-x86_64','-output',mac/'Scenic')
    shutil.copytree(ROOT/'dist',res/'web')
    run('swiftc','-module-cache-path',CACHE/'swift',ROOT/'macos/Icon.swift','-o',CACHE/'render-icon')
    run(CACHE/'render-icon',CACHE/'Scenic.iconset',ROOT/'dist/assets/sp-blue.png')
    run('iconutil','-c','icns',CACHE/'Scenic.iconset','-o',res/'ScenicBlue.icns')
    info={'CFBundleExecutable':'Scenic','CFBundleIdentifier':'org.squidproductions.scenic','CFBundleName':'Scenic','CFBundleDisplayName':'Scenic','CFBundlePackageType':'APPL','CFBundleShortVersionString':config['version'],'CFBundleVersion':config['build'],'CFBundleIconFile':'ScenicBlue.icns','LSMinimumSystemVersion':'13.3','NSHighResolutionCapable':True,'NSPrincipalClass':'NSApplication','NSHumanReadableCopyright':'Scenic · A Squid Production™ Software','LSApplicationCategoryType':'public.app-category.productivity',**updater_plist(config)}
    (contents/'Info.plist').write_bytes(plistlib.dumps(info))
    (res/'READ ME.txt').write_text('SCENIC FOR MAC\n\nOpen Scenic.app. You can move it into Applications or drag it to your Dock.\nNo internet, account, browser, Python, or server is required.\nRequires macOS 13.3 or newer. Apple Silicon and Intel are supported.\n\nProjects autosave in ~/Library/Application Support/Scenic/workspace.json.\nA previous autosave is retained as workspace.previous.json.\nFile > Save Project As exports a portable .scenic backup including reference images.\nFile > Open Project restores a backup or a project exported from the web version.\nUse File > Export Map for PNG, and Shot list > Export CSV for camera setups.\n\nThis build is locally signed for this Mac and is not Apple-notarized for public distribution.\nCommercial fonts are used only if locally installed and are not redistributed.\n')
    run('codesign','--force','--deep','--sign','-','--timestamp=none',app)
    run('codesign','--verify','--deep','--strict',app)
    run(mac/'Scenic','--storage-test')
    run('lipo','-info',mac/'Scenic')
    if destination.exists():shutil.rmtree(destination)
    shutil.move(app,destination);app=destination;res=app/'Contents/Resources'
    if dmg:
        stage=CACHE/'dmg-stage'
        if stage.exists():shutil.rmtree(stage)
        stage.mkdir();shutil.copytree(app,stage/'Scenic.app',symlinks=True);(stage/'Applications').symlink_to('/Applications',target_is_directory=True)
        run('codesign','--verify','--deep','--strict',stage/'Scenic.app')
        shutil.copy2(res/'READ ME.txt',stage/'Read me.txt')
        run('hdiutil','create','-ov','-volname','Scenic','-srcfolder',stage,'-format','UDZO',OUT/'Scenic-Mac.dmg')
        run('hdiutil','verify',OUT/'Scenic-Mac.dmg')
    if update:build_update_release(app,config)
    print('Ready:',app)

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--no-dmg',action='store_true');p.add_argument('--update-release',action='store_true');a=p.parse_args();build(not a.no_dmg,a.update_release)
