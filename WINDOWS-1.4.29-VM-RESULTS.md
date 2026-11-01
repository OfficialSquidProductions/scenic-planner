# Scenic 1.4.29 Windows VM verification

Candidate 24a09c69af4b4a482cb0bb3f2c3ced39591c149b; GitHub run 41357595461. Installer SHA256 785c800fabfb254cb39ac6171cc890fbb053ca415e653c5f7410402e10c99dae matched the manually kept download. Windows 11 x64 native VM, isolated synthetic profiles only.

Installed and reinstalled smoke checks: 13 each passed. Native rapid object copy/paste, same-scene offset, undo/redo, rapid title copy/paste/focus change, unsupported text paste, camera subset copy across existing scenes, independent camera/mark/shot IDs, sidebar duplication/undo/redo and browser duplication passed. Secondary scene-browser copy/paste retained standard text behavior. Save/reopen preserved six scenes with images, groups, marks and links. Quit with the browser open produced no exception. Reinstall preserved the workspace hash and relaunch restored the scenes.

Native CSV picker and numbered CSV preview/reimport passed: nine populated scenes, seventeen shots, zero duplicates; all metadata, checked coverage, camera links and embedded floor retained. A misgrouped legacy fixture rejected the unsafe merge with new-production guidance and retained its original maps. Lettered shot fixture imported four shots into three populated scenes with explicit Scene fallback. Installed editor CSV export/reimport retained metadata. Shared numbering, reimport, project exchange, floor, clipboard and scene-browser regression tests passed.

Initial 1.4.28 native testing exposed a delayed clipboard-focus fallback and an Object has been destroyed exception during quit with Browse all scenes open. Changes are restricted to Windows native clipboard/menu and window lifecycle code plus tests/version/release metadata; no shared renderer implementation or Mac/Apple binary changed.

Publication preserves the exact six Mac v1.4.27 assets recorded in desktop/windows-publication.json. Existing Mac/iOS App Store 1.4.26 (32) submissions do not contain the newer object clipboard/scene duplication features.
