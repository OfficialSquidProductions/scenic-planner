# Scenic 1.4.26 (32): Windows native verification hold

The fix is prepared on `release/scenic-1.4.26-store-windows`. Windows 1.4.24 remains public, and Mac GitHub 1.4.25 / build 31 stays unchanged. Windows CI may build, test, silently install/reinstall and upload a **draft** installer. Publication is separately gated and must wait for actual Windows VM tests. `publish_verified_windows` defaults to false. No Windows publication is authorized by a passing GitHub-hosted CI run alone.

Use a disposable Scenic Windows profile or a portable copy; do not edit a real production. Test the exact downloaded candidate installer, retain its SHA256, and record Windows version and candidate commit.

1. Install and cold-launch Scenic. Verify branding, floor palette and an empty new production. Import `tests/fixtures/numbered-scenes-17-shots.csv` using **File → Import Shot List CSV** from Scene map. The native file dialog must open. Cancel once, then import.
2. Preview must show **9 scenes / 17 shots**, keyed by dotted prefixes (1, 3, 5, 7, 9, 12, 17, 21, 24), despite the Scene column containing only 1, 2, 4, 8. Confirm in the existing production without changing unrelated scenes. No invented scene numbers or lost shots.
3. Inspect full shot identifiers, descriptions, size, movement, lens, Notes and multiline Script coverage. Reimport the same CSV: stable scene/shot IDs, nine populated scenes, seventeen shots, no duplicates. Retain camera links, coverage checks and existing map objects.
4. Verify a previously misgrouped legacy production blocks a duplication-producing merge and explains importing into a new production, preserving old maps. Also import the existing lettered-ID fixture to confirm explicit Scene fallback.
5. Save/open a portable `.scenic` copy and quit/relaunch. Check grouping, metadata, camera links, checks and embedded floor images. Export CSV and reimport it into a separate QA production.
6. Verify File → Import Image and Open Project still open native dialogs; Undo/Redo hints display Ctrl on Windows. Test floor dimensions/image/color/layering and safe picker cancellation.
7. Run the packaged/installed/reinstalled `tools/check_windows.py` checks and retain JSON evidence. Reinstall must preserve the QA workspace. Verify the published current Windows 1.4.24 updater does not receive this draft.

After all actual VM checks pass, coordinate publication of a new immutable v1.4.26 Windows release and copy the exact Mac 1.4.25 appcast, signed archive, notes, alias ZIP and checksums onto it. This is required because installed Mac clients use `/releases/latest/download/`. Verify the public Windows latest.yml version/SHA512, installer SHA256, retained Mac digests, and unchanged Mac feed build 31. Do not modify v1.4.25 assets.
