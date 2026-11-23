#!/usr/bin/env python3
"""Render one deterministic, explicitly illustrative refinery photomotion film."""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import platform
import subprocess
import wave
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageOps, __version__ as pillow_version, features


def run(args: list[str]) -> subprocess.CompletedProcess:
    return subprocess.run(args, check=True, capture_output=True, text=True)


def smooth(value: float) -> float:
    value = min(1.0, max(0.0, value))
    return value * value * (3 - 2 * value)


def envelope(frame: int, cue: dict) -> float:
    if not cue["start_frame"] <= frame < cue["end_frame"]:
        return 0.0
    enter = smooth((frame - cue["start_frame"]) / (cue["settled_frame"] - cue["start_frame"]))
    leave = smooth((cue["end_frame"] - frame) / (cue["end_frame"] - cue["hold_end_frame"]))
    return min(enter, leave)


class Film:
    def __init__(self, image_path: Path, config: dict):
        self.config = config
        self.width, self.height = config["width"], config["height"]
        with Image.open(image_path) as source:
            self.image = ImageOps.exif_transpose(source).convert("RGB")
        self.iw, self.ih = self.image.size
        if abs(self.iw / self.ih - self.width / self.height) > 0.025:
            raise ValueError("Expected the approved clean 16:9 landscape, not a phone screenshot.")
        if not features.check("raqm"):
            raise RuntimeError("Arabic shaping requires Pillow RAQM support.")
        self.ar = ImageFont.truetype(config["fonts"]["arabic"], 39)
        self.en = ImageFont.truetype(config["fonts"]["english"], 25)
        self.small_ar = ImageFont.truetype(config["fonts"]["arabic"], 29)
        self.small_en = ImageFont.truetype(config["fonts"]["english"], 17)
        self.azure = tuple(config["palette"]["azure"])
        self.white = tuple(config["palette"]["white"])
        self.ink = tuple(config["palette"]["ink"])
        self.badge = self.card(config["badge"]["arabic"], config["badge"]["english"], True)
        self.cue_cards = {
            cue["id"]: self.card(cue["arabic"], cue["english"], False)
            for cue in config["cues"] if "arabic" in cue
        }

    @staticmethod
    def text_size(text: str, font: ImageFont.FreeTypeFont, arabic: bool) -> tuple[int, int]:
        box = font.getbbox(text, direction="rtl" if arabic else "ltr", language="ar" if arabic else "en")
        return box[2] - box[0], box[3] - box[1]

    @staticmethod
    def text(draw: ImageDraw.ImageDraw, position: tuple[int, int], text: str,
             font: ImageFont.FreeTypeFont, color: tuple, arabic: bool) -> None:
        direction, language = ("rtl", "ar") if arabic else ("ltr", "en")
        box = font.getbbox(text, direction=direction, language=language)
        draw.text((position[0] - box[0], position[1] - box[1]), text, font=font,
                  fill=color, direction=direction, language=language)

    def card(self, ar_text: str, en_text: str, main: bool) -> Image.Image:
        ar, en = (self.ar, self.en) if main else (self.small_ar, self.small_en)
        aw, ah = self.text_size(ar_text, ar, True)
        ew, eh = self.text_size(en_text, en, False)
        width = max(aw, ew) + 46
        height = ah + eh + 37
        layer = Image.new("RGBA", (width, height))
        draw = ImageDraw.Draw(layer)
        draw.rounded_rectangle((0, 0, width - 1, height - 1), radius=13,
                               fill=(*self.ink, 236), outline=(*self.azure, 145), width=1)
        draw.line((18, 15, 18, height - 16), fill=(*self.azure, 240), width=3)
        self.text(draw, ((width - aw) // 2 + 3, 13), ar_text, ar, self.white, True)
        self.text(draw, ((width - ew) // 2 + 3, ah + 24), en_text, en, (*self.white, 215), False)
        return layer

    def camera(self, frame: int) -> tuple[float, float, float]:
        phase = frame / self.config["frames"]
        zoom = 1.017 + 0.022 * (0.5 - 0.5 * math.cos(2 * math.pi * phase))
        scale = max(self.width / self.iw, self.height / self.ih) * zoom
        center_x = self.iw / 2 + 5 * math.sin(2 * math.pi * phase) / scale
        return scale, center_x, self.ih / 2

    def project(self, point: list[float], camera: tuple[float, float, float]) -> tuple[float, float]:
        scale, center_x, center_y = camera
        return ((point[0] * self.iw - center_x) * scale + self.width / 2,
                (point[1] * self.ih - center_y) * scale + self.height / 2)

    def frame(self, frame: int) -> Image.Image:
        camera = self.camera(frame)
        scale, cx, cy = camera
        picture = self.image.transform(
            (self.width, self.height), Image.Transform.AFFINE,
            (1 / scale, 0, cx - self.width / (2 * scale),
             0, 1 / scale, cy - self.height / (2 * scale)),
            resample=Image.Resampling.BICUBIC,
        ).convert("RGBA")
        overlay = Image.new("RGBA", picture.size)
        draw = ImageDraw.Draw(overlay)
        # Framing accents are a graphic device, not a scanner or detection status.
        for x, y, dx, dy in [(27, 27, 1, 1), (1252, 27, -1, 1)]:
            draw.line((x + dx * 36, y, x, y, x, y + dy * 26),
                      fill=(*self.azure, 155), width=2)
        anchors = [self.project(point, camera) for point in self.config["conceptual_anchors"]]
        for cue in self.config["cues"]:
            if cue["id"] not in self.cue_cards:
                continue
            opacity = envelope(frame, cue)
            if opacity <= 0:
                continue
            alpha = round(235 * opacity)

            def stroke(points: tuple, width: int = 4) -> None:
                # A localized halo and dark rim keep conceptual marks readable on pipes.
                draw.line(points, fill=(*self.azure, round(38 * opacity)), width=width + 12)
                draw.line(points, fill=(*self.ink, round(215 * opacity)), width=width + 4)
                draw.line(points, fill=(*self.azure, alpha), width=width)

            def ellipse(bounds: tuple) -> None:
                x0, y0, x1, y1 = bounds
                draw.ellipse((x0 - 8, y0 - 8, x1 + 8, y1 + 8),
                             outline=(*self.azure, round(38 * opacity)), width=20)
                draw.ellipse((x0 - 4, y0 - 4, x1 + 4, y1 + 4),
                             outline=(*self.ink, round(215 * opacity)), width=12)
                draw.ellipse(bounds, outline=(*self.azure, alpha), width=4)

            if cue["id"] == "links":
                progress = smooth((frame - cue["start_frame"]) / 34)
                for index, (start, finish) in enumerate(zip(anchors, anchors[1:])):
                    portion = min(1.0, max(0.0, progress * 2 - index))
                    end = (start[0] + (finish[0] - start[0]) * portion,
                           start[1] + (finish[1] - start[1]) * portion)
                    stroke((*start, *end))
                for x, y in anchors:
                    ellipse((x - 12, y - 12, x + 12, y + 12))
            else:
                x, y = anchors[1]
                # This outline is explicitly hypothetical; it carries no coverage metric.
                growth = 0.55 + 0.45 * smooth(
                    (frame - cue["start_frame"]) / (cue["settled_frame"] - cue["start_frame"]))
                rx, ry = 166 * growth, 65 * growth
                draw.ellipse((x - rx, y - ry, x + rx, y + ry),
                             fill=(*self.azure, round(10 * opacity)))
                ellipse((x - rx, y - ry, x + rx, y + ry))
                stroke((x - 50, y, x + 50, y), width=4)
            card = self.cue_cards[cue["id"]]
            if opacity < 1:
                card = card.copy()
                card.putalpha(card.getchannel("A").point(lambda value: round(value * opacity)))
            overlay.alpha_composite(card, (self.width - card.width - 28, 39))
        picture = Image.alpha_composite(picture, overlay)
        picture.alpha_composite(self.badge, (28, self.height - self.badge.height - 26))
        return picture.convert("RGB")


def synth(path: Path, duration: float) -> dict:
    rate = 48_000
    time = np.arange(round(duration * rate), dtype=np.float64) / rate
    rng = np.random.default_rng(20261123)
    noise = rng.standard_normal(time.size)
    spectrum = np.fft.rfft(noise)
    frequencies = np.fft.rfftfreq(noise.size, 1 / rate)
    spectrum *= np.where((frequencies >= 100) & (frequencies <= 1800),
                         1 / np.sqrt(np.maximum(frequencies, 1)), 0)
    air = np.fft.irfft(spectrum, n=noise.size)
    air /= max(float(np.max(np.abs(air))), 1e-9)
    wave_data = (0.010 * np.sin(2 * np.pi * 110 * time) +
                 0.004 * np.sin(2 * np.pi * 165 * time + 0.18 * np.sin(2 * np.pi * time / duration)) +
                 0.0025 * air)
    fade = np.minimum(np.clip(time / 1.2, 0, 1), np.clip((duration - time) / 1.2, 0, 1))
    wave_data *= (0.5 - 0.5 * np.cos(np.pi * fade)) * 10 ** (12 / 20)
    pcm = np.round(np.clip(wave_data, -1, 1) * 32767).astype("<i2")
    with wave.open(str(path), "wb") as output:
        output.setnchannels(1)
        output.setsampwidth(2)
        output.setframerate(rate)
        output.writeframes(pcm.tobytes())
    return {"seed": 20261123, "sample_rate": rate, "samples": pcm.size, "gain_db": 12,
            "peak_dbfs": 20 * math.log10(max(float(np.max(np.abs(wave_data))), 1e-12)),
            "rms_dbfs": 20 * math.log10(max(float(np.sqrt(np.mean(wave_data ** 2))), 1e-12)),
            "provenance": "Original deterministic synthesized non-diegetic ambient bed; no voice or sampled recording"}


def review_outputs(video: Path, output: Path, fps: int) -> tuple[dict, dict]:
    probe = json.loads(run(["ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", str(video)]).stdout)
    run(["ffmpeg", "-v", "error", "-i", str(video), "-map", "0:v:0", "-map", "0:a:0", "-f", "null", "-"])
    review = output / "review"
    review.mkdir()
    run(["ffmpeg", "-v", "error", "-i", str(video), "-vf", f"select=not(mod(n\\,{fps})),scale=640:-1", "-fps_mode", "vfr", "-frames:v", "15", str(review / "second-%02d.png")])
    poster = output / "refinery-poster.webp"
    run(["ffmpeg", "-v", "error", "-i", str(video), "-frames:v", "1", "-vf", "scale=640:360", "-c:v", "libwebp", "-quality", "67", str(poster)])
    sheet = Image.new("RGB", (960, 416), (7, 22, 35))
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 15)
    samples = [0, 3, 6, 9, 12, 14]
    for index, second in enumerate(samples):
        with Image.open(review / f"second-{second + 1:02d}.png") as sample:
            thumb = sample.resize((320, 180), Image.Resampling.LANCZOS)
        x, y = (index % 3) * 320, (index // 3) * 208
        sheet.paste(thumb, (x, y))
        draw.text((x + 9, y + 185), f"{second:02d}s / frame {second * fps}", font=font, fill=(224, 240, 251))
    sheet.save(output / "contact-sheet.jpg", quality=90)
    audio_measure = run(["ffmpeg", "-hide_banner", "-i", str(video), "-map", "0:a:0", "-af", "volumedetect", "-f", "null", "-"]).stderr
    (output / "audio-measurement.txt").write_text(audio_measure)
    return probe, {"full_decode": "passed", "one_per_second_frames": 15,
                   "contact_sheet_seconds": samples, "poster_bytes": poster.stat().st_size,
                   "motion_playback_review": "pending; contact sheet alone does not establish motion quality",
                   "audio_listening_review": "pending; encoded level measured, not a listening claim"}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--image", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    arguments = parser.parse_args()
    image_path = arguments.image.resolve(strict=True)
    output = arguments.output.resolve()
    video = output / "refinery-illustrative.mp4"
    if video.exists():
        raise FileExistsError(f"Refusing to overwrite {video}")
    output.mkdir(parents=True, exist_ok=True)
    config = json.loads(Path(__file__).with_name("config.json").read_text())
    film = Film(image_path, config)
    duration = config["frames"] / config["fps"]
    audio = output / "original-ambience.wav"
    audio_details = synth(audio, duration)
    command = ["ffmpeg", "-nostdin", "-v", "warning", "-n", "-f", "rawvideo", "-pixel_format", "rgb24",
               "-video_size", f"{config['width']}x{config['height']}", "-framerate", str(config["fps"]),
               "-i", "pipe:0", "-i", str(audio), "-map", "0:v:0", "-map", "1:a:0",
               "-vf", "format=gbrp,zscale=matrixin=gbr:transferin=iec61966-2-1:primariesin=bt709:rangein=full:matrix=bt709:transfer=bt709:primaries=bt709:range=limited,format=yuv420p",
               "-c:v", "libx264", "-preset", "slow", "-crf", "26", "-maxrate", "300k", "-bufsize", "300k",
               "-threads", "2", "-pix_fmt", "yuv420p", "-color_range", "tv", "-color_primaries", "bt709", "-color_trc", "bt709",
               "-colorspace", "bt709", "-c:a", "aac", "-b:a", "24k", "-ar", "48000", "-ac", "1",
               "-movflags", "+faststart", str(video)]
    with (output / "encode.log").open("w") as log:
        process = subprocess.Popen(command, stdin=subprocess.PIPE, stderr=log)
        try:
            for frame in range(config["frames"]):
                process.stdin.write(film.frame(frame).tobytes())
            process.stdin.close()
            if process.wait() != 0:
                raise RuntimeError("FFmpeg encode failed; inspect encode.log")
        finally:
            if process.poll() is None:
                process.kill()
                process.wait()
    probe, review = review_outputs(video, output, config["fps"])
    source_bytes = image_path.read_bytes()
    report = {
        "source": {"path": str(image_path), "sha256": hashlib.sha256(source_bytes).hexdigest(),
                   "dimensions": [film.iw, film.ih], "provenance": "Owner-authorized clean AI-generated refinery still; not a real site observation"},
        "method": "Local deterministic still-image photomotion + conceptual graphics + original synth, following HeyGen motion-graphics/video-editing workflows; no paid generation",
        "config": config, "duration_authored_seconds": duration,
        "output": {"path": str(video), "bytes": video.stat().st_size,
                   "target_max_bytes": config["target_max_bytes"],
                   "within_target": video.stat().st_size <= config["target_max_bytes"]},
        "audio": audio_details, "probe": probe, "review": review,
        "versions": {"python": platform.python_version(), "pillow": pillow_version,
                     "numpy": np.__version__, "ffmpeg": run(["ffmpeg", "-version"]).stdout.splitlines()[0]},
        "command": command,
    }
    (output / "production.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({"video": str(video), "bytes": video.stat().st_size,
                      "poster_bytes": review["poster_bytes"], "duration": duration,
                      "within_target": report["output"]["within_target"]}, ensure_ascii=False))


if __name__ == "__main__":
    main()
