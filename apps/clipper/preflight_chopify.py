#!/usr/bin/env python3
"""Read-only preflight for a local Chopify installation. Does not install or process media."""
from __future__ import annotations
import argparse
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

def command_version(command: str, args: list[str]) -> dict:
    executable=shutil.which(command)
    if not executable:
        return {"available":False,"path":None,"version":None}
    try:
        result=subprocess.run([executable,*args],capture_output=True,text=True,timeout=15,check=False)
        output=(result.stdout or result.stderr).strip().splitlines()
        return {"available":result.returncode==0,"path":executable,"version":output[0][:300] if output else None}
    except (OSError,subprocess.TimeoutExpired) as exc:
        return {"available":False,"path":executable,"error":str(exc)[:300]}

def run_preflight(chopify_dir: Path, python_executable: str, media_root: Path, output_root: Path) -> dict:
    checks={}
    checks["python"]=command_version(python_executable,["--version"])
    engine=chopify_dir.expanduser()
    checks["chopify_directory"]={"available":engine.is_dir(),"path":str(engine.resolve()) if engine.exists() else str(engine)}
    entry=engine/"chopify.py"
    checks["chopify_entrypoint"]={"available":entry.is_file(),"path":str(entry)}
    requirements=engine/"requirements.txt"
    checks["requirements_file"]={"available":requirements.is_file(),"path":str(requirements)}
    checks["ffmpeg"]=command_version("ffmpeg",["-version"])
    checks["ffprobe"]=command_version("ffprobe",["-version"])
    imports=subprocess.run(
        [python_executable,"-c","import cv2, numpy, sherpa_onnx, faster_whisper; print('imports_ok')"],
        capture_output=True,text=True,timeout=60,check=False
    ) if checks["python"]["available"] else None
    checks["python_dependencies"]={
        "available":bool(imports and imports.returncode==0),
        "output":(imports.stdout or imports.stderr).strip()[-1500:] if imports else "Python indisponível"
    }
    for label,path in [("media_root",media_root),("output_root",output_root)]:
        try:
            path.mkdir(parents=True,exist_ok=True)
            usage=shutil.disk_usage(path)
            checks[label]={"available":True,"path":str(path.resolve()),"free_bytes":usage.free,"total_bytes":usage.total}
        except OSError as exc:
            checks[label]={"available":False,"path":str(path),"error":str(exc)[:300]}
    required=["python","chopify_directory","chopify_entrypoint","requirements_file","ffmpeg","ffprobe","python_dependencies","media_root","output_root"]
    ready=all(checks[key].get("available") for key in required)
    return {"status":"ready_for_manual_video_test" if ready else "not_ready","ready":ready,"checks":checks,
            "note":"Verificação somente de leitura; não instala dependências, não baixa modelos e não processa/publica vídeos."}

def main() -> int:
    parser=argparse.ArgumentParser(description="Verificação local do Chopify")
    parser.add_argument("--chopify-dir",default=os.environ.get("CHOPIFY_DIR",""))
    parser.add_argument("--python",default=os.environ.get("CHOPIFY_PYTHON",sys.executable))
    parser.add_argument("--media-root",default=os.environ.get("MEDIA_ROOT","./var/media"))
    parser.add_argument("--output-root",default=os.environ.get("CLIPS_STORAGE_DIR","./var/clips"))
    args=parser.parse_args()
    if not args.chopify_dir:
        print(json.dumps({"status":"not_ready","ready":False,"message":"Configure CHOPIFY_DIR."},ensure_ascii=False))
        return 2
    try:
        report=run_preflight(Path(args.chopify_dir),args.python,Path(args.media_root),Path(args.output_root))
    except (OSError,subprocess.TimeoutExpired) as exc:
        report={"status":"not_ready","ready":False,"error":str(exc)}
    print(json.dumps(report,ensure_ascii=False))
    return 0 if report["ready"] else 1

if __name__=="__main__":
    raise SystemExit(main())
