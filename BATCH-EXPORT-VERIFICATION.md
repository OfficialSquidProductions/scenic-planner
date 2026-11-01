# Scene-window Export All

Export All in Scenes offers one multipage PDF or separate PNG files. It exports a frozen production snapshot in existing scene order, using the live editor's `fit()` and `draw(true)` renderer. Each 1800×1250 page/image has scene number/title and production header; the map is fitted below the header. The scene browser shows per-scene progress and cancellation. Closing it cancels an in-progress job.

Native Mac uses a PDF Save panel or a destination folder picker. PNG batches are staged in a fresh private folder, then moved to a new collision-safe `Production - scenes` folder; existing exports are never merged or replaced. iPhone/iPad use native Files: one PDF or a folder containing all separate PNGs. Their destination picker presents above the Scenes sheet. Windows source includes an analogous restricted destination-folder/session workflow; it requires later actual VM testing. Browser fallback packages the separate PNG files into one ZIP to avoid browser multiple-download blocking. PDF/ZIP encoding has no new dependency.

Limits: 1–100 scenes, 80 MB total encoded output, 24 MB per native PNG, fixed 1800×1250 raster scenes. Invalid/stale session tokens, out-of-order files, path-bearing filenames, duplicate filenames and invalid PNGs are rejected. Output is raster PDF rather than editable/searchable vector text. Failed or cancelled native PNG jobs remove only their fresh staging directory. The actual editor surface, active scene, viewport, selection and undo history are restored after every synchronous offscreen render; image decoding happens before temporary renderer state is installed.

Verified in this worktree:

- `node tests/batch-export.cjs`: ordered PDF structure; bounded output; deterministic safe filenames; native Windows destination/session ordering, cancellation, stale tokens, damaged data, preservation of an existing destination folder, and valid ZIP fallback.
- Existing `scene-browser-check.cjs`, `windows-menu.cjs`, `windows-clipboard.cjs` pass.
- Full native Mac Store-source and iOS-simulator Swift typechecks pass with the new PNG helper and destination bridges.
- `tests/BatchExportCheck.swift` plus `tests/batch-export-webkit.js`: 10 actual WebKit editor checks and 4 native output checks pass. A synthetic two-scene bathroom production exported as a natively parsed two-page PDF and two repeated PNG sets. Cancellation removes partial staging; stale production and save-error paths restore ready state. Source, active scene, surface/viewport, selection and undo remain intact.
- PDF pages rasterized with CoreGraphics and visually inspected: ordered scene titles, production headers, floor/reference image/color, wall/opening geometry and camera/light labels appear in the generated output. No real user production was used.

Local disposable proof: `/tmp/scenic-batch-evidence-complete/result.json`, `Bathroom batch export QA - all scenes.pdf`, `PDF-page-1.png`, `PDF-page-2.png`, and folders `Bathroom batch export QA - scenes` / `Bathroom batch export QA - scenes (2)`.

Combined annotation renderer/export tests, final packaged Mac destination UI, iPhone/iPad Files destination UI and actual Windows native VM checks remain integration checks for the parent. No build was uploaded, submitted or published by this work.
