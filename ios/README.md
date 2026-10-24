# Scenic for iPhone and iPad

The iOS beta version 1.4.23 (29) supports iPhone and iPad on iOS/iPadOS 17+. Open `ios/Scenic.xcodeproj` from the repository root, scheme **Scenic iPad**. The scheme name and bundle ID `org.squidproductions.scenic.ipad` preserve the existing beta identity and workspaces.

Run `python3 ios/prepare.py` after shared editor changes. It regenerates the self-contained project, Info.plist, privacy manifest, and bundled web resources from `dist`. Build outputs are ignored. The UIKit/WKWebView shell uses system frameworks and offline resources. Native storage preserves current/previous workspace recovery.

Run JavaScript suites with `node tests/<suite>.cjs`. Run UI tests with `xcodebuild -project ios/Scenic.xcodeproj -scheme 'Scenic iPad' -destination 'platform=iOS Simulator,name=iPhone 17 Pro' CODE_SIGNING_ALLOWED=NO test`; repeat on an iPad simulator. Tests exercise synthetic data, touch/keyboard editing, rotation, native Files and Share, and distinct-copy import. Debug-only `--portable-smoke-test` writes a cross-platform result and portable export in the simulator's private Scenic folder; use a disposable simulator. Release ignores these flags.

Archive the scheme for generic iOS with the existing team, distribution certificate and app-specific profile. Use a fresh version/build verified against App Store Connect. Internal TestFlight distribution uses only the established owner group; public/external beta and App Store release are separate actions. Never commit credentials or provisioning profiles.

See [portable format and verification](../PORTABLE-PROJECTS.md). Physical sharing providers, AirDrop, large image-heavy productions, Pencil/hardware input, low-memory stress and a full VoiceOver audit remain physical-device QA items.


## Empty productions and iPad panels

Shipping apps start with an empty production and include no bundled demo project, demo guide, or demo reset. Existing saved and imported projects, including older demo copies, remain supported. Synthetic native smoke fixtures live in Tests/Fixtures and are excluded from Release resource copying.

Production Desk Shot list → Export shots produces the supported CSV. Scenic preserves its scene/shot identifiers and source fields, including Script coverage. Matching-number reimports preserve map objects, camera links and coverage checks. This is a local file handoff; keep complete portable files for backups.

On iPad, Scenes immediately precedes Scene map and Shot list. Scenes, Items and Properties expose their expanded state and use a checked fill when visible, with an outlined available state when hidden. The device-local Settings checkbox **Keep Scenes and Items on the left in landscape** defaults on and persists separately from portable project settings. It applies to landscape iPad windows; portrait iPad and iPhone retain temporary drawers. Selecting tools keeps docked panels visible. Each docked section can be hidden independently; rotating back to landscape restores both when the preference is on.
