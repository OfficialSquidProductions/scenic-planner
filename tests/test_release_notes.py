import json
from pathlib import Path
import sys
import tempfile
import unittest
import xml.etree.ElementTree as ET

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools"))
from release_notes import load_changelog, prepare_release_notes
from macos_updates import validate_release_notes


class ReleaseNotesTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.root = Path(self.directory.name)
        (self.root / "desktop").mkdir()
        (self.root / "dist").mkdir()
        self.config = {"version": "1.4.13"}

    def write(self, entries):
        (self.root / "desktop/changelog.json").write_text(json.dumps(entries))

    def test_same_changes_reach_all_displays(self):
        self.write([{"version": "1.4.13", "changes": ["Cameras & lights", '<script>alert("test")</script>']},
                    {"version": "1.4.12", "changes": ["Previous changes"]}])
        notes = prepare_release_notes(self.config, self.root).read_text()
        self.assertIn("Cameras &amp; lights", notes)
        self.assertIn("&lt;script&gt;", notes)
        self.assertNotIn("Previous changes", notes)
        text = (self.root / "desktop/release-notes.txt").read_text()
        self.assertIn("Scenic 1.4.13", text)
        self.assertIn("Cameras & lights", text)
        script = (self.root / "dist/changelog.js").read_text()
        self.assertNotIn("<script>", script)
        payload = json.loads(script.split("window.ScenicChangelog = ")[1].removesuffix(";\n"))
        self.assertEqual(payload["entries"], load_changelog(self.config, self.root))

    def test_unwritten_or_inconsistent_notes_block_build(self):
        for entries in [[], [{"version": "1.4.12", "changes": ["Old notes"]}],
                        [{"version": "1.4.13", "changes": []}],
                        [{"version": "1.4.13", "changes": [" "]}],
                        [{"version": "1.4.13", "changes": ["New"]}, {"version": "1.4.13", "changes": ["Duplicate"]}],
                        [{"version": "1.4.13", "changes": ["New"]}, {"version": "1.4.14", "changes": ["Wrong order"]}]]:
            with self.subTest(entries=entries):
                self.write(entries)
                with self.assertRaises(ValueError):
                    prepare_release_notes(self.config, self.root)

    def test_feed_requires_embedded_notes(self):
        for xml in ["<item/>", "<item><description> </description></item>",
                    "<item><releaseNotesLink>https://example.test/notes</releaseNotesLink></item>"]:
            with self.assertRaises(RuntimeError):
                validate_release_notes(ET.fromstring(xml))
        validate_release_notes(ET.fromstring("<item><description><![CDATA[<h2>New version</h2><ul><li>Changes</li></ul>]]></description></item>"))


if __name__ == "__main__":
    unittest.main()
