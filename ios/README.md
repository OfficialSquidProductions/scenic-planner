# Scenic for iPhone and iPad

Version 1.4.17 (22) supports iPhone and iPad on iOS/iPadOS 17+. Open `ios/Scenic.xcodeproj` from the repository root, scheme **Scenic iPad**. The scheme name and bundle ID `org.squidproductions.scenic.ipad` preserve the existing beta identity and workspaces.

Run `python3 ios/prepare.py` after shared editor changes. It regenerates the self-contained project, Info.plist, privacy manifest, and bundled web resources from `dist`. Build outputs are ignored. The UIKit/WKWebView shell uses system frameworks and offline resources. Native storage preserves current/previous workspace recovery.

Run JavaScript suites with `node tests/<suite>.cjs`. Run UI tests with `xcodebuild -project ios/Scenic.xcodeproj -scheme 'Scenic iPad' -destination 'platform=iOS Simulator,name=iPhone 17 Pro' CODE_SIGNING_ALLOWED=NO test`; repeat on an iPad simulator. Tests exercise synthetic data, touch/keyboard editing, rotation, native Files and Share, and distinct-copy import. Debug-only `--portable-smoke-test` writes a cross-platform result and portable export in the simulator's private Scenic folder; use a disposable simulator. Release ignores these flags.

Archive the scheme for generic iOS with the existing team, distribution certificate and app-specific profile. Use a fresh version/build verified against App Store Connect. Internal TestFlight distribution uses only the established owner group; public/external beta and App Store release are separate actions. Never commit credentials or provisioning profiles.

See [portable format and verification](../PORTABLE-PROJECTS.md). Physical sharing providers, AirDrop, large image-heavy productions, Pencil/hardware input, low-memory stress and a full VoiceOver audit remain physical-device QA items.
