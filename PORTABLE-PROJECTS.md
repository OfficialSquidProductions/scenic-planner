# Editable Scenic project files

Use **Save as…** to choose a filename and destination for the active production. The `.scenic` file contains every scene, object, reference image, movement mark, shot list, camera link, coverage check, theme, grid, snap, and lighting-preview setting. Send the file to another Scenic user; **Import project…** opens an editable copy as a separate production. Repeated imports receive distinct names and fresh production IDs. Exchange another file to pass back later edits.

On iPhone and iPad, Save As uses the native Files export picker; Share uses the system activity sheet, including Save to Files and whichever sharing apps the device provides. The popover is anchored to Share. Opening a `.scenic` attachment or Files document uses the same import validator. Canceling either picker or the share sheet leaves the workspace unchanged.

On macOS, Save As uses `NSSavePanel` and Share uses `NSSharingServicePicker`. Finder document opening is registered. On Windows, Share saves a copy through the native save dialog and reveals it in Explorer so the user can attach it to their preferred service; the installer registers `.scenic` opening. Browser users can download a copy or use Web Share where supported. The share action does not choose a recipient or send a message automatically.

The local iOS target now supports **iOS/iPadOS 17+ on iPhone and iPad** (`TARGETED_DEVICE_FAMILY = 1,2`). The existing bundle identifier and **Scenic iPad** scheme name are retained so this update can preserve installed iPad workspaces and the existing beta identity. The currently distributed 1.4.16 (21.1) beta remains iPad-only until a new universal build is released. Desktop requires the Scenic desktop app or its browser editor.

On iPhone, the compact top bar keeps Scenes, Properties, Save As, and Share reachable. Production naming and Export Map move into the Scenes drawer. Scenes and Properties use full-width drawers with Done controls. The tools strip scrolls horizontally; the same canvas supports touch placement/drag, one-finger Pan, and two-finger zoom/pan. The keyboard layout guide keeps the editor above the phone keyboard; native Files and Share use system presentations. Device orientation and screen size do not change saved scene geometry.

## Format and compatibility

The extension and existing JSON project shape are retained. The top-level model remains `version: 1`, with the additional metadata:

```json
"portable": {
  "format": "org.squidproductions.scenic.project",
  "version": 1
}
```

Older `.scenic` projects without this metadata still import. Existing readers that accept the version-1 project model can read these exports. Internal multi-production autosaves remain workspace version 2; current/previous-save recovery remains intact. Device panel dimensions and viewport fit are local preferences.

Reference images remain inline `data:image/png`, `data:image/jpeg`, or `data:image/webp` base64 values, using the existing image machinery. The file never depends on a source computer's image paths. There is no ZIP extraction, script evaluation, remote fetch, or interpretation of instructions in project notes. Text remains text; imported identifiers are constrained before entering editor data attributes.

`dist/project-file.js` checks the project schema through the shared model, active scene and relationships, portable format version, field sizes/depth/count, finite numbers, safe IDs, settings, base64, image signatures, dimensions, and aggregate reference limits. The actual platform image decoder must then successfully decode each unique reference before import or export.

Limits: 60 MiB per portable file; 20 MiB and 40 megapixels per reference; 16,384 pixels per edge; 100 distinct reference images and 120 megapixels in total. A workspace allows 100 productions and 80 MiB. Imports exceeding these limits fail with an explanation, preserving active work. A validated candidate workspace is persisted before the imported copy becomes active. Import can be undone during the session. Native export uses atomic file replacement; the native save UI handles explicit overwrite confirmation.

## Build and verification

Version 1.4.17 adds native portable exchange on desktop and universal iOS. The existing `Scenic iPad` scheme and bundle ID preserve installed beta workspaces. Run `python3 ios/prepare.py` after changes to `dist`; see [iOS build instructions](ios/README.md).

The 23 JavaScript suites cover schema, embedded-asset validation/limits, duplicate IDs/names, safe cancellation, failed saves, Undo and atomic Windows writes. Native iPhone/iPad UI tests exercise portrait/landscape drawers, touch/keyboard editing, Files save/import, a distinct editable imported production, and share cancellation. Real iOS/macOS WebKit exchange checks geometry, scenes, motion, camera links, shot coverage, editor settings, text and decoded PNG/JPG/WebP assets. The repository's Windows workflow tests packaging and installation on Windows.

Physical iPhone/iPad sharing destinations, iCloud/third-party Files providers, AirDrop/messaging delivery, heavy image projects, low-memory behavior and hardware input require device QA. Simulator/native editor checks do not establish delivery through other services.
