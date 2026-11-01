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

## Verified App Review submissions

Both versions are submitted, and App Store Connect's App Review overview verifies **Waiting for Review** for both platforms:

| Platform | Version/build | Build ID | Submission ID |
| --- | --- | --- | --- |
| macOS | 1.4.26 (32) | `ad5a61cc-9d2e-436d-a72c-ea339f340a92` | `c597da35-d8ca-4ff8-b797-ec7842a550e0` |
| iPhone/iPad | 1.4.26 (32) | `58834336-70c4-4ca0-b3ec-9e1df569f9d8` | `01d394a7-4220-4f00-a80f-3466e850b8d4` |

Mac receipt: https://appstoreconnect.apple.com/apps/6823691617/distribution/reviewsubmissions/details/c597da35-d8ca-4ff8-b797-ec7842a550e0

iOS receipt: https://appstoreconnect.apple.com/apps/6823691617/distribution/reviewsubmissions/details/01d394a7-4220-4f00-a80f-3466e850b8d4

Mac submitted at the displayed Nov 1, 2026 2:55 PM; iOS at 3:04 PM. Build processing, build association, saved metadata, Add for Review and final Submit for Review completed on each platform. The App Review overview shows both submitted items and the confirmation banner. No Apple approval is claimed. Existing automatic release-after-approval settings were preserved.

The separate Scenic browser tab `1553854372` is left on the verified App Review overview. Production Desk tabs and its pending approval were untouched. The parent-provided exclusive browser window resolved the earlier coordination pause. No Apple action remains blocked; review approval is Apple's next step.


## Windows candidate

Windows CI run https://github.com/OfficialSquidProductions/scenic-planner/actions/runs/41343345923 passed all shared checks and the packaged/installed/reinstalled native checks (13 each), including silent installation and preserving reinstall. A v1.4.26 draft exists (release ID `430816091`) targeting the tested source commit. Its publication step was explicitly skipped; public latest remains v1.4.25 with Windows 1.4.24 metadata.

Installer SHA256: `da4a2f38c570b896586c63471b6001578f20a58fcee0ab02f55f99379d3af2cd`.

The authenticated downloaded candidate and latest.yml/checksum were verified against CI evidence and GitHub asset digests. Local installer: `release/windows-vm-candidate/Scenic-Windows-Setup.exe`. Actual user Windows VM testing has not happened and is required before publication. Follow `WINDOWS-1.4.26-VM-TESTING.md` and the synthetic `tests/fixtures/numbered-scenes-17-shots.csv`. Preserve the exact Mac 1.4.25 feed and artifact bytes on any future latest Windows release so installed Mac updater URLs continue resolving.
