# Scenic 1.4.30 (36): scene tools and exports

This expanded candidate includes the earlier scene.shot CSV fix and independent clipboard/scene duplication plus all requested scene-tool updates. Windows 1.4.29 remains public and its native Edit roles, CSV activation and destroyed-scene-window guard are preserved in source. No Windows publication is part of this candidate. After explicit user approval, both queued App Store 1.4.26 (32) submissions were replaced with the tested 1.4.30 (36) builds. Both new submissions are Waiting for Review.

## Implemented behavior

- Shot List right-click, keyboard and touch Actions deletion. Imported-shot removal keeps and unlinks map cameras; camera-only setup removal explains the map effect and asks for confirmation. Stale/other-scene targets are rejected. Coverage toggles retain the actual list nodes, scroll, focus, selection and open details.
- Actors/cameras take selection priority in doorways; frame/leaf regions remain selectable. Enlarged mobile transform handles do not steal deliberate taps on another foreground object.
- Selected camera/light information boxes drag independently with persistent relative offsets, matching-color connector lines and an object Properties checkbox to hide connectors. Reset position is available.
- Text and Curved arrow icons are in the top toolbar. Editable multiline text supports proportional corner and exact-size scaling. Three arrow handles move start/bend/tip; Properties provides color, scale and line thickness. Text beyond the visible 100-line/10,000-character limit remains an explicit unsaved draft rather than silently losing its tail.
- Props include Coffee mug, Drinking cup and Paper cup; Set includes Couch / sofa. Existing mug/sofa asset IDs remain stable.
- Scene browser Export all writes one ordered multipage PDF or separate native PNG files with progress/cancel, safe ordered names and collision handling. Single PNG and batch output share a frozen renderer framed below the header, including far-displaced labels and large arrows without the interactive minimum zoom. Navigation during image decoding cannot change the captured PNG/name. PDFs are raster scenes at 1800×1250; browser PNG fallback is a ZIP.
- Native iPhone/iPad Copy items/Paste items and actual Command+C/V preserve text-field editing. Clipboard, group references, new annotation geometry, movement marks, scene duplication, undo/redo and portable persistence are integrated.

## Verified evidence

- All 30 existing shared/model/menu/import/file/persistence regression suites passed, along with the new annotation, editor, shot-action and batch-export suites and clipboard/native-Windows-role tests. Release-note generation tests passed.
- Final universal Mac packaged resources passed 29 native annotation/hit-testing checks, 40 shot-list checks, 13 scene-numbered CSV checks and 37 native clipboard checks. The final Mac Store runtime JS matches the tested standalone resources exactly and includes no Sparkle framework/plist keys.
- Final packaged renderer passed 22 native export checks and five native output checks. Actual PDFs parse into ordered scene pages, PNGs are 1800×1250, extreme annotation extents fit, interrupted navigation gives byte-identical captured maps, and cancellation/save errors restore source/viewport/selection/undo. Rendered PDF pages were visually inspected with floor/reference imagery, colors, text, curves, connectors and new catalog items.
- Both dedicated iPhone and iPad simulators passed 29 annotation checks, 40 shot-list checks and four native catalog placements, plus eight cold-launch checks each. Native clipboard passed 37 checks and seven cold-launch checks each. Actual keyboard Command+C/V and touch copy/paste/duplication passed, including normal text editing on both devices.
- Actual Files UI tests passed on both devices: PDF native destination, cancel/retry then successful save, separate PNG folder saves twice, collision-safe system Keep Both handling and preserved source object count.
- In an isolated signed Mac sandbox app, actual top-toolbar text placement/editing, arrow placement/middle-handle drag/color picker/scale and quit/reopen passed. Native PDF Save and PNG destination-folder dialogs succeeded; cancel/retry and repeated exports produced two distinct two-file folders. Native GUI PDF parsed as two pages. Real user projects were not opened or changed.

## Candidate state

Standalone universal Mac, distribution-signed sandbox Mac Store archive and signed iPhone/iPad Release archive are built as 1.4.30 (36). iOS Release excludes every smoke fixture/test dataset. Standalone Mac is notarized and published at https://github.com/OfficialSquidProductions/scenic-planner/releases/tag/v1.4.30, targeting `580d03b0da825d6c10aa6a4b44b6ec281e6d6a97`. All ten uploaded asset digests and public unauthenticated Mac download/feed bytes were verified, including the original Sparkle signing key, stapled ticket and Gatekeeper. Windows 1.4.29 installer/feed assets are byte-identical to v1.4.29. Apple Mac and iPhone/iPad 1.4.30 (36) submissions are Waiting for Review; these features were not in the earlier build 32. Future Windows changes require actual native VM verification before publication, preserving current public Windows 1.4.29 and the newest signed Mac updater assets.

The initial iPhone Files run executed zero tests and was excluded. The fresh runner explicitly executed two tests with zero failures, including keyboard/text editing and Files export/Keep Both. Its evidence is `.cache/scenetools36-iphone-export-verified.xcresult`; iPad Files evidence is `.cache/scenetools36-ipad-export.xcresult`. The first Apple upload attempts were rejected before execution by automatic approval review citing the earlier Store hold. The user subsequently gave explicit approval to upload both new builds and replace both queued reviews, acknowledging the review wait may restart. One bounded retry per upload succeeded; Apple processed both builds. Both old submissions were freshly verified Waiting for Review, canceled through the supported workflow, and replaced without changing pricing, privacy, review contact details, screenshots or automatic release after approval.

## Verified Apple submissions

| Platform | Version/build | Build ID | Submission ID | Verified state |
| --- | --- | --- | --- | --- |
| Mac App Store | 1.4.30 (36) | `745b53d9-3bdd-46b4-9bc3-e1a4b7c3023f` | `36e15d17-62c1-454f-a9e5-6a806d9b643b` | Waiting for Review |
| iPhone/iPad App Store | 1.4.30 (36) | `b02d71b5-9cfc-4fb8-9320-40c5bd21cdc0` | `2ba1bbd9-2ddc-4b02-a53f-a6ec8eae0330` | Waiting for Review |

Mac receipt: https://appstoreconnect.apple.com/apps/6823691617/distribution/reviewsubmissions/details/36e15d17-62c1-454f-a9e5-6a806d9b643b (Nov 1, 2026 7:14 PM EST / Nov 2 00:14 UTC).

iPhone/iPad receipt: https://appstoreconnect.apple.com/apps/6823691617/distribution/reviewsubmissions/details/2ba1bbd9-2ddc-4b02-a53f-a6ec8eae0330 (Nov 1, 2026 7:17 PM EST / Nov 2 00:17 UTC).

Submission is not approval or availability. Existing Store 1.4.23 (29) remains Ready for Distribution until Apple approves and releases the updates. Public GitHub Mac 1.4.30 and Windows 1.4.29 are unchanged. Windows 1.4.31 remains a draft candidate awaiting actual native VM testing; its successful CI does not substitute for that acceptance test.
