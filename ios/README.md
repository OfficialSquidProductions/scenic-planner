# Scenic for iPhone and iPad

The iOS beta version 1.4.21 (26) supports iPhone and iPad on iOS/iPadOS 17+. Open `ios/Scenic.xcodeproj` from the repository root, scheme **Scenic iPad**. The scheme name and bundle ID `org.squidproductions.scenic.ipad` preserve the existing beta identity and workspaces.

Run `python3 ios/prepare.py` after shared editor changes. It regenerates the self-contained project, Info.plist, privacy manifest, and bundled web resources from `dist`. Build outputs are ignored. The UIKit/WKWebView shell uses system frameworks and offline resources. Native storage preserves current/previous workspace recovery.

Run JavaScript suites with `node tests/<suite>.cjs`. Run UI tests with `xcodebuild -project ios/Scenic.xcodeproj -scheme 'Scenic iPad' -destination 'platform=iOS Simulator,name=iPhone 17 Pro' CODE_SIGNING_ALLOWED=NO test`; repeat on an iPad simulator. Tests exercise synthetic data, touch/keyboard editing, rotation, native Files and Share, and distinct-copy import. Debug-only `--portable-smoke-test` writes a cross-platform result and portable export in the simulator's private Scenic folder; use a disposable simulator. Release ignores these flags.

Archive the scheme for generic iOS with the existing team, distribution certificate and app-specific profile. Use a fresh version/build verified against App Store Connect. Internal TestFlight distribution uses only the established owner group; public/external beta and App Store release are separate actions. Never commit credentials or provisioning profiles.

See [portable format and verification](../PORTABLE-PROJECTS.md). Physical sharing providers, AirDrop, large image-heavy productions, Pencil/hardware input, low-memory stress and a full VoiceOver audit remain physical-device QA items.


## Temporary TestFlight demo and iPad panels

**Load The Last Light demo** appears under Productions and works offline on every
bundled editor. It creates a separate eight-scene production from Production Desk's
original screenplay, with Maya/Eli/Jonah, the same locations/props and 16 linked
shots. Scene-specific illustrative maps include coastal road, vehicle, lighthouse,
stairwell, lantern room and seawall. Scene notes preserve the original script.
**Demo guide / reset** explains the file handoff and safe reset. Repeating Load
Demo reopens the locally managed production and retains edits; reset requires
confirmation, affects only that workspace-owned sample, and can be undone. Saved
Last Cue/older demos and portable imports are preserved. An imported marker alone
does not grant reset ownership.

Production Desk shot-list CSV updates matching scene/shot numbers through Scenic's
existing import preview, preserving map geometry, camera links and coverage checks.
There is no cloud or silent sync. Scripts, schedules and map layouts are not carried
by CSV; Scenic CSV does not import back into Production Desk. Save complete .scenic
and .productiondesk files for full backups. For a matching starting copy, Production
Desk's Demo guide also exports the original .scenic demo.

Temporary entry removal: set `enabled=false` in `tools/demo-controller.js`, regenerate
with Production Desk `windows-src/tools/build_demo.py --scenic-root <Scenic root>`,
and run `python3 ios/prepare.py`. Hide/disable entry points without deleting any saved
productions. Keep the template, generated `dist/demo.js` and iOS copy consistent.
The original source and portable reference spec are in Production Desk's
`windows-src/web/demo/the-last-light-spec.json`.

On iPad, Scenes immediately precedes Scene map and Shot list. Scenes, Items and Properties expose their expanded state and use a checked fill when visible, with an outlined available state when hidden. The device-local Settings checkbox **Keep Scenes and Items on the left in landscape** defaults on and persists separately from portable project settings. It applies to landscape iPad windows; portrait iPad and iPhone retain temporary drawers. Selecting tools keeps docked panels visible. Each docked section can be hidden independently; rotating back to landscape restores both when the preference is on.
