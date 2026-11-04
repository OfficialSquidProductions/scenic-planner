# Scenic Feature Test — lighting and editable geometry

Local unpublished candidate **1.4.32 (6)**, built from `9ea091e` on `feature/scenic-lighting-geometry-test`. Source commits remain local. No release, feed, App Store submission or installed production app was changed.

## Open the separate app

Open `release/Scenic-Feature-Test-6/Scenic Feature Test.app`. Use this revision; earlier numbered output folders are development diagnostics. `START HERE.txt` in the same folder explains testing and project copies.

- Independent bundle identity: `org.squidproductions.scenic.feature-test`.
- Independent autosave and crash-report directory: `~/Library/Application Support/Scenic Feature Test/`.
- Production Scenic continues using `~/Library/Application Support/Scenic/`. Its two workspace-file SHA-256 fingerprints remained unchanged through native test-app import, editing, exports, quit and relaunch.
- No Sparkle framework/feed or updater. No `.scenic` file association registration. Existing production app is neither replaced nor launched by the test builder.
- Universal arm64/x86_64 local build, macOS 13.3 minimum, ad-hoc code signature verified. This is not a notarized public distribution. Apple Silicon was tested; Intel execution remains untested.
- Test app starts empty. The isolated QA workspace now contains an explicitly synthetic six-scene example. Real projects were not opened or modified. Import a **copy** of an exported `.scenic` backup to try your own environment; import creates another test production without changing the original file. Save edited test copies with new names.

## Implemented behavior

- Lights → Flags: silver/gold/white/black flex fill, negative fill, scalable white/black reversible bounce board, and diffusion flag kit. These are passive planning symbols, not physical light simulation.
- Main fixture Properties: barn-door checkbox and four top/bottom/left/right closure sliders. The overhead diagram displays left/right leaves and their rotations; all four values persist through toggles, copies and reopen. Sun incidence arrow points away from the sun icon along its light-travel line.
- Scene Properties: opt-in **Separate lighting per shot**. The original scene remains Shared lighting. New shot/camera plans inherit a deep copy of the current shared baseline. Existing plans keep their independent lights, flags, label positions, ambient and modifier settings; shared edits do not overwrite them. The set and cameras remain common. Disable restores shared lighting and retains variants; re-enable exposes them again. Removed shots' retained plans are labeled as saved/removed and stay recoverable.
- Select a camera, Shot List row, or the persistent layout selector to switch plans. Camera setups linked to the same imported shot use that shot's plan; unlinked cameras have individual plans. Ordinary text input, coverage-checkbox behavior and multi-selection remain intact.
- **Export selected shot** produces a scene/shot-labeled PNG. Exact dotted labels remain in the image; numeric dots become hyphens in sanitized filenames (`3.2` → `3-2`, distinct from `32`). **Export all shots** from the map or Scenes window produces one PDF page per shot of the current scene in numeric shot order; unlinked camera plans follow. Shared mode retains production-wide scene exports. Rendering uses frozen copies and restores live editor state. Shot PDFs allow up to 1,000 pages within the existing 80 MB export bound.
- Walls/Floor → **Draw a curved wall**: endpoints and central on-curve bend handle. Body drag selects/moves the complete wall with visible handles. Group transforms, openings, hit-testing, occlusion, copies and exports use sampled curve geometry.
- Floor Properties → **Edit outline**: four corners, four edge points and center anchor. Corners reshape, edges move adjacent corners, center/body moves the complete tile. Images stretch over the normalized envelope and clip to the polygon. Reset rectangle is undoable. Legacy floors retain normal rectangle controls until opted in.
- New fields integrate with Undo/Redo, independent clipboard/scene duplication, validation, autosave and portable files. Old version-1 projects remain readable. Exports containing advanced features use portable format 2, so older Scenic declines them instead of silently flattening new geometry/layouts. Advanced object copies similarly use clipboard format 2; ordinary legacy copies remain format 1. Mac and iOS native bridges recognize both.

## Verification

- **41/41 shared CJS suites passed**, including new layout, modifier and geometry suites and existing project, copy, room/floor, scene/shot numbering, coverage/actions, Windows menu/file/store and updater regressions.
- Final packaged WebKit checks: **29** lighting-layout checks, **41** modifier checks, **34** geometry checks, **40** Shot List checks and **13** numbered-scene CSV checks.
- Actual Mac native clipboard bridge, private named pasteboards: **37** existing clipboard checks plus **7** advanced-geometry/modifier checks. Normal text responder behavior, queued copies, fresh IDs, cross-scene independence, Undo/Redo and malformed payload behavior are covered.
- Total packaged native assertions: **201**. Result summaries are in `.cache/feature-test6-native-summary.json`; full individual results in `.cache/*-feature-test6.json`.
- Native app UI: verified first-launch scene setting, visible Flags tab/catalog, synthetic project import, camera/shot selector, retained mode, cold launch with selected Shot 3.2 and both layouts, native Save As project copy, native PDF dialog cancel/retry and successful save, and Scenes-window Export all shots through the native bridge. Both actual PDFs parsed natively as two pages and rasterized at 1800×1250; headers, order and distinct lighting plans were visually inspected.
- Native Save As output validated with six scenes, retained lighting states and portable format 2. Geometry checks assert actual clipped-image pixels, foreground camera/actor priority, three wall handles, floor center/corner/edge/body interactions and rendered PNGs.
- Production storage isolation evidence: `.cache/feature-test-isolation-result.json`. Build manifest records each bundled resource digest; the bundled runtime matches tested source. Test-build native storage self-check covers atomic save, backup recovery and invalid data preservation.

Optional standalone Chromium `floors-browser.cjs` was not executed because its Playwright dependency is absent; it is excluded from the passing counts. Actual native WebKit geometry/image-clipping tests passed instead.

## Remaining platform gates

Native Windows acceptance, iPhone/iPad touch/hardware-keyboard workflows, mobile layout and native Files/export tests for these new features have not run. The iOS clipboard source change is prepared but no new iOS build was uploaded or submitted. Intel Mac execution is untested. This candidate is ready for the user's separate Mac testing; it is not a cross-platform release approval.
