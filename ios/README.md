# Scenic for iPhone and iPad

The iOS beta version 1.4.21 (26) supports iPhone and iPad on iOS/iPadOS 17+. Open `ios/Scenic.xcodeproj` from the repository root, scheme **Scenic iPad**. The scheme name and bundle ID `org.squidproductions.scenic.ipad` preserve the existing beta identity and workspaces.

Run `python3 ios/prepare.py` after shared editor changes. It regenerates the self-contained project, Info.plist, privacy manifest, and bundled web resources from `dist`. Build outputs are ignored. The UIKit/WKWebView shell uses system frameworks and offline resources. Native storage preserves current/previous workspace recovery.

Run JavaScript suites with `node tests/<suite>.cjs`. Run UI tests with `xcodebuild -project ios/Scenic.xcodeproj -scheme 'Scenic iPad' -destination 'platform=iOS Simulator,name=iPhone 17 Pro' CODE_SIGNING_ALLOWED=NO test`; repeat on an iPad simulator. Tests exercise synthetic data, touch/keyboard editing, rotation, native Files and Share, and distinct-copy import. Debug-only `--portable-smoke-test` writes a cross-platform result and portable export in the simulator's private Scenic folder; use a disposable simulator. Release ignores these flags.

Archive the scheme for generic iOS with the existing team, distribution certificate and app-specific profile. Use a fresh version/build verified against App Store Connect. Internal TestFlight distribution uses only the established owner group; public/external beta and App Store release are separate actions. Never commit credentials or provisioning profiles.

See [portable format and verification](../PORTABLE-PROJECTS.md). Physical sharing providers, AirDrop, large image-heavy productions, Pencil/hardware input, low-memory stress and a full VoiceOver audit remain physical-device QA items.


## Temporary TestFlight demo and iPad panels

Load Demo appears under Productions and works offline on every bundled editor. It creates a separate **DEMO · The Last Cue** production with a fictional original script in Scene notes, two adult characters with blocking marks, a 24 × 20 ft rehearsal floor, a desk, chair, notebook, practical lamp, stage wash and four cameras linked to four shots. Repeating Load Demo reopens the existing demo and retains edits; deleting it permits a fresh copy. Normal undo, editing and `.scenic` import/export remain available.

Before public launch, set `enabled=false` in `dist/demo.js` and run `python3 ios/prepare.py` (and normal desktop packaging). This hides the Load Demo action without deleting any user-created demo edits. The standalone demo factory and Load Demo UI can then be removed together. It never loads automatically or replaces personal productions.

On iPad, Scenes immediately precedes Scene map and Shot list. Scenes, Items and Properties expose their expanded state and use a checked fill when visible, with an outlined available state when hidden. The device-local Settings checkbox **Keep Scenes and Items on the left in landscape** defaults on and persists separately from portable project settings. It applies to landscape iPad windows; portrait iPad and iPhone retain temporary drawers. Selecting tools keeps docked panels visible. Each docked section can be hidden independently; rotating back to landscape restores both when the preference is on.
