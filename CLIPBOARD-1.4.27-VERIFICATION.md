# Scenic 1.4.27 (33): independent environment copies

Selected editable scene items now support native Command+C / Command+V on Mac and Ctrl+C / Ctrl+V on Windows. The clipboard survives scene navigation. The first paste into another scene keeps the original coordinates and existing destination objects; same-scene and repeated pastes offset by 30 map units. Right-click a scene in the sidebar or scene-browser window and choose Duplicate scene. Copies receive fresh object, movement-mark, group-reference and associated shot IDs where required. Text fields and secondary native windows retain standard copy/paste.

## Verified

- All 30 existing shared regression suites passed, including CSV grouping, floor images, geometry, groups, portable persistence, native menus and Windows CSV activation safeguards.
- New object-copy, editor clipboard, and Windows menu suites passed. They cover mixed walls, wall groups, room/opening attachments, floors/reference images, cameras, actors, lights and props; fresh IDs; unsupported/malformed clipboard data; text focus; rapid native copy/paste ordering; limits; repeat paste; undo/redo; save/reopen and duplicate independence.
- The final universal Mac app packaged editor passed 37 native WebKit/private-pasteboard checks using the production native clipboard helper and the synthetic bathroom fixture. The packaged numbered-scene importer passed all 13 native WebKit checks.
- Actual keyboard test in an isolated, development-signed Mac sandbox app: marquee selected the bathroom, Command+C, navigate to an existing later scene, Command+V. Destination increased from one object to thirteen, retaining its existing object; source stayed intact. Command+Z restored one object; Command+Shift+Z restored thirteen. Right-click Duplicate scene created an independent third scene. Quit/reopen restored all three scenes and thirteen destination/copy objects. Real user projects were not opened or changed.
- Universal Mac distribution app built and Developer ID signed; native storage checks passed. No App Store or Windows clipboard build has been published yet.

## Release checkpoint

The direct Mac candidate is 1.4.27 (33). Its Developer ID archive is `release/Scenic-Standalone-1.4.27-33.xcarchive`. Initial Apple notarization upload review rejected the operation before execution over a proprietary-disclosure concern. New checks verified the repository is public, the bundled license is MIT, the candidate matches the pushed source, and the package contains no project files or credentials. A single reviewed retry was approved. Upload and notarized export succeeded; signature verification, stapled ticket and Gatekeeper all passed as Notarized Developer ID. The original Sparkle public key/account/feed remain unchanged.

The signed update is ready for publication. Preserve the exact public Windows 1.4.24 assets from v1.4.25; do not substitute the unpublished newer Windows installer.
The existing Mac and iPhone/iPad App Store 1.4.26 (32) submissions were refreshed and verified Waiting for Review. They contain the scene-import fix, not these clipboard features. Replacing pending Store builds needs coordination; no submission has been withdrawn or changed for this feature.

The staged Windows candidate is 1.4.28 (34), keeping the next Mac release immutable and preserving the existing shared latest-download updater URLs. It must remain draft until actual Windows VM testing passes, including Ctrl+C/Ctrl+V across scenes and scene duplication.

Windows CI run https://github.com/OfficialSquidProductions/scenic-planner/actions/runs/41352614066 passed all shared and new clipboard suites, packaged/installed/reinstalled native checks (13 each), silent installation and preserving reinstall. Draft v1.4.28 targets `b5a75b41f2e59ecd9b998db070efae2117b13bd2`; actual Windows VM testing remains outstanding. Candidate SHA256: `6b97302d1137aadfd72a3db2f0c8598a7429876507ff18df26a3524d5bc770e2`. Local installer is `release/windows34-vm-candidate/Scenic-Windows-Setup.exe`.
