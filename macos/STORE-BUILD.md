# Mac TestFlight packaging

`tools/build_macos_store.py` builds a separate universal native AppKit/WKWebView
archive for macOS 13.3 or later. The existing Developer ID build and Sparkle
updater remain in `tools/build_macos.py` and `macos/Updates.swift`.

The Mac platform was added to existing App Store Connect app `6823691617`.
Its inspected bundle ID is `org.squidproductions.scenic.ipad`; the public direct
download continues to use `org.squidproductions.scenic`.

For a local sandbox check, supply an existing Apple Development SHA-1:

```sh
python3 tools/build_macos_store.py --output /absolute/new/output \
  --bundle-id org.squidproductions.scenic.ipad \
  --identity EXISTING_DEVELOPMENT_SHA1 --local-development
```

For distribution, omit `--local-development` and supply the existing Apple
Distribution SHA-1, an existing Mac App Store provisioning profile using that
certificate, and `--installer-identity EXISTING_MAC_INSTALLER_SHA1`.
The tool validates the profile's Mac platform, team, bundle ID, beta entitlement,
and signing certificate. It emits manual export/upload options with
`testFlightInternalTestingOnly=true` and automatic version changes disabled.
It does not create credentials or profiles, upload, or change account settings.
Never use `-allowProvisioningUpdates` to work around missing signing assets.

Only `StoreUpdates.swift` is compiled for Store builds. Sparkle and its feed
settings are absent; updates belong to TestFlight/App Store. The packaged web
changelog footer has matching wording. All other shared web assets remain exact
copies. Native file-open uses security-scoped access; file pickers receive
user-selected read/write access. Workspace storage stays inside the app sandbox.
To test existing direct-download productions, import a portable `.scenic` copy;
the Store app does not read or migrate the direct-download app's private files.

The development archive is local validation only. Distribution signing, Apple's
processing, and the existing owner group's Testing state must all be verified
before claiming a Mac TestFlight release. Native save/open/share dialogs and
real TestFlight installation remain owner acceptance checks.
