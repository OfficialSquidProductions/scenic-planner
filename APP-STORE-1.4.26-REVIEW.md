# Scenic 1.4.26 (32): App Store candidates and Windows VM hold

This applies the previously published Mac 1.4.25 numbered-scene import fix to Scenic's existing iPhone/iPad and Mac App Store products and prepares the next Windows update. App Store Connect app ID is `6823691617`; both Store bundle identifiers are `org.squidproductions.scenic.ipad`. The direct Mac distribution keeps its separate `org.squidproductions.scenic` bundle ID, Sparkle feed and published 1.4.25 build 31. Windows 1.4.24 remains public.

Before uploading, live App Store Connect showed both platforms at 1.4.23 (29), Ready for Distribution, with build 29 the newest TestFlight build. Candidate source is `cb8709dbffffec437d4d5780ef22b147456593bc` on `release/scenic-1.4.26-store-windows`. Apple version/build 1.4.26 (32) avoids editing immutable Mac 1.4.25 release artifacts. Existing app-specific profiles and certificates were used; no credentials, account permissions or agreements were created or changed. App Store export options explicitly set `testFlightInternalTestingOnly=false` and disable automatic build renumbering.

## Verified tests

- All 30 shared, geometry, portable-file, native-menu, branding and updater regression suites passed, including the 17-shot/nine-scene shuffled and noncontiguous numbering regression.
- On dedicated disposable iPhone 17 Pro and iPad Pro simulators, the actual native CSV receiver passed 37 import checks each: nine populated scenes, seventeen shots, all source metadata, stable shot IDs on reimport, camera links, floor image and portable/CSV round trips. Seven cold-launch checks passed on each device, covering grouping, metadata, camera links/checks, embedded image and workspace validity.
- Two native iPhone UI tests passed for panels/rotation and paired native CSV import/export picker cancellation. Three native iPad UI tests passed for CSV picker/rotation, floor controls/image cancellation and landscape panel persistence.
- Mac Store packaged resources passed all 13 native WebKit import/reimport/persistence/legacy-safeguard checks. The isolated development-signed Store sandbox candidate passed native atomic save, reload, backup recovery and invalid-data protection. The Store distribution archive's signature and exact sandbox/application entitlements were verified.
- Both Release archives contain the exact fixed importer. The iOS archive excludes all debug smoke fixtures. The Mac Store archive has StoreUpdates, no Sparkle framework and no Sparkle plist keys. User projects and files were not modified.

## Apple checkpoints

Both signed archives uploaded successfully through Xcode with `app-store-connect` distribution, using the existing Scenic listing. New 1.4.26 version pages were created for both platforms. Accurate What's New text and detailed reproducible reviewer notes were saved; inherited screenshots, contact details, existing automatic release-after-approval settings and descriptions were preserved. All 350 price/proceeds cells across 175 regions were verified zero. The existing published Data Not Collected privacy declaration was inspected and left unchanged.

Latest verified checkpoint: Mac build `ad5a61cc-9d2e-436d-a72c-ea339f340a92` finished processing and is Ready to Submit in TestFlight. It was selected and saved on macOS 1.4.26 and added to a draft, making the version Ready for Review. The draft contains 1.4.26 (32) and exposes Submit for Review; final submission is pending browser serialization with the Production Desk task. iOS 1.4.26 (32) was last observed Processing, so its build association and final review submission remain pending. Upload or Ready for Review is not App Review submission or approval.

The separate Scenic browser tab is `1553854372`. Continue within that tab; do not operate the Production Desk App Store tab. No Apple approval is claimed.

## Windows candidate

Windows CI run https://github.com/OfficialSquidProductions/scenic-planner/actions/runs/41343345923 passed all shared checks and the packaged/installed/reinstalled native checks (13 each), including silent installation and preserving reinstall. A v1.4.26 draft exists (release ID `430816091`) targeting the tested source commit. Its publication step was explicitly skipped; public latest remains v1.4.25 with Windows 1.4.24 metadata.

Installer SHA256: `da4a2f38c570b896586c63471b6001578f20a58fcee0ab02f55f99379d3af2cd`.

The authenticated downloaded candidate and latest.yml/checksum were verified against CI evidence and GitHub asset digests. Local installer: `release/windows-vm-candidate/Scenic-Windows-Setup.exe`. Actual user Windows VM testing has not happened and is required before publication. Follow `WINDOWS-1.4.26-VM-TESTING.md` and the synthetic `tests/fixtures/numbered-scenes-17-shots.csv`. Preserve the exact Mac 1.4.25 feed and artifact bytes on any future latest Windows release so installed Mac updater URLs continue resolving.
