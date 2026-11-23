"""Reproduce responsive WebP assets from the archived fictional first frame."""
from pathlib import Path
import hashlib
import json
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "docs/design/reference/refinery-generated-first-frame-2026-11-23.png"
EXPECTED = "c4fc9d754d407c1a3e0e114f210869bddebf56c4073ddacae85b5046d3cdc2f6"
OUTPUT = ROOT / "public/media/refinery"


def main() -> None:
    if hashlib.sha256(SOURCE.read_bytes()).hexdigest() != EXPECTED:
        raise ValueError("The archived first frame does not match its provenance")
    OUTPUT.mkdir(parents=True, exist_ok=True)
    variants = []
    with Image.open(SOURCE) as image:
        for width, height in [(640, 360), (1280, 720)]:
            canvas = ImageOps.pad(image.convert("RGB"), (width, height),
                                  method=Image.Resampling.LANCZOS, color=(182, 217, 238))
            target = OUTPUT / f"refinery-scene-{width}.webp"
            canvas.save(target, "WEBP", quality=70, method=6)
            variants.append({"path": str(target.relative_to(ROOT)), "width": width,
                             "height": height, "bytes": target.stat().st_size,
                             "sha256": hashlib.sha256(target.read_bytes()).hexdigest()})
    manifest = {
        "kind": "AI-generated fictional industrial scene, not a live facility",
        "source": str(SOURCE.relative_to(ROOT)), "sha256": EXPECTED,
        "sourceSize": [1672, 941],
        "conversion": "ImageOps.pad Lanczos; WebP70 method6; preserve frame within16:9 canvas",
        "variants": variants,
    }
    (OUTPUT / "scene-manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    print(json.dumps(manifest))


if __name__ == "__main__":
    main()
