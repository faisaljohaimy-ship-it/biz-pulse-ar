"""Inspect local media, extract a PNG frame, or read text from an image."""
import argparse
import json
from pathlib import Path
import re
import subprocess

def run(args):
    return subprocess.run(args, check=True, capture_output=True, timeout=90).stdout

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="action", required=True)
    for name in ("inspect", "frame", "ocr"):
        cmd = commands.add_parser(name)
        cmd.add_argument("input", type=Path)
        if name == "frame":
            cmd.add_argument("output", type=Path)
        if name == "ocr":
            cmd.add_argument("--lang", default="eng")
    args = parser.parse_args()
    path = args.input.resolve()
    if not path.is_file():
        parser.error("Input must be a local file.")
    try:
        if args.action == "ocr":
            if not re.fullmatch(r"[A-Za-z0-9_]+(?:\+[A-Za-z0-9_]+)*", args.lang):
                parser.error("Invalid OCR language identifier.")
            print(run(["tesseract", str(path), "stdout", "-l", args.lang]).decode().strip())
            return
        opts = ["-v", "error", "-protocol_whitelist", "file", "-format_whitelist", "mov,matroska,webm,avi,wav,mp3,flac,ogg"]
        if args.action == "inspect":
            result = run(["ffprobe", *opts, "-show_entries", "stream=codec_name,width,height:format=duration", "-of", "json", str(path)])
            print(json.dumps(json.loads(result), ensure_ascii=False))
            return
        if args.output.suffix.lower() != ".png":
            parser.error("Frame output must have a .png suffix.")
        frame = run(["ffmpeg", "-nostdin", *opts, "-i", str(path), "-frames:v", "1", "-c:v", "png", "-f", "image2pipe", "pipe:1"])
        if not frame.startswith(b"\x89PNG\r\n\x1a\n"):
            parser.error("No video frame was decoded.")
        with args.output.open("xb") as output:
            output.write(frame)
    except subprocess.CalledProcessError as error:
        parser.exit(1, error.stderr.decode(errors="replace"))
    except (OSError, subprocess.TimeoutExpired) as error:
        parser.exit(1, str(error) + "\n")

if __name__ == "__main__":
    main()
