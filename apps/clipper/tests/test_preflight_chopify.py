import json
import tempfile
import unittest
from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from preflight_chopify import run_preflight

class PreflightTests(unittest.TestCase):
 def test_missing_engine_is_not_ready_without_installing(self):
  with tempfile.TemporaryDirectory() as temp:
   base=Path(temp)
   report=run_preflight(base/"missing",sys.executable,base/"media",base/"clips")
   self.assertFalse(report["ready"])
   self.assertEqual(report["status"],"not_ready")
   self.assertFalse(report["checks"]["chopify_entrypoint"]["available"])
   self.assertTrue((base/"media").is_dir())
   self.assertTrue((base/"clips").is_dir())
   self.assertIn("não instala",report["note"])

 def test_engine_files_are_detected(self):
  with tempfile.TemporaryDirectory() as temp:
   base=Path(temp); engine=base/"engine"; engine.mkdir()
   (engine/"chopify.py").write_text("# placeholder",encoding="utf-8")
   (engine/"requirements.txt").write_text("numpy",encoding="utf-8")
   report=run_preflight(engine,sys.executable,base/"media",base/"clips")
   self.assertTrue(report["checks"]["chopify_directory"]["available"])
   self.assertTrue(report["checks"]["chopify_entrypoint"]["available"])
   self.assertTrue(report["checks"]["requirements_file"]["available"])

if __name__=="__main__":
 unittest.main()
