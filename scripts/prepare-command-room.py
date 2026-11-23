#!/usr/bin/env python3
"""Reproduce uncropped responsive WebP assets from the exact owner attachment.

Uses Pillow, already used by remotion/brand/tools. No generative service, crop,
retouching, video encoding or upload. Usage: python scripts/prepare-command-room.py <original.jpg>
"""
import hashlib
import json
from pathlib import Path
import shutil
import sys

from PIL import Image


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    source = Path(sys.argv[1])
    approved = {
        "1008e89f8ef301f286dd1448ecfd6bc1805e91547c66a491ee99626fab8b574a":
            ((1280, 698), "command-room-owner-2026-11-23.jpg", 75),
        "54411bb22a9f487a4dcea8546cbba56515ec8b49ca7cdc1e08cf5d5dca89e0e4":
            ((1320, 720), "command-room-owner-package-2026-11-23.jpeg", 66),
    }
    expected = digest(source)
    if expected not in approved:
        raise ValueError("Source is not the approved owner attachment")
    dimensions, archive_name, quality = approved[expected]
    repository = Path(__file__).resolve().parent.parent
    target = repository / "public/home/command-room"
    target.mkdir(parents=True, exist_ok=True)
    # Retain the exact source outside the served image budget; only responsive
    # derivatives are shipped. The original remains versioned and hash-verified.
    original = repository / "docs/design/reference" / archive_name
    original.parent.mkdir(parents=True, exist_ok=True)
    if source.resolve() != original.resolve():
        shutil.copyfile(source, original)
    with Image.open(source) as image:
        if image.size != dimensions or image.getexif().get(274, 1) != 1:
            raise ValueError("Unexpected source dimensions or orientation")
        assets = []
        for width in (640, image.width):
            height = round(image.height * width / image.width)
            output = target / f"command-room-{width}.webp"
            resized = image.resize((width, height), Image.Resampling.LANCZOS)
            resized.save(output, "WEBP", quality=quality, method=6)
            assets.append({"file": output.name, "width": width, "height": height,
                           "bytes": output.stat().st_size, "sha256": digest(output)})
    manifest = {"sourceAttachment": source.name, "original": "docs/design/reference/" + original.name,
                "sha256": expected, "width": dimensions[0], "height": dimensions[1],
                "originalBytes": original.stat().st_size,
                "transform": f"Full-frame proportional resize only; WebP quality {quality}, method 6",
                "illustrative": True, "variants": assets}
    (target / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps(manifest, ensure_ascii=False))


if __name__ == "__main__":
    main()
