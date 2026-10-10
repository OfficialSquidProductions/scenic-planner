# Contributing

Use a local checkout and a feature branch. The editor is buildless JavaScript in `dist/` and uses no remote services. Run the four Node test scripts in `tests/` before opening a pull request. Keep project storage backward compatible and preserve portable `.scenic` imports.

The native Mac shell is in `macos/`; Windows Electron files are in `windows/`. Test a change on the affected platform. Save failures must block application updates. Keep Node integration disabled in the Windows renderer and validate native bridge callers and payloads.

Do not include user projects, reference images, screenshots of private productions, caches, proprietary font files, signing keys, credentials, or built binaries in source commits. Use synthetic productions for tests. Report security issues privately through the contact listed on Squid Productions' GitHub profile rather than publishing exploit credentials or private project content.

Only maintainers publish official updates. Forks must use their own application identity, signing key, release feed, and branding.
