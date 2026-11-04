#!/usr/bin/env python3
"""Local, side-by-side Scenic Feature Test. No updater, uploads or file associations."""
import argparse, hashlib, json, pathlib, plistlib, shutil, subprocess
ROOT=pathlib.Path(__file__).resolve().parent.parent

def run(*args):
    subprocess.run([str(a) for a in args],check=True)

def build(out):
    out=out.resolve()
    if out.exists():raise ValueError('Use a new output directory; earlier test builds are preserved.')
    out.mkdir(parents=True)
    app=out/'Scenic Feature Test.app';contents=app/'Contents';res=contents/'Resources';mac=contents/'MacOS';res.mkdir(parents=True);mac.mkdir()
    cache=out/'build';cache.mkdir()
    source=(ROOT/'macos/Scenic.swift').read_text()
    source=source.replace('appendingPathComponent("Scenic", isDirectory: true)','appendingPathComponent("Scenic Feature Test", isDirectory: true)')
    source=source.replace('"Scenic · Squid Productions"','"Scenic Feature Test · Isolated workspace"').replace('submenu("Scenic")','submenu("Scenic Feature Test")')
    source=source.replace('"About Scenic"','"About Scenic Feature Test"').replace('"Quit Scenic"','"Quit Scenic Feature Test"').replace('"Hide Scenic"','"Hide Scenic Feature Test"')
    source=source.replace('.applicationName: "Scenic"','.applicationName: "Scenic Feature Test"').replace('"ScenicMainWindow"','"ScenicFeatureTestMainWindow"').replace('"ScenicSceneBrowserWindow"','"ScenicFeatureTestSceneBrowserWindow"')
    native=cache/'ScenicFeatureTest.swift';native.write_text(source)
    stub=cache/'UpdatesDisabled.swift';stub.write_text('''import AppKit
final class ScenicUpdates {
 weak var window:NSWindow?
 var saveWorkspace:((@escaping(Bool)->Void)->Void)?
 func start() {}
 func addMenuItems(to menu:NSMenu){let item=menu.addItem(withTitle:"Feature test · automatic updates disabled",action:nil,keyEquivalent:"");item.isEnabled=false}
}
''')
    for arch in ['arm64','x86_64']:
        run('swiftc','-O','-module-cache-path',cache/'swift','-target',arch+'-apple-macos13.3',native,stub,ROOT/'macos/Reports.swift',ROOT/'macos/ObjectClipboard.swift',ROOT/'macos/ScenePNGExport.swift','-o',cache/('Scenic-'+arch))
    run('lipo','-create',cache/'Scenic-arm64',cache/'Scenic-x86_64','-output',mac/'ScenicFeatureTest')
    shutil.copytree(ROOT/'dist',res/'web');shutil.copy2(ROOT/'LICENSE',res/'Scenic-LICENSE.txt')
    shutil.copy2(ROOT/'desktop/changelog.json',res/'Scenic-Changelog.json')
    html=res/'web/index.html';text=html.read_text().replace('<title>Scenic · Squid Productions</title>','<title>Scenic Feature Test</title>').replace('<body>','<body data-feature-test="true">')
    # Visible identity without replacing production branding or project content.
    text=text.replace('Set the scene. Shape the light.','FEATURE TEST · Isolated autosave · Unpublished')
    html.write_text(text)
    plist={'CFBundleExecutable':'ScenicFeatureTest','CFBundleIdentifier':'org.squidproductions.scenic.feature-test','CFBundleName':'Scenic Feature Test','CFBundleDisplayName':'Scenic Feature Test','CFBundlePackageType':'APPL','CFBundleShortVersionString':'1.4.32','CFBundleVersion':'1','LSMinimumSystemVersion':'13.3','NSHighResolutionCapable':True,'NSPrincipalClass':'NSApplication','NSHumanReadableCopyright':'Scenic Feature Test · Squid Productions'}
    (contents/'Info.plist').write_bytes(plistlib.dumps(plist))
    run('codesign','--force','--sign','-','--timestamp=none',app);run('codesign','--verify','--deep','--strict',app)
    run(mac/'ScenicFeatureTest','--storage-test')
    manifest={'app':str(app),'bundleId':plist['CFBundleIdentifier'],'workspace':'~/Library/Application Support/Scenic Feature Test','updater':False,'fileAssociations':False,'sourceCommit':subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),'resourceSHA256':{str(p.relative_to(res/'web')):hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted((res/'web').rglob('*')) if p.is_file()}}
    (out/'build-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n');print(app)
if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--output',type=pathlib.Path,required=True);build(parser.parse_args().output)
