#!/usr/bin/env python3
"""Local, side-by-side Scenic Feature Test. No updater, uploads or file associations."""
import argparse, hashlib, json, pathlib, plistlib, shutil, subprocess
ROOT=pathlib.Path(__file__).resolve().parent.parent

def run(*args):
    subprocess.run([str(a) for a in args],check=True)

def build(out,build_number=1):
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
    notes=[{'version':'1.4.32 Feature Test '+str(build_number),'changes':['Unpublished local test with isolated autosave and no automatic updates.','Lighting Flags: flex fills, negative fill, reversible bounce board and diffusion kit.','Fixture barn-door diagrams, per-shot lighting plans and labeled shot PDF exports.','Editable curved walls, shaped floor outlines and incident sun direction arrows.']}];(res/'Scenic-Changelog.json').write_text(json.dumps(notes))
    (res/'web/changelog.js').write_text('window.ScenicChangelog='+json.dumps({'version':'1.4.32 Feature Test '+str(build_number),'entries':notes})+';')
    html=res/'web/index.html';text=html.read_text().replace('<title>Scenic · Squid Productions</title>','<title>Scenic Feature Test</title>').replace('<body>','<body data-feature-test="true">')
    # Visible identity without replacing production branding or project content.
    text=text.replace('Set the scene. Shape the light.','FEATURE TEST · Isolated autosave · Unpublished')
    html.write_text(text)
    plist={'CFBundleExecutable':'ScenicFeatureTest','CFBundleIdentifier':'org.squidproductions.scenic.feature-test','CFBundleName':'Scenic Feature Test','CFBundleDisplayName':'Scenic Feature Test','CFBundlePackageType':'APPL','CFBundleShortVersionString':'1.4.32','CFBundleVersion':str(build_number),'LSMinimumSystemVersion':'13.3','NSHighResolutionCapable':True,'NSPrincipalClass':'NSApplication','NSHumanReadableCopyright':'Scenic Feature Test · Squid Productions'}
    (contents/'Info.plist').write_bytes(plistlib.dumps(plist))
    (out/'START HERE.txt').write_text('SCENIC FEATURE TEST '+str(build_number)+'\n\nOpen Scenic Feature Test.app in this folder. This is an unpublished local test, with no automatic updater or .scenic file association. Production Scenic is not replaced.\n\nAutosaves: ~/Library/Application Support/Scenic Feature Test/\nProduction Scenic autosaves remain in ~/Library/Application Support/Scenic/.\nThe test starts empty. Use Import project to load an editable COPY of a .scenic backup; import does not overwrite the source file or production workspace. Save edited test files under new names. New feature files use portable format 2, which older Scenic rejects instead of silently flattening shot lighting or geometry. Old format 1 files remain readable. Copies containing new geometry/modifiers use clipboard format 2; older Scenic declines them rather than silently flattening the new tools.\n\nLights library > Flags has all modifier options. Fixture Properties has barn-door controls. Deselect objects and enable Separate lighting per shot in Scene properties; choose a camera, Shot List row or the layout selector above the map. Shared lighting seeds new variants; edits to shared lighting do not replace existing variants. Disable restores shared lighting and retains variants. Export selected shot produces a labeled PNG; Export all shots produces a scene-shot PDF.\n\nWalls/Floor > Draw a curved wall, then edit its endpoint/bend handles. Select a floor > Edit outline for corners, edges and center anchor. Moving object bodies moves the entire shape.\n\nThis local build is ad-hoc signed, not a notarized public release. Native Windows and iPhone/iPad acceptance tests for these new features remain outstanding.\n')
    run('codesign','--force','--sign','-','--timestamp=none',app);run('codesign','--verify','--deep','--strict',app)
    run(mac/'ScenicFeatureTest','--storage-test')
    manifest={'app':str(app),'bundleId':plist['CFBundleIdentifier'],'workspace':'~/Library/Application Support/Scenic Feature Test','updater':False,'fileAssociations':False,'sourceCommit':subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),'resourceSHA256':{str(p.relative_to(res/'web')):hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted((res/'web').rglob('*')) if p.is_file()}}
    (out/'build-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n');print(app)
if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--output',type=pathlib.Path,required=True);parser.add_argument('--build',type=int,default=1);args=parser.parse_args();assert args.build>0;build(args.output,args.build)
