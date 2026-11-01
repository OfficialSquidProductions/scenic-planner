# Scenic 1.4.27 (33): independent environment copies

Selected editable scene items now support native Command+C / Command+V on Mac and Ctrl+C / Ctrl+V on Windows. The clipboard survives scene navigation. The first paste into another scene keeps the original coordinates and existing destination objects; same-scene and repeated pastes offset by 30 map units. Right-click a scene in the sidebar or scene-browser window and choose Duplicate scene. Copies receive fresh object, movement-mark, group-reference and associated shot IDs where required. Text fields and secondary native windows retain standard copy/paste.

## Verified

- All 30 existing shared regression suites passed, including CSV grouping, floor images, geometry, groups, portable persistence, native menus and Windows CSV activation safeguards.
- New object-copy, editor clipboard, and Windows menu suites passed. They cover mixed walls, wall groups, room/opening attachments, floors/reference images, cameras, actors, lights and props; fresh IDs; unsupported/malformed clipboard data; text focus; rapid native copy/paste ordering; limits; repeat paste; undo/redo; save/reopen and duplicate independence.
- The final universal Mac app packaged editor passed 37 native WebKit/private-pasteboard checks using the production native clipboard helper and the synthetic bathroom fixture. The packaged numbered-scene importer passed all 13 native WebKit checks.
- Actual keyboard test in an isolated, development-signed Mac sandbox app: marquee selected the bathroom, Command+C, navigate to an existing later scene, Command+V. Destination increased from one object to thirteen, retaining its existing object; source stayed intact. Command+Z restored one object; Command+Shift+Z restored thirteen. Right-click Duplicate scene created an independent third scene. Quit/reopen restored all three scenes and thirteen destination/copy objects. Real user projects were not opened or changed.
- Universal Mac distribution app built and Developer ID signed; native storage checks passed. No App Store or Windows clipboard build has been published yet.

## Release checkpoint

The direct Mac candidate is 1.4.27 (33). Its Developer ID archive is `release/Scenic-Standalone-1.4.27-33.xcarchive`. Apple notarization upload was rejected by automatic approval review before execution: the reviewer requested explicit authorization to disclose this new build to Apple. No upload occurred, and the operation has not been retried or bypassed. Public Mac GitHub release therefore remains 1.4.25 (31), and public Windows remains 1.4.24.

The existing Mac and iPhone/iPad App Store 1.4.26 (32) submissions were refreshed and verified Waiting for Review. They contain the scene-import fix, not these clipboard features. Replacing pending Store builds needs coordination; no submission has been withdrawn or changed for this feature.

Next Windows candidate will be 1.4.28 (34), keeping the next Mac release immutable and preserving the existing shared latest-download updater URLs. It must remain draft until actual Windows VM testing passes, including Ctrl+C/Ctrl+V across scenes and scene duplication.
