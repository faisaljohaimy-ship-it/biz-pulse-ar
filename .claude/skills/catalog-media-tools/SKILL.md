---
name: catalog-media-tools
description: Use the shared catalog for tool and model discovery, and run local media inspection, frame extraction, or OCR when reviewing a recording or screenshot.
---

From the repository root, run the command that matches the requested task.

- Find a resource by name or task: `python3 tools/shared_catalog.py QUERY --limit 5`. Add `--type model`, `skill`, `software`, or `mcp_server` to filter.
- Inspect duration, codecs and dimensions of a local recording: `python3 tools/media_tools.py inspect FILE`.
- Extract its first frame: `python3 tools/media_tools.py frame FILE NEW_FRAME.png`. Choose a fresh output path.
- Read visible text: `python3 tools/media_tools.py ocr IMAGE --lang eng`. Select the language that matches the image; use `tesseract --list-langs` to check availability.

Report the command result for the supplied input. Catalog matches are discovery results. ffprobe, ffmpeg and tesseract must be on PATH for their respective commands.
