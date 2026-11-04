# Editable curved walls and floor outlines

Implemented against the existing scene model without rewriting legacy objects:

- Walls/Floor offers Draw a curved wall, placed using two endpoints. Existing walls can use Curve this wall / Make straight in Properties. A selected curve has endpoint handles and an on-curve middle bend handle; dragging its body moves the whole wall. `wall.curve` is a vector from the endpoint midpoint to the visible midpoint; a quadratic Bezier control point is derived from it. Curves participate in wall groups, attached openings, selection, camera coverage and artistic wall-aware lighting via 64 segments. Centerline lengths reflect the arc. Grouped duplication deep-copies curve controls.
- Existing floors keep their rectangle resize/rotation controls. Edit outline exposes four corners, four edge handles, and a center anchor. Corner movement preserves the other vertices; an edge moves both adjacent corners; center/body movement preserves the whole shape. Crossing/collapsed outlines are rejected. Width/height and rotation remain editable in Properties. Reset rectangle is undoable. `floor.vertices` uses normalized local width/height coordinates; edits recenter and normalize the image envelope. Color and embedded images are clipped to the polygon, stay below foreground objects and export with the shape.
- Foreground actors/cameras/lights remain selectable even when they coincide with a selected wall endpoint or floor handle. Locked floors retain existing Layers/Properties behavior.
- Shared geometry helpers are `wallCurvePoints`, `wallSegments`, `wallLength`, `floorVertices`, `floorPoints`, `floorShapePose`, `polygonContains`, and `validFloorVertices`.

## Verification

`tests/editable-geometry.cjs` passes: endpoint/bend/body geometry, hit/marquee tests, curved opening placement and occlusion, wall groups, corner/edge/anchor editing, concave floor containment, validation, independent clipboard/scene duplication, legacy projects and portable round trips.

All 39 runnable CJS suites passed. `tests/floors-browser.cjs` could not start because this isolated worktree has no `playwright` dependency; it was not counted as a passing suite. Native WebKit verification below exercises the actual renderer and pointer/property handlers.

`tests/editable-geometry-webkit.js` passed 34 checks in the existing desktop WebKit harness against synthetic in-memory storage only. Includes actual placement from the library, handles/body moves, atomic Undo/Redo/cancel/reset, selection priorities, shaped-floor image clipping verified with canvas pixels, independent cross-scene clipboard and grouped/scene duplication, portable save/reopen, actual rendered PNG and source preservation during export. The generated native PNG was visually inspected; the observed segmented highlight artifact was corrected by drawing all wall bodies before all centerlines. Evidence in this worktree: `.cache/geometry-qa/result.json` and `.cache/geometry-qa/export.png`.

This work does not publish, package, change version numbers, modify installed Scenic or real projects. Root owns the new portable format compatibility guard and isolated test app packaging/native manual acceptance. iPhone/iPad and Windows native tests remain separate; no claim those platforms were exercised here.
