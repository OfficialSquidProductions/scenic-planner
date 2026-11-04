# Scenic Feature Test 1.4.32 (10): floor and Settings feedback

Latest unpublished local app: `release/Scenic-Feature-Test-10/Scenic Feature Test.app`. Source: `0f4be28def93ec01800756523aa54eda1ecde5d6` on `feature/scenic-lighting-geometry-test`. Revision 10 supersedes revision 8; revision 9 was an internal check candidate. Existing test projects retain the same isolated test identity and storage. Production Scenic, updater feeds and App Store submissions are unchanged.

- **Floors:** always render beneath other objects. Placement-locked floors can now be selected on an exposed map area, with movement still protected. In Properties, turn off **Lock placement** to move or reshape; the canvas instructions update immediately. When completely covered, use **Scene layers → floor name**, then Properties. Actors/cameras above a floor still receive clicks before the floor, including overlaps with floor shape handles. Existing locks are preserved rather than silently removed.
- **Settings (bottom left) → Scene lighting layouts → Separate lighting per camera / shot:** a prominent checkbox and **On / Off** status appear before Appearance, even while an object is selected. The current scene is named beside the setting. **New scenes default to Off.** Existing scenes retain their saved mode. On selects independent plans through cameras, Shot List rows or the map's layout selector; Off restores shared lighting and retains all shot variants. Saved-layout count explains what remains. The Scene Properties switch remains synchronized.
- **Lights → Flags:** a prominent **W.I.P. — Flags are a work in progress and may have bugs.** warning accompanies the placement hint in light and dark themes.

**42/42 shared CJS suites passed**. Final packaged resources passed **147 native WebKit checks** across feedback (39), lighting layouts (29), editable geometry (34), lighting interactions (32) and numbered CSV import (13). These cover floor locks/selection/overlaps/handles/drag/Undo, Settings visibility and mode synchronization, old/new project defaults, camera/Shot List switching, off/on archives, portable save/reopen and exports. Native UI checks used the separate QA app/storage and confirmed actual Settings visibility, camera archive restoration, floor selection/unlock/body dragging, W.I.P. warning and cold-launch persistence. The final hint correction was also verified interactively in revision 10.

Evidence: `.cache/feedback-final-native-summary.json`, `.cache/feedback-shared-results.json`, `.cache/feedback-qa/Final-feedback.png`, `Final-shot-layouts.pdf` and `Final-rendered/`. The PDF parsed and rasterized natively as two pages, labeled Shot 3.2 then Shot 3.10; PNG and PDF content were visually inspected. The packaged universal binary, strict ad-hoc signature, runtime resource hashes, disabled updater and absent file association were verified. Production and existing Feature Test workspace/backup fingerprints were unchanged through isolated QA (four files).

Native Windows, iPhone/iPad and Intel Mac execution for these unpublished changes remain outstanding. No platform publication is authorized. The preview limitations below still apply. Optional synthetic lighting examples are included in revision 10's `Examples/` folder; importing adds a copy.

## Earlier interacting-light controls (revision 8)

Updated unpublished local candidate: `release/Scenic-Feature-Test-8/Scenic Feature Test.app`. Built from `fe678795ce88d9e9774074d65ac76475c2989524` on local branch `feature/scenic-lighting-geometry-test`.

Quit the older **Scenic Feature Test** before opening revision 8. It retains the same isolated test identity/storage so existing test projects remain available. Production Scenic is not replaced. No updater, public feed, GitHub release or App Store submission was changed. The local build is ad-hoc signed, universal arm64/x86_64; native Apple Silicon checks passed, Intel execution is untested.

## Try the changes

- Fixture Properties → Barn doors: each angle now ranges from **−75° outward** through **0° forward** to **90° inward**. Open both side doors outward for a wider usable cone; close one side to trim spill asymmetrically. The fixture's Beam angle is the optical maximum. Use Direction to aim the whole fixture. Top/bottom controls change a relative vertical-throughput approximation rather than inventing a 3D top-down shape.
- Lights → Flags: the dashed line is the optical surface, and the arrow marks its front normal. Rotate that front toward incident light. Width controls the intercepted span; height is the diagram footprint. Reflective flex-fill backs absorb; the reversible board explicitly uses white on one face and black on the other.
- Silver gives a tighter neutral reflected field; white gives broad soft fill; gold gives a broader warm reflected field. The bounce direction changes with surface angle. Diffusion transmits a softer, wider field onto the far side. Black/negative fill absorbs intercepted direct and modeled bounced light.
- Modifier enabled and Interaction strength permit comparisons without deleting equipment. Values, side selection and angles persist through copying, Undo/Redo, shot lighting plans, save/reopen and exports. A surface hidden behind a wall or blocker does not emit a fake glow.
- Optional synthetic examples are in `release/Scenic-Feature-Test-8/Examples/`: **Lighting roles.scenic** has six material/barn-door scenes; **Shot lighting comparison.scenic** has independent camera plans. Import adds a copy; examples are not automatically inserted into the user's workspace.

## What the preview represents

This is a relative **2D planning approximation**, not calibrated photometry, exposure, spectral transport or full global illumination. Material efficiencies, spreads and opacity curves are illustrative choices, not manufacturer measurements. Walls, doors/windows and indicated optical surfaces affect the modeled paths; actor/prop icons do not acquire 3D shadows. Negative fill removes intercepted modeled light; it does not reconstruct or subtract the separately chosen uniform ambient setting. Generic diffusion approximates broad transmitted scatter, not a measured silk weave or specific filter product.

The trace supports up to three surface interactions per path with finite energy, multiple illuminated surface samples and wall/screen occlusion. It prevents repeated-surface loops, uses deterministic overlap precedence and bounds source/secondary detail for responsiveness. Coincident black absorbers take precedence over reflective surfaces. Larger or highly repeated lighting setups show **Detail limited**; exports also disclose the limit. Export headers identify **2D LIGHTING APPROXIMATION**. The source cone cannot be widened beyond its fixture Beam setting by opening barn doors.

## Reference basis

The implementation follows published tool roles, with its own deliberately simplified numerical model:

- [Westcott: Essential Guide to Photo Reflectors](https://westcottu.com/photo-reflectors-guide) describes neutral white fill, stronger silver reflection, gold warmth, black absorption and translucent diffusion. The preview distinguishes those roles rather than treating every object as the same emitter.
- [Rosco: Diffusion Confusion](https://us.rosco.com/en/diffusion-confusion) explains transmitted scatter, apparent source size, placement and differing diffusion characteristics. The generic preview uses bounded area samples and broadening; it does not claim to reproduce a named Rosco material.
- [CHAUVET: Barn Doors](https://chauvetprofessional.com/product/colordash-par-18-barn-doors/) describes independent leaves shaping the beam and reducing spill. The preview crops the usable cone; it does not pretend barn doors bend individual rays.

## Verified evidence

- **42/42 shared CJS suites passed**, including material/angle/energy/occlusion/overlap/sun/limits tests and all prior geometry, file, clipboard, shot import, coverage, menu and persistence regressions.
- **246 checks passed against the final packaged resources/native bridge**: 32 interactive lighting, 54 modifier controls, 29 shot layouts, 34 editable geometry, 40 shot actions/scroll, 13 numbered-scene CSV, 37 native clipboard and seven advanced native clipboard checks. Summary: `.cache/interaction-final-native-summary.json`.
- Actual native WebKit pixel assertions: direct light on a neutral patch changed from `[97,97,97]` to `[68,68,68]` behind a black flag; an angled gold bounce produced `[151,127,82]`; a diffuser spread light onto an off-cone patch that otherwise remained `[68,68,68]`. These are visual regression samples, not physical measurements.
- Rotation, both board faces, absent/disabled/occluded sources, partial strength, multiple equipment and walls, energy non-amplification, bounded bounce paths, source aperture and cache invalidation were tested. No geometry is mutated by the solver.
- Camera-specific plans, real input changes, Undo/Redo, cross-scene copies, portable reopening and two-page shot PDFs passed. Changing the live preview while asynchronous export is running preserves the originally captured lighting bytes and the latest live setting.
- Native Mac QA used separate identity `org.squidproductions.scenic.feature-test.qa` and storage `~/Library/Application Support/Scenic Feature Test QA/`. Synthetic import, actual barn-angle adjustment, native PDF Save and quit/cold-launch retention passed. The saved native PDF parsed and rasterized as two pages. Both production and the existing user Feature Test workspace/backup SHA-256 fingerprints stayed unchanged (four files).
- The benchmark with 1,500 wall segments, 20 fixtures and 30 modifiers traced in roughly 9–12 ms in the local Node run, with spatial indexing and bounded rays. This is solver timing, not an FPS guarantee. The small native example's cached draw dispatch measured 0–1 ms; complex scenes may invoke the visible detail limit.
- Rendered preview/PDF output was visually inspected. Evidence: `.cache/light-interactions-qa/Final-preview.png`, `Final-interaction-shots.pdf`, `Final-rendered/`, and `Native-interacting-shot-plans.pdf`. Final source/resource and storage proof: `.cache/interaction-final-proof.json`. Universal binary and strict code signature checks passed.

The optional Chromium `floors-browser.cjs` still has no installed Playwright dependency and is excluded from the passing counts; native floor/image-clipping checks passed. Native Windows, iPhone/iPad and Intel Mac execution remain outstanding before any platform release. No new publication is authorized by this test build.
