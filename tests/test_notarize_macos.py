"""Distribution-signing contracts, without Keychain access or network uploads."""
import importlib.util
from pathlib import Path
import plistlib
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('notarize_macos', Path(__file__).resolve().parents[1] / 'tools/notarize_macos.py')
signing = importlib.util.module_from_spec(spec)
spec.loader.exec_module(signing)


def fixture(path, identifier='org.example.test'):
    (path / 'Contents/MacOS').mkdir(parents=True)
    (path / 'Contents/Info.plist').write_bytes(plistlib.dumps({
        'CFBundleExecutable': 'Main', 'CFBundleIdentifier': identifier,
        'CFBundleShortVersionString': '1.0.0', 'CFBundleVersion': '1'}))
    (path / 'Contents/MacOS/Main').write_bytes(bytes.fromhex('cffaedfe') + b'synthetic')
    return path


class SigningContracts(unittest.TestCase):
    def test_restricted_entitlements_removed_and_hardening_required(self):
        with tempfile.TemporaryDirectory() as directory:
            app = fixture(Path(directory) / 'Test.app')
            original = {'com.apple.application-identifier': 'com.apple.python3',
                        'com.apple.security.get-task-allow': True,
                        'com.apple.security.app-sandbox': True}
            payloads = []
            def record(*args):
                if '--sign' in args:
                    self.assertIn('--timestamp', args)
                    self.assertEqual(args[args.index('--options') + 1], 'runtime')
                    payloads.append(plistlib.loads(Path(args[args.index('--entitlements') + 1]).read_bytes()))
            with patch.object(signing.subprocess, 'run', return_value=SimpleNamespace(stdout=plistlib.dumps(original))), patch.object(signing, 'run', side_effect=record):
                signing.sign_app(app, 'Developer ID Application: Test')
            self.assertTrue(payloads)
            for payload in payloads:
                self.assertNotIn('com.apple.application-identifier', payload)
                self.assertNotIn('com.apple.security.get-task-allow', payload)
                self.assertTrue(payload['com.apple.security.app-sandbox'])

    def test_stapled_nested_app_is_verified_and_never_resigned(self):
        with tempfile.TemporaryDirectory() as directory:
            outer = fixture(Path(directory) / 'Installer.app')
            inner = fixture(outer / 'Contents/Resources/Inner.app')
            ticket = inner / 'Contents/CodeResources'
            ticket.write_bytes(b'synthetic notarization ticket')
            calls = []
            with patch.object(signing.subprocess, 'run', return_value=SimpleNamespace(stdout=b'')), patch.object(signing, 'run', side_effect=lambda *args: calls.append(args)):
                signing.sign_app(outer, 'Developer ID Application: Test', [Path('Contents/Resources/Inner.app')])
            self.assertIn(('xcrun', 'stapler', 'validate', inner), calls)
            self.assertIn(('codesign', '--verify', '--deep', '--strict', inner), calls)
            signed = [Path(args[-1]) for args in calls if '--sign' in args]
            self.assertEqual(signed[-1], outer)
            self.assertFalse(any(p == inner or p.is_relative_to(inner) for p in signed))
            self.assertEqual(ticket.read_bytes(), b'synthetic notarization ticket')

    def test_input_bundle_is_preserved_and_archive_metadata_matches(self):
        with tempfile.TemporaryDirectory() as directory:
            source = fixture(Path(directory) / 'Input.app')
            archive = Path(directory) / 'Output.xcarchive'
            before = {p.relative_to(source): p.read_bytes() for p in source.rglob('*') if p.is_file()}
            with patch.object(signing, 'sign_app'):
                signing.prepare(source, archive, 'Developer ID Application: Test', 'TEAM123456')
            self.assertEqual(before, {p.relative_to(source): p.read_bytes() for p in source.rglob('*') if p.is_file()})
            metadata = plistlib.loads((archive / 'Info.plist').read_bytes())
            self.assertEqual(metadata['ApplicationProperties']['CFBundleIdentifier'], 'org.example.test')
            self.assertEqual(metadata['ApplicationProperties']['Team'], 'TEAM123456')
            self.assertEqual(metadata['ApplicationProperties']['ApplicationPath'], 'Applications/Input.app')

    def test_unsafe_destinations_and_preservation_paths_are_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            app = fixture(Path(directory) / 'Input.app')
            for destination in [app / 'recursive.xcarchive', Path(directory) / 'not-an-archive']:
                with self.assertRaises(ValueError):
                    signing.prepare(app, destination, 'Test', 'TEAM123456')
            with self.assertRaises(ValueError):
                signing.sign_app(app, 'Test', [Path('../Outside.app')])


if __name__ == '__main__':
    unittest.main()
