# Scenic 1.4.28 (34): Windows VM candidate

This candidate includes the numbered-scene importer and the new independent object clipboard and scene duplication. Branch: `release/scenic-1.4.28-windows-clipboard`. It supersedes the older 1.4.26 Windows draft for testing. Keep the release draft and `publish_verified_windows=false` until actual Windows VM tests pass. Public Windows remains 1.4.24. CI alone does not authorize publication.

Use only a disposable QA profile and the synthetic `tests/assets/bathroom-clipboard.scenic` and `tests/fixtures/numbered-scenes-17-shots.csv` fixtures. Do not change a real project.

1. Install the exact downloaded candidate. Record its SHA256, candidate commit, Windows version and CI verification run. Cold launch, inspect version 1.4.28 and branding.
2. Open the bathroom fixture. Marquee-select the environment in Scene 1, Ctrl+C, select the existing later scene, Ctrl+V. Preserve relative positions, the source environment and the later scene's existing table. Check floor/reference images, grouped walls/openings, camera, talent, light and props; camera settings and movement marks remain editable. Move/change copies and verify Scene 1 remains unchanged.
3. Repeat Paste: copies get fresh IDs and a visible offset. Paste within Scene 1; check Undo/Redo operates once per paste, restores correct objects and remains independent. Copy a subset and switch scenes before pasting.
4. Right-click either scene in the sidebar and Duplicate scene. Repeat in Browse all scenes. Duplicate receives a separate scene and independent objects, groups, openings and shot links. Edit duplicate and verify source unchanged. Undo/Redo duplication.
5. Verify Ctrl+C / Ctrl+V work normally in title, notes, shot fields and native secondary windows. Unsupported plain text/HTML clipboard content must not create scene objects. Copy and immediately paste rapidly; native clipboard ordering must hold.
6. Save/open a portable copy, quit/relaunch and verify the copied/duplicated environments, all images and grouping persist. Reinstall the candidate and verify the QA workspace survives.
7. Run all seven numbered-scene/native import checks in `WINDOWS-1.4.26-VM-TESTING.md`, using this 1.4.28 candidate instead. Verify nine populated scenes/seventeen shots, complete metadata, camera links/checks, no duplicate reimport, legacy formats and native CSV/file picker activation and cancellation.

After VM passes, record evidence before publication. Refresh `desktop/windows-publication.json` from the then-current public Mac release and verify all exact retained asset digests. The old plan still targets Windows 1.4.24 and deliberately cannot publish 1.4.28. Preserve the newest public Mac feed and signed archive across `/releases/latest/download/`; do not overwrite immutable old releases. Publication must verify installer SHA256, latest.yml version/SHA512, remote commit and retained Mac bytes. Mac 1.4.27 notarization is currently blocked pending explicit Apple-upload approval, so do not assume it is public.

## Downloaded candidate verified

CI: https://github.com/OfficialSquidProductions/scenic-planner/actions/runs/41352614066 passed all checks, including 13 native checks each for packaged, installed and reinstalled app. Draft release ID `430873013` targets `b5a75b41f2e59ecd9b998db070efae2117b13bd2`; publication was skipped.

Local candidate: `release/windows34-vm-candidate/Scenic-Windows-Setup.exe`. SHA256: `6b97302d1137aadfd72a3db2f0c8598a7429876507ff18df26a3524d5bc770e2`. Downloaded installer, blockmap, latest.yml and checksum match all GitHub asset digests and CI evidence; latest.yml version/SHA512 matches the installer. Actual Windows VM testing remains outstanding.
