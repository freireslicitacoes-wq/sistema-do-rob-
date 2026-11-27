import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from run_chopify import run_job


class ChopifyAdapterTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.base = Path(self.temp.name)
        self.media = self.base / "media"
        self.media.mkdir()
        self.engine = self.base / "chopify"
        self.engine.mkdir()
        (self.engine / "chopify.py").write_text("# test engine", encoding="utf-8")
        self.source = self.media / "video.mp4"
        self.source.write_bytes(b"not a real video")
        self.output = self.base / "clips"

    def tearDown(self):
        self.temp.cleanup()

    @patch("run_chopify.subprocess.run")
    def test_invokes_chopify_in_vertical_mode_and_returns_exports(self, mocked):
        def fake_run(command, **kwargs):
            export_dir = Path(command[command.index("--out") + 1])
            (export_dir / "clip-01.mp4").write_bytes(b"clip")
            return type("Result", (), {"returncode": 0, "stdout": "ok", "stderr": ""})()
        mocked.side_effect = fake_run
        result = run_job(self.source, self.media, self.output, self.engine, "python", 3, 8.0)
        self.assertEqual(result["status"], "succeeded")
        command = mocked.call_args.args[0]
        self.assertIn("9:16", command)
        self.assertIn("--no-input", command)
        self.assertIn("--device", command)
        self.assertEqual(len(result["clips"]), 1)

    @patch("run_chopify.subprocess.run")
    def test_refuses_source_outside_media_root(self, mocked):
        other = self.base / "outside.mp4"
        other.write_bytes(b"x")
        with self.assertRaisesRegex(ValueError, "dentro da biblioteca"):
            run_job(other, self.media, self.output, self.engine, "python", 3, 8.0)
        mocked.assert_not_called()

    @patch("run_chopify.subprocess.run")
    def test_nonzero_engine_exit_is_not_success(self, mocked):
        mocked.return_value = type("Result", (), {"returncode": 1, "stdout": "", "stderr": "error"})()
        result = run_job(self.source, self.media, self.output, self.engine, "python", 3, 8.0)
        self.assertEqual(result["status"], "failed")


if __name__ == "__main__":
    unittest.main()
