#!/usr/bin/env python3
"""Run Chopify safely against one already-imported local media asset."""
from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
import uuid
from pathlib import Path


VIDEO_EXTENSIONS = {".mp4", ".mov", ".m4v", ".webm", ".mkv", ".avi"}


def run_job(source: Path, media_root: Path, output_root: Path, chopify_dir: Path,
            python_executable: str, max_clips: int, min_score: float,
            preferred_len: str | None = None, timeout_seconds: int = 6 * 60 * 60) -> dict:
    root = media_root.resolve(strict=True)
    source = source.resolve(strict=True)
    if not source.is_file() or source.suffix.lower() not in VIDEO_EXTENSIONS:
        raise ValueError("A origem precisa ser um arquivo de vídeo compatível.")
    if not source.is_relative_to(root):
        raise ValueError("O vídeo precisa estar dentro da biblioteca local autorizada.")

    engine = chopify_dir.resolve(strict=True)
    entrypoint = engine / "chopify.py"
    if not entrypoint.is_file():
        raise FileNotFoundError("CHOPIFY_DIR não contém chopify.py.")
    if max_clips < 1 or max_clips > 50:
        raise ValueError("max_clips deve estar entre 1 e 50.")
    if not 0 <= min_score <= 10:
        raise ValueError("min_score deve estar entre 0 e 10.")

    output_root.mkdir(parents=True, exist_ok=True)
    job_id = re.sub(r"[^a-zA-Z0-9_-]", "_", source.stem)[:48] + "-" + uuid.uuid4().hex[:12]
    job_dir = output_root / job_id
    exports = job_dir / "exports"
    projects = job_dir / "projects"
    work = job_dir / "work"
    for folder in (exports, projects, work):
        folder.mkdir(parents=True, exist_ok=True)

    command = [
        python_executable, str(entrypoint), str(source),
        "--no-input", "--aspect", "9:16", "--device", "cpu",
        "--max-clips", str(max_clips), "--min-score", str(min_score),
        "--out", str(exports), "--projects-dir", str(projects),
        "--workdir", str(work), "--action", "all",
    ]
    if preferred_len:
        command.extend(["--preferred-len", preferred_len])

    completed = subprocess.run(
        command, cwd=engine, capture_output=True, text=True,
        timeout=timeout_seconds, check=False,
    )
    clips = sorted(str(path) for path in exports.glob("*.mp4") if path.is_file())
    result = {
        "status": "succeeded" if completed.returncode == 0 and clips else "failed",
        "source": str(source),
        "output_dir": str(exports),
        "clips": clips,
        "return_code": completed.returncode,
        "stdout_tail": completed.stdout[-6000:],
        "stderr_tail": completed.stderr[-3000:],
    }
    if completed.returncode != 0:
        result["message"] = "O Chopify terminou com erro; consulte os detalhes e não marque a tarefa como concluída."
    elif not clips:
        result["message"] = "O motor terminou sem exportar cortes. Revise os critérios e a qualidade do vídeo."
    return result


def main() -> int:
    parser = argparse.ArgumentParser(description="Adaptador local TikTok Auto Publisher AI -> Chopify")
    parser.add_argument("--source", required=True, help="Caminho do vídeo já importado")
    parser.add_argument("--media-root", default=os.environ.get("MEDIA_ROOT", "./var/media"))
    parser.add_argument("--output-root", default=os.environ.get("CLIPS_STORAGE_DIR", "./var/clips"))
    parser.add_argument("--chopify-dir", default=os.environ.get("CHOPIFY_DIR"))
    parser.add_argument("--python", default=os.environ.get("CHOPIFY_PYTHON", sys.executable))
    parser.add_argument("--max-clips", type=int, default=5)
    parser.add_argument("--min-score", type=float, default=8.0)
    parser.add_argument("--preferred-len")
    args = parser.parse_args()

    if not args.chopify_dir:
        print(json.dumps({"status": "unavailable", "message": "Configure CHOPIFY_DIR com a pasta do Chopify instalado localmente."}, ensure_ascii=False))
        return 2
    try:
        result = run_job(
            Path(args.source), Path(args.media_root), Path(args.output_root),
            Path(args.chopify_dir), args.python, args.max_clips,
            args.min_score, args.preferred_len,
        )
    except subprocess.TimeoutExpired:
        result = {"status": "failed", "message": "Tempo máximo de processamento excedido; verifique a pasta do projeto antes de repetir."}
    except (OSError, ValueError) as exc:
        result = {"status": "failed", "message": str(exc)}
    print(json.dumps(result, ensure_ascii=False))
    return 0 if result["status"] == "succeeded" else 1


if __name__ == "__main__":
    raise SystemExit(main())
