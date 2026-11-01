# Scenic 1.4.25 (31): numbered-scene CSV import

Production Desk keeps a shot's linked screenplay scene separately from its displayed shot identifier. Manual identifiers such as `5.1` can remain linked to screenplay scene 4, so the CSV may contain `Scene=4, Shot=5.1`. Scenic grouped solely by Scene, collapsing distinct numbered scenes. Production Desk's linked screenplay references and numbering remain intact; Scenic now treats supported full dotted identifiers as the destination scene identity. No Production Desk source change is required.

The read-only user CSV reproduces 17 shots grouped under four Scene-column values. Its full shot numbers identify eight populated scenes: 1, 2, 4, 5, 6, 7, 8, 9. Scene 3 has no shot row. The corresponding project has nine screenplay scenes. No private descriptions or project data are included in fixtures or commits, and neither user file was modified.

The importer preserves full shot numbers, all 18 supported source columns, Script coverage, source order within each scene, literal leading zeroes and supported alphanumeric scene suffixes. Lettered and suffix-only forms keep the explicit Scene column. A synthetic 17-shot/nine-scene fixture includes shuffled rows, noncontiguous scenes, duplicate validation, repeat imports, linked-camera and coverage preservation, CSV export and portable save/reopen. Existing wrongly grouped records block a merge that would duplicate shots; the preview instructs importing into a new Scenic production while preserving existing maps. Saved projects are never silently rearranged.

Validation passed:

- `scene-shot-numbering.cjs` with synthetic fixtures and the read-only actual CSV.
- `shot-list.cjs`, `shot-reimport.cjs`, `production-desk-interchange.cjs`, `shot-editor.cjs`, `project-file.cjs`, `project-exchange.cjs`, `floors.cjs`, `updates.cjs`.
- Python release-note tests and native updater save-gate checks.
- Universal arm64/x86_64 Mac build and native storage self-test.
- Packaged-app native WebKit: preview has nine scenes/17 shots; confirm preserves the current production and existing scenes; repeat import keeps IDs; portable reopen retains shots; legacy-grouping warning blocks duplicates and preserves data (13 checks).

Distribution is macOS GitHub only. The source commit uses `[skip ci]` because the repository's main-branch Windows workflow otherwise builds and uploads a Windows installer when shared code changes. Windows 1.4.24 installer, blockmap, checksum and latest.yml are retained byte-for-byte on the new latest release for continued updater resolution. No Windows build, App Store build, upload, release or submission is authorized by this change. iOS resources and all native signing/runtime source remain unchanged. Developer ID notarization is the standalone Mac distribution check.
