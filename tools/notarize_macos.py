#!/usr/bin/env python3
"""Prepare existing Mac apps for Developer ID distribution through Xcode Organizer.

Copies into a new archive, signs nested code inside-out, and never changes the
input app or exports credentials. Xcode can upload the resulting .xcarchive
using its signed-in Apple Developer account.
"""
import argparse
from datetime import datetime, timezone
from pathlib import Path
import plistlib
import shutil
import subprocess
import tempfile

MACHO_MAGIC = {bytes.fromhex(s) for s in (
    'feedface', 'cefaedfe', 'feedfacf', 'cffaedfe',
    'cafebabe', 'bebafeca', 'cafebabf', 'bfbafeca')}


def run(*args):
    subprocess.run([str(arg) for arg in args], check=True)


def native_file(path):
    if path.is_symlink() or not path.is_file():
        return False
    with path.open('rb') as stream:
        return stream.read(4) in MACHO_MAGIC


def sign_app(app, identity, preserve_apps=()):
    preserved = []
    for relative in preserve_apps:
        target = app / relative
        if target == app or target.is_symlink() or target.suffix != '.app' or not target.resolve().is_relative_to(app.resolve()):
            raise ValueError('Only a nested app inside the distribution bundle can be preserved.')
        run('codesign', '--verify', '--deep', '--strict', target)
        run('xcrun', 'stapler', 'validate', target)
        preserved.append(target)
    def protected(path):
        return any(path == target or path.is_relative_to(target) for target in preserved)
    paths = list(app.rglob('*'))
    binaries = [p for p in paths if not protected(p) and native_file(p)]
    bundles = [p for p in paths if not p.is_symlink() and p.is_dir()
               and p.suffix in ('.app', '.xpc', '.framework', '.bundle')
               and any(b.is_relative_to(p) for b in binaries)]
    targets = binaries + sorted(bundles, key=lambda p: len(p.parts), reverse=True) + [app]
    with tempfile.TemporaryDirectory(prefix='developer-id-entitlements-') as temp:
        for index, target in enumerate(targets):
            displayed = subprocess.run(['codesign', '--display', '--entitlements', '-', '--xml', str(target)],
                                       capture_output=True, check=False)
            entitlements = plistlib.loads(displayed.stdout) if displayed.stdout.strip() else {}
            entitlements.pop('com.apple.security.get-task-allow', None)
            if str(entitlements.get('com.apple.application-identifier', '')).startswith('com.apple.'):
                # Apple's bundled Python identifies itself as com.apple.python3.
                # A third-party Developer ID cannot claim that reserved identity.
                entitlements.pop('com.apple.application-identifier')
            command = ['codesign', '--force', '--sign', identity, '--options', 'runtime', '--timestamp']
            # Always replace the entitlement blob, including when it is empty.
            # Otherwise codesign can retain invalid Apple-only entitlements from
            # the Python runtime supplied with Xcode.
            file = Path(temp) / (str(index) + '.plist')
            file.write_bytes(plistlib.dumps(entitlements))
            command += ['--entitlements', str(file)]
            run(*command, target)
    run('codesign', '--verify', '--deep', '--strict', '--verbose=2', app)
    print(f'Signed {len(binaries)} Mach-O files and {len(bundles)+1} bundles: {app.name}', flush=True)


def prepare(app, archive, identity, team, preserve_apps=()):
    app, archive = app.resolve(), archive.resolve()
    if archive.exists():
        raise ValueError('Archive already exists; use a fresh output path.')
    if archive.suffix != '.xcarchive' or archive.is_relative_to(app):
        raise ValueError('Choose a new .xcarchive path outside the input app.')
    info = plistlib.loads((app / 'Contents/Info.plist').read_bytes())
    if app.suffix != '.app' or not (app / 'Contents/MacOS' / info['CFBundleExecutable']).is_file():
        raise ValueError('Choose a complete Mac application bundle.')
    destination = archive / 'Products/Applications' / app.name
    destination.parent.mkdir(parents=True)
    shutil.copytree(app, destination, symlinks=True)
    sign_app(destination, identity, preserve_apps)
    properties = {
        'ApplicationPath': 'Applications/' + app.name,
        'CFBundleIdentifier': info['CFBundleIdentifier'],
        'CFBundleShortVersionString': info['CFBundleShortVersionString'],
        'CFBundleVersion': info['CFBundleVersion'],
        'SigningIdentity': identity, 'Team': team,
    }
    metadata = {'ArchiveVersion': 2, 'CreationDate': datetime.now(timezone.utc).replace(tzinfo=None),
                'Name': info.get('CFBundleDisplayName', app.stem), 'SchemeName': app.stem,
                'ApplicationProperties': properties}
    (archive / 'Info.plist').write_bytes(plistlib.dumps(metadata))
    print('Xcode archive ready: ' + str(archive), flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--app', required=True, type=Path)
    parser.add_argument('--archive', required=True, type=Path)
    parser.add_argument('--identity', required=True, help='Existing Developer ID Application name or SHA-1')
    parser.add_argument('--team', required=True)
    parser.add_argument('--preserve-app', type=Path, action='append', default=[],
                        help='Relative path of a signed, stapled nested app to preserve intact')
    args = parser.parse_args()
    prepare(args.app, args.archive, args.identity, args.team, args.preserve_app)


if __name__ == '__main__':
    main()
