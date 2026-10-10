# Scenic

Free, open-source top-down scene, shot, and lighting planning by Squid Productions. Runs offline on Mac and Windows.

Download from **https://scenic.squidproductions.org/** or [GitHub Releases](https://github.com/OfficialSquidProductions/scenic-planner/releases/latest). Source is licensed under MIT.

## Mac app

Open `release/Scenic.app` from Finder. It runs offline in its own window without a browser, server, account, or runtime installation. The application can be moved into Applications and pinned to the Dock. It supports Apple Silicon and Intel Macs running macOS 13.3 or newer.

Projects autosave atomically to `~/Library/Application Support/Scenic/workspace.json`, with the previous save in `workspace.previous.json`. Pending edits are flushed when closing the window or quitting. Updating the app does not replace project data.

Use File > Open Project, Save Project As, Import Image, and Export Map for native file dialogs. Save Project As exports the existing portable `.scenic` format, so web projects can be transferred into the app. File > Save immediately saves the local workspace.

Build with `python3 tools/build_macos.py` using Xcode command-line tools. The script creates a universal app and a verified disk image in `release/`. The app uses AppKit and WebKit supplied by macOS; it bundles only the editor, logo, and icon. No commercial font files or user projects are included. This personal build is ad-hoc signed, not notarized for public distribution.

## Windows app

Download `Scenic-Windows-Setup.exe` from the release page. Windows 10/11 x64 is supported. The installer includes the editor and Electron; no separate runtime, browser, account, or server is needed. Installation is per user. Projects are stored in `%APPDATA%/scenic-planner/workspace.json`, with a previous-save backup, outside the application directory. Upgrading and uninstalling retain these files. Use portable `.scenic` exports to transfer productions between Mac and Windows.

Build on Windows with Node 22 and Python 3.12: `python -m pip install Pillow==11.3.0`, then `python tools/build_windows.py` and `python tools/check_windows.py`. The GitHub workflow runs geometry, catalog, model, and native-storage tests; opens the packaged editor; installs the EXE silently; exercises the installed editor; and verifies reinstall preserves saved data. Test reports and screenshots are workflow artifacts. Release publication follows successful checks.

## Updates and releases

Scenic → Check for Updates checks the official GitHub release channel. Daily automatic checks default on. Automatic downloading/installation defaults off and can be enabled in the Updates submenu. Both platforms require a successful workspace save before installing an update; failed saves block installation and offer retry. Updates replace the app only.

Mac uses Sparkle 2.10.0 and Ed25519-signed archives, verified before extraction. Windows uses Electron Updater with HTTPS and SHA-512 validation. The builds are not Developer ID notarized or Authenticode signed; the download page describes first-launch prompts.

Release metadata is in `desktop/release.json`. Increase both version and build before publishing a new release. `python3 tools/fetch_sparkle.py` downloads the pinned framework and validates its checksum. Create a publisher key once with Sparkle's `generate_keys --account scenic-planner`; put only the public key in release.json. Never commit or upload the private key. `python3 tools/build_macos.py --update-release` produces the universal app, DMG, signed ZIP, and appcast. `python3 tools/check_macos_updates.py` tests save blocking/retry and verifies archive signatures, tamper rejection, and unrelated-key rejection. Upload the Mac archive before its matching appcast to the same versioned GitHub release as Windows. Published archives are immutable.

The website source is `website/`. The Pages workflow deploys only that directory and the two branding assets. Custom DNS is a CNAME for `scenic` pointing to `officialsquidproductions.github.io`; preserve other DNS records.

## Browser version (optional)

Double-click `Launch Scenic.command`, or run:

```sh
python3 -m http.server 5173 --bind 127.0.0.1 --directory dist
```

Open http://127.0.0.1:5173 in a browser. No installation or build is required.

## Use

- Pick Wall, Camera, or Talent and click on the canvas. Open Props for handheld objects, Set for vehicles and room furnishings, or Lights for studio fixtures, practicals, and sunlight. Search from any tab across all three libraries. Drag the panel dividers to widen the library or Properties. Drag the horizontal divider below Scenes up or down to trade scene-list space for item browsing. The banner and Settings stay pinned at the bottom. Focused dividers also support arrow keys and Home.
- Use the Productions dropdown to switch between projects, or + to create one. Each production keeps its own scenes. Right-click a scene to delete it. Settings provides appearance controls and Delete project, which removes the current production and all its scenes. Undo restores deletions until Scenic closes.
- Draw walls with two clicks. Drag walls or their endpoints to adjust them.
- Drag objects to move them; edit size, direction, and placement in Properties. Scene layers is a separate tab beside Properties, so it does not consume property-editing space. Selecting a layer opens that object’s properties.
- Measurements use inches below 12 inches, then feet and inches. Enter sizes as `8 in`, `5 ft 6 in`, `5' 6"`, or a bare number of inches. Grid dots are 1 foot apart, snapping is 1 inch, and the map includes a zoom-aware scale bar. Existing layouts retain their coordinates at three world units per inch. Scale a reference image to a known real-world width in Properties.
- Adjust light intensity, color temperature, beam angle, radius, and direction. RGB sliders replace the light behavior note; moving a channel enables RGB color, and the toggle restores temperature mode without losing the chosen RGB channels. Add one Sun per scene, then set time of day, daylight hours, and sunrise/sunset compass bearings.
- Doors and windows snap to nearby walls and follow wall edits. Door controls set open/closed, hinge side, and opening direction. Uncovered windows transmit light; closed curtains block it.
- Select talent, a camera, or a fixture and Record A. Move it and Record B, C, and more, or place each mark directly on the map. Add action notes and preview the movement along the visible route. Recorded marks stay fixed when the object moves; previews do not change the saved position. Play scene beside Undo/Redo starts all recorded routes together, using each object’s preview duration. Pause/Resume keeps every object on the same clock; Replay restarts the scene.
- Import PNG, JPEG, or WebP images, or drag them onto the canvas. Adjust size, opacity, rotation, and locking. Trace walls over the image to block lighting.
- Name cameras, record shot size and lens, and add notes. Camera setups populate the Shot list automatically.
- Add, duplicate, and delete scenes. Undo and redo edits with Command/Ctrl Z and Shift Command/Ctrl Z.
- Scroll to zoom; Space + drag to pan; 0 fits the scene.
- Save project downloads the current production as a portable `.scenic` file including imported images and movement marks. Open project adds it to the Productions list.
- Export map produces a high-resolution PNG; the Shot list can export CSV.

## Storage and lighting

The Mac app saves durable JSON in Application Support. The optional browser version autosaves in IndexedDB in that browser on that device. The hosted and localhost versions have separate browser storage. Download a project backup to transfer work or keep it safe from browser data clearing. No project data is sent to a server. Update checks contact GitHub for metadata and downloads; they can be disabled.

Lighting is an artistic 2D approximation of direct light, with radial falloff, directional sunlight, and hard wall shadows. The Sun uses the daylight hours and bearings you enter; it is not a date/location-based solar calculator. It does not calculate height, bounce light, real fixture photometrics, or calibrated lux. Furniture and talent are symbols, and do not cast shadows. Images do not automatically create walls.

## Branding

Uses the supplied blue SP icon for the Mac app, the transparent red SP logo in the header, and the small Squid Productions banner, Spanish Red (#E60026), light and dark palettes, Futura, and locally available Reross Quadratic for headings. Commercial fonts are referenced by local font name rather than redistributed; devices without these fonts use system sans-serif fallbacks.

## Verification

Run `node tests/geometry.cjs`, `node tests/catalog.cjs`, `node tests/model.cjs`, and `node tests/windows-store.cjs` to verify measurements, catalog validation, occlusion, wall attachments, door/window behavior, movement, sunlight, and multi-production storage migration. Source is buildless HTML/CSS/JavaScript in `dist/`.
