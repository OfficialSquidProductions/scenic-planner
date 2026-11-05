# Scenic inspector cleanup

Unpublished local change based on Mac 1.4.33 (build 37), on `fix/compact-scenic-inspector`.

## Changes

- Removed the camera-linking and information-label helper paragraphs, the talent planning-envelope paragraph, and verbose studio, barn-door, sun and lighting-flag explanations.
- Kept all controls, numerical readouts, original shot details and validation. The camera checkbox is now labeled **Coverage**; its checked state, accessible name and shot-list coverage workflow are retained.
- Put **Reset label position** in its own full-width action row with spacing before the next field. Its text wraps within narrow panels.
- Applied the common camera, talent, sun and reset-row changes to the existing iOS web bundle without overwriting its platform-specific code. No iOS, Windows or App Store build was submitted.
- Lighting calculations, stored project format, model defaults, flag proportions and optical geometry are unchanged. Research/assumptions remain in the existing standalone documentation.

## Verification

- 44/44 shared CJS suites and 7/7 Python tests passed.
- 508 native macOS WebKit checks passed against the packaged preview: 247 focused inspector checks, plus studio optics (59), annotations (29), flag scaling (46), light interactions (32), lighting layouts (29), modifiers (53), and numbered scene import (13).
- Reset bounds, clickability and separation verified at inspector widths of 190, 220, 268 and 380 CSS pixels, including light and dark themes. Native screenshots were visually inspected.
- Camera connector/offset editing, repeated reset, Undo/Redo, original shot details, coverage, talent dimensions, all six light presets, sun validation, seven lighting flags, portable save/reopen and PNG export passed.
- Packaged app.js, workflow.js and style.css match the final source. Universal arm64/x86_64 binary and strict ad-hoc signature verified. Native storage self-test passed.
- All four existing production and Feature Test workspace/backup fingerprints stayed unchanged. The native harness used synthetic in-memory storage. Installed production Scenic and all published release/update feeds are unchanged.

## Local preview

`release/Scenic-Inspector-Cleanup-20261105/Scenic Feature Test.app`

This side-by-side preview uses the existing Feature Test storage identity, disables automatic updates, and has no file association. It was built with the existing preview builder as feature revision 14; it is not a new public version. It has not been opened over the user's current production app.

Evidence: `.cache/inspector-cleanup/final-proof.json`, `shared-results.json`, `native-inspector.json`, `native-summary.json`, `camera-narrow.png`, and `gold-reflector.png`.

To reproduce the focused native check, compile `tests/RendererCheck.swift`, then run the binary with the absolute packaged `Contents/Resources/web` directory, `tests/inspector-cleanup-webkit.js`, and a result JSON destination. Desktop GUI access is required. Tests are synthetic; no production workspace is loaded.

Native Windows, iPhone/iPad and Intel Mac runtime checks were not run for this cleanup. The separate Chromium floor browser script was not run; existing shared floor tests passed.
