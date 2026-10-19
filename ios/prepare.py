#!/usr/bin/env python3
"""Regenerate a self-contained, dependency-free Xcode project from this snapshot."""
from pathlib import Path
import json, plistlib, shutil, subprocess

root = Path(__file__).resolve().parent
resources = root / 'Resources'
resources.mkdir(exist_ok=True)
web = resources / 'web'
if web.exists(): shutil.rmtree(web)
shutil.copytree(root.parent / 'dist', web)
# The desktop branding files are 16 MB each. Resize bundle copies, retaining source bytes.
for path in (web / 'assets').glob('*.png'):
    subprocess.run(['sips', '-Z', '1024', str(path)], check=True, stdout=subprocess.DEVNULL)
info = {
    'CFBundleIdentifier':'$(PRODUCT_BUNDLE_IDENTIFIER)','CFBundleExecutable':'$(EXECUTABLE_NAME)',
    'CFBundleName':'Scenic','CFBundleDisplayName':'Scenic','CFBundlePackageType':'APPL',
    'CFBundleShortVersionString':'$(MARKETING_VERSION)','CFBundleVersion':'$(CURRENT_PROJECT_VERSION)',
    'LSRequiresIPhoneOS':True,'UILaunchScreen':{},'UIApplicationSupportsIndirectInputEvents':True,
    'UISupportedInterfaceOrientations~ipad':['UIInterfaceOrientationPortrait','UIInterfaceOrientationPortraitUpsideDown','UIInterfaceOrientationLandscapeLeft','UIInterfaceOrientationLandscapeRight'],
    'UISupportedInterfaceOrientations':['UIInterfaceOrientationPortrait','UIInterfaceOrientationLandscapeLeft','UIInterfaceOrientationLandscapeRight'],
    'UIApplicationSceneManifest':{'UIApplicationSupportsMultipleScenes':False,'UISceneConfigurations':{'UIWindowSceneSessionRoleApplication':[{'UISceneConfigurationName':'Scenic','UISceneDelegateClass':'$(PRODUCT_MODULE_NAME).ScenicSceneDelegate'}]}},
    'ITSAppUsesNonExemptEncryption':False,
    'CFBundleDocumentTypes':[{'CFBundleTypeName':'Scenic Project','CFBundleTypeRole':'Editor','LSHandlerRank':'Owner','LSItemContentTypes':['org.squidproductions.scenic.project']}],
    'UTExportedTypeDeclarations':[{'UTTypeIdentifier':'org.squidproductions.scenic.project','UTTypeDescription':'Scenic Project','UTTypeConformsTo':['public.json'],'UTTypeTagSpecification':{'public.filename-extension':['scenic'],'public.mime-type':'application/vnd.squidproductions.scenic+json'}}],
    'LSSupportsOpeningDocumentsInPlace':False,
    'NSHumanReadableCopyright':'Scenic · A Squid Productions™ Software · MIT licensed'
}
(root / 'Info.plist').write_bytes(plistlib.dumps(info))
privacy={'NSPrivacyTracking':False,'NSPrivacyCollectedDataTypes':[],'NSPrivacyAccessedAPITypes':[]}
(resources / 'PrivacyInfo.xcprivacy').write_bytes(plistlib.dumps(privacy))
shutil.copy2(root.parent/'LICENSE',resources/'LICENSE.txt')
project=root/'Scenic.xcodeproj';project.mkdir(exist_ok=True)
objects={}
def obj(key, value): objects[key]=value;return key
def ident(n):return f'{n:024X}'
sources=[];children=[];resource_builds=[]
for index,name in enumerate(['ScenicIPad.swift','WorkspaceStore.swift','Diagnostics.swift']):
 f=ident(10+index);b=ident(20+index);obj(f,f'isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = {name}; sourceTree = "<group>";');obj(b,f'isa = PBXBuildFile; fileRef = {f};');sources.append(b);children.append(f)
for index,(name,typ) in enumerate([('web','folder'),('PrivacyInfo.xcprivacy','text.xml'),('LICENSE.txt','text'),('smoke.js','sourcecode.javascript'),('portable-smoke.js','sourcecode.javascript'),('palette-smoke.js','sourcecode.javascript'),('desktop-fixture.scenic','text.json'),('Assets.xcassets','folder.assetcatalog')]):
 f=ident(30+index);b=ident(40+index);obj(f,f'isa = PBXFileReference; lastKnownFileType = {typ}; path = Resources/{name}; sourceTree = "<group>";');obj(b,f'isa = PBXBuildFile; fileRef = {f};');children.append(f);resource_builds.append(b)
product=ident(50);group=ident(51);products=ident(52);target=ident(53);proj=ident(54);source_phase=ident(55);res_phase=ident(56);framework_phase=ident(57)
obj(product,'isa = PBXFileReference; explicitFileType = wrapper.application; includeInIndex = 0; path = Scenic.app; sourceTree = BUILT_PRODUCTS_DIR;')
obj(group,f'isa = PBXGroup; children = ({",".join(children)},{products}); sourceTree = "<group>";')
obj(products,f'isa = PBXGroup; children = ({product}); name = Products; sourceTree = "<group>";')
obj(source_phase,f'isa = PBXSourcesBuildPhase; buildActionMask = 2147483647; files = ({",".join(sources)}); runOnlyForDeploymentPostprocessing = 0;')
obj(res_phase,f'isa = PBXResourcesBuildPhase; buildActionMask = 2147483647; files = ({",".join(resource_builds)}); runOnlyForDeploymentPostprocessing = 0;')
obj(framework_phase,'isa = PBXFrameworksBuildPhase; buildActionMask = 2147483647; files = (); runOnlyForDeploymentPostprocessing = 0;')
proj_list=ident(60);target_list=ident(61)
obj(target,f'isa = PBXNativeTarget; buildConfigurationList = {target_list}; buildPhases = ({source_phase},{framework_phase},{res_phase}); buildRules = (); dependencies = (); name = "Scenic iPad"; productName = Scenic; productReference = {product}; productType = "com.apple.product-type.application";')
obj(proj,f'isa = PBXProject; attributes = {{BuildIndependentTargetsInParallel = YES; LastUpgradeCheck = 2600;}}; buildConfigurationList = {proj_list}; compatibilityVersion = "Xcode 14.0"; developmentRegion = en; hasScannedForEncodings = 0; knownRegions = (en,Base); mainGroup = {group}; productRefGroup = {products}; projectDirPath = ""; projectRoot = ""; targets = ({target});')
for list_key,offset,is_target in [(proj_list,70,False),(target_list,80,True)]:
 keys=[]
 for index,config in enumerate(['Debug','Release']):
  key=ident(offset+index);keys.append(key)
  settings={'SDKROOT':'iphoneos','IPHONEOS_DEPLOYMENT_TARGET':'17.0','SWIFT_VERSION':'5.0','CLANG_ENABLE_MODULES':'YES'}
  if is_target:
   settings.update({'PRODUCT_NAME':'Scenic','PRODUCT_MODULE_NAME':'ScenicIPad','PRODUCT_BUNDLE_IDENTIFIER':'org.squidproductions.scenic.ipad','INFOPLIST_FILE':'Info.plist','MARKETING_VERSION':'1.4.21','CURRENT_PROJECT_VERSION':'26','TARGETED_DEVICE_FAMILY':'1,2','SUPPORTED_PLATFORMS':'iphoneos iphonesimulator','SUPPORTS_MACCATALYST':'NO','SUPPORTS_MAC_DESIGNED_FOR_IPHONE_IPAD':'NO','SUPPORTS_XR_DESIGNED_FOR_IPHONE_IPAD':'NO','CODE_SIGN_STYLE':'Automatic','ASSETCATALOG_COMPILER_APPICON_NAME':'AppIcon','SWIFT_EMIT_LOC_STRINGS':'YES'})
  settings.update({'SWIFT_OPTIMIZATION_LEVEL':'-Onone' if config=='Debug' else '-O','DEBUG_INFORMATION_FORMAT':'dwarf' if config=='Debug' else 'dwarf-with-dsym','ENABLE_TESTABILITY':'YES' if config=='Debug' else 'NO','SWIFT_ACTIVE_COMPILATION_CONDITIONS':'DEBUG' if config=='Debug' else ''})
  text=' '.join(f'{k} = "{v}";' for k,v in settings.items());obj(key,f'isa = XCBuildConfiguration; buildSettings = {{{text}}}; name = {config};')
 obj(list_key,f'isa = XCConfigurationList; buildConfigurations = ({",".join(keys)}); defaultConfigurationIsVisible = 0; defaultConfigurationName = Release;')
# A small UI suite checks native Files sheets and iPad orientation through XCTest.
ui=ident(100);ui_source=ident(101);ui_build=ident(102);ui_product=ident(103);ui_phase=ident(104);ui_list=ident(105);ui_dependency=ident(106);ui_proxy=ident(107)
obj(ui_source,'isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = Tests/ScenicUITests.swift; sourceTree = "<group>";')
obj(ui_build,f'isa = PBXBuildFile; fileRef = {ui_source};')
obj(ui_product,'isa = PBXFileReference; explicitFileType = wrapper.cfbundle; includeInIndex = 0; path = ScenicUITests.xctest; sourceTree = BUILT_PRODUCTS_DIR;')
objects[group]=objects[group].replace('children = (',f'children = ({ui_source},')
objects[products]=objects[products].replace('children = (',f'children = ({ui_product},')
objects[proj]=objects[proj].replace(f'targets = ({target});',f'targets = ({target},{ui});')
obj(ui_phase,f'isa = PBXSourcesBuildPhase; buildActionMask = 2147483647; files = ({ui_build}); runOnlyForDeploymentPostprocessing = 0;')
obj(ui_proxy,f'isa = PBXContainerItemProxy; containerPortal = {proj}; proxyType = 1; remoteGlobalIDString = {target}; remoteInfo = "Scenic iPad";')
obj(ui_dependency,f'isa = PBXTargetDependency; target = {target}; targetProxy = {ui_proxy};')
obj(ui,f'isa = PBXNativeTarget; buildConfigurationList = {ui_list}; buildPhases = ({ui_phase}); buildRules = (); dependencies = ({ui_dependency}); name = ScenicUITests; productName = ScenicUITests; productReference = {ui_product}; productType = "com.apple.product-type.bundle.ui-testing";')
ui_configs=[]
for i,config in enumerate(['Debug','Release']):
 key=ident(110+i);ui_configs.append(key)
 obj(key,f'isa = XCBuildConfiguration; buildSettings = {{SDKROOT = iphoneos; IPHONEOS_DEPLOYMENT_TARGET = 17.0; SWIFT_VERSION = 5.0; PRODUCT_NAME = ScenicUITests; PRODUCT_BUNDLE_IDENTIFIER = org.squidproductions.scenic.ipad.uitests; GENERATE_INFOPLIST_FILE = YES; TARGETED_DEVICE_FAMILY = "1,2"; TEST_TARGET_NAME = "Scenic iPad"; CODE_SIGN_STYLE = Automatic;}}; name = {config};')
obj(ui_list,f'isa = XCConfigurationList; buildConfigurations = ({",".join(ui_configs)}); defaultConfigurationIsVisible = 0; defaultConfigurationName = Release;')

body='\n'.join(f'{k} = {{{v}}};' for k,v in objects.items())
(project/'project.pbxproj').write_text('// !$*UTF8*$!\n{archiveVersion=1;classes={};objectVersion=56;objects={\n'+body+'\n};rootObject='+proj+';}\n')
schemes=project/'xcshareddata'/'xcschemes';schemes.mkdir(parents=True,exist_ok=True)
(schemes/'Scenic iPad.xcscheme').write_text(f'''<?xml version="1.0" encoding="UTF-8"?>
<Scheme LastUpgradeVersion="2600" version="1.3"><BuildAction parallelizeBuildables="YES" buildImplicitDependencies="YES"><BuildActionEntries><BuildActionEntry buildForTesting="YES" buildForRunning="YES" buildForProfiling="YES" buildForArchiving="YES" buildForAnalyzing="YES"><BuildableReference BuildableIdentifier="primary" BlueprintIdentifier="{target}" BuildableName="Scenic.app" BlueprintName="Scenic iPad" ReferencedContainer="container:Scenic.xcodeproj"/></BuildActionEntry></BuildActionEntries></BuildAction><TestAction buildConfiguration="Debug" selectedDebuggerIdentifier="Xcode.DebuggerFoundation.Debugger.LLDB" selectedLauncherIdentifier="Xcode.IDEFoundation.Launcher.LLDB" shouldUseLaunchSchemeArgsEnv="YES"><Testables><TestableReference skipped="NO"><BuildableReference BuildableIdentifier="primary" BlueprintIdentifier="{ui}" BuildableName="ScenicUITests.xctest" BlueprintName="ScenicUITests" ReferencedContainer="container:Scenic.xcodeproj"/></TestableReference></Testables></TestAction><LaunchAction buildConfiguration="Debug" selectedDebuggerIdentifier="Xcode.DebuggerFoundation.Debugger.LLDB" selectedLauncherIdentifier="Xcode.IDEFoundation.Launcher.LLDB" launchStyle="0" useCustomWorkingDirectory="NO" ignoresPersistentStateOnLaunch="NO" debugDocumentVersioning="YES" debugServiceExtension="internal" allowLocationSimulation="YES"><BuildableProductRunnable runnableDebuggingMode="0"><BuildableReference BuildableIdentifier="primary" BlueprintIdentifier="{target}" BuildableName="Scenic.app" BlueprintName="Scenic iPad" ReferencedContainer="container:Scenic.xcodeproj"/></BuildableProductRunnable></LaunchAction><ProfileAction buildConfiguration="Release" shouldUseLaunchSchemeArgsEnv="YES" savedToolIdentifier="" useCustomWorkingDirectory="NO" debugDocumentVersioning="YES"/><AnalyzeAction buildConfiguration="Debug"/><ArchiveAction buildConfiguration="Release" revealArchiveInOrganizer="YES"/></Scheme>''')
print(project)
