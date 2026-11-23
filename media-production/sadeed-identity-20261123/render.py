#!/usr/bin/env python3
"""Render natural-speed bilingual identity derivatives from immutable assets."""
from __future__ import annotations

import argparse
from functools import lru_cache
import hashlib
import importlib.util
import json
import math
from pathlib import Path
import platform
import re
import subprocess

import numpy as np
import scipy
from PIL import Image, ImageDraw, ImageFont, features
from scipy.io import wavfile
from scipy.ndimage import uniform_filter1d

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
SOURCE = ROOT / "public/media/brand/sadeed-film-1608.mp4"
SOURCE_SHA = "6abafc1f36f0d9e183a8562f37338e015f8ce8f0dc5dba5f12fc8b6346478fb1"
TWIN = ROOT / "public/media/twin/sadeed-twin-1280.mp4"
TWIN_SHA = "01be7fc3c421429dc8c087be88e167aa66b606223256c54e6cabcfd5375b6ec3"
W, H, FPS, RATE = 1344, 448, 30, 48_000
IDS = ["why", "platform", "sources", "ai", "clarity", "decision"]
NAMES = ["Energy and accountability", "Connected platform design", "Approved sources", "AI and human approval", "Clarity", "Decision trail"]
ANCHORS = {
    "ar": [["معلومات", "وقرارات"], ["لتجمع", "يساعد"], ["وإظهار", "متى"], ["لتيسير", "مع بقاء"], ["لتقليل", "مع بيان"]],
    "en": [["Information", "decisions"], ["incidents", "helping"], ["showing", "when approved"], ["support search", "Authorized people"], ["reduce searching", "while showing"]],
}
# These source windows are entirely within the already-approved, scrubbed film.
SHOTS = [
    [(0.55, 1.40), (1.55, 2.40), (10.55, 10.95)],
    [(5.55, 6.40), (9.05, 9.45), (13.05, 13.45)],
    [(4.55, 5.40), (12.55, 12.95), (14.05, 14.45)],
    [(2.55, 3.40), (7.55, 8.40), (6.55, 7.40)],
    [(11.55, 11.95), (3.55, 4.40), (14.55, 14.95)],
]


def run(args):
    return subprocess.run(list(map(str, args)), check=True, capture_output=True, text=True)


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def probe(path):
    return json.loads(run(["ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", path]).stdout)


def loudness(path, target=-17, peak=-3):
    result = run(["ffmpeg", "-hide_banner", "-i", path, "-af", f"loudnorm=I={target}:TP={peak}:LRA=11:print_format=json", "-f", "null", "-"])
    return json.JSONDecoder().raw_decode(result.stderr[result.stderr.rindex("{"):])[0]


def normalize(source, destination, target=-17, peak=-3):
    stats = loudness(source, target, peak)
    settings = (f"loudnorm=I={target}:TP={peak}:LRA=11:measured_I={stats['input_i']}:"
                f"measured_TP={stats['input_tp']}:measured_LRA={stats['input_lra']}:"
                f"measured_thresh={stats['input_thresh']}:offset={stats['target_offset']}:linear=true")
    run(["ffmpeg", "-v", "error", "-n", "-i", source, "-af", settings, "-ar", RATE,
         "-c:a", "pcm_f32le", destination])
    return {"analysis": stats, "filter": settings}


def scene_data(language):
    alignment = json.loads((HERE / f"alignment-{language}.json").read_text())
    text = (HERE / f"voiceover-{language}.txt").read_text().strip()
    chars = alignment["original_characters"]
    assert "".join(c["text"] for c in chars) == text
    paragraphs = text.split("\n\n")
    assert len(paragraphs) == 6
    duration = alignment["duration"]
    scenes, offset = [], 0
    for index, paragraph in enumerate(paragraphs):
        begin = text.index(paragraph, offset)
        offset = begin + len(paragraph)
        scenes.append({"id": IDS[index], "purpose": NAMES[index], "text": paragraph,
                       "character_start": begin, "character_end_exclusive": offset,
                       "speech_start": chars[begin]["start_time"], "speech_end": chars[offset - 1]["end_time"]})
    for index, scene in enumerate(scenes):
        scene["start"] = 0 if index == 0 else scene["speech_start"]
        scene["end"] = scenes[index + 1]["speech_start"] if index < 5 else duration
    return alignment, scenes


def edit_decisions(language, alignment, scenes):
    clips = []
    chars = alignment["original_characters"]
    for index, scene in enumerate(scenes[:5]):
        transitions = [scene["start"]]
        for phrase in ANCHORS[language][index]:
            offset = scene["character_start"] + scene["text"].index(phrase)
            transitions.append(chars[offset]["start_time"])
        boundaries = transitions + [scene["end"]]
        if index == 0:
            clips.append({"scene": scene["id"], "start": 0, "end": 0.5, "source_in": 0, "source_out": 0.5, "transition": "cut"})
            boundaries[0] = 0.5
        for shot, (source_in, source_out) in enumerate(SHOTS[index]):
            clips.append({"scene": scene["id"], "start": boundaries[shot], "end": boundaries[shot + 1],
                          "source_in": source_in, "source_out": source_out,
                          "transition": "cut" if index == shot == 0 else "crossfade"})
    close_start = alignment["duration"] - 9.5
    clips += [
        {"scene": "decision", "start": scenes[5]["start"], "end": close_start,
         "source_in": 13.55, "source_out": 13.95, "transition": "crossfade"},
        {"scene": "decision", "start": close_start, "end": alignment["duration"],
         "source_in": 16.5, "source_out": 26, "transition": "cut", "continuous_original_close": True},
    ]
    for clip in clips:
        clip["start_frame"] = round(clip["start"] * FPS)
        clip["end_frame"] = round(clip["end"] * FPS)
        clip["source_start_frame"] = round(clip["source_in"] * FPS)
        clip["source_end_frame_exclusive"] = round(clip["source_out"] * FPS)
        clip["actual_source_in_seconds"] = clip["source_start_frame"] / FPS
        clip["actual_source_out_seconds"] = clip["source_end_frame_exclusive"] / FPS
        clip["source_playback_rate"] = 1
        clip["hold_policy"] = "Last retained source frame held as a deliberate editorial still after the natural-speed window"
        clip["transition_frames"] = 8 if clip["transition"] == "crossfade" else 0
    clips[-1]["end_frame"] = math.ceil(alignment["duration"] * FPS)
    assert all(a["end_frame"] == b["start_frame"] for a, b in zip(clips, clips[1:]))
    return clips


def cache_picture(work):
    path = work / "source-frames.rgb"
    expected = 780 * W * H * 3
    if not path.exists():
        run(["ffmpeg", "-v", "error", "-n", "-i", SOURCE, "-map", "0:v:0", "-an", "-vf",
             f"scale={W}:{H}:flags=lanczos,format=rgb24", "-pix_fmt", "rgb24", "-f", "rawvideo", path])
    assert path.stat().st_size == expected
    return np.memmap(path, dtype=np.uint8, mode="r", shape=(780, H, W, 3))


def make_badge(language):
    assert features.check("raqm")
    font = ImageFont.truetype("/usr/share/fonts/truetype/noto/NotoSansArabic-Regular.ttf" if language == "ar"
                              else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 27 if language == "ar" else 21)
    label = "تصوّر توضيحي" if language == "ar" else "ILLUSTRATIVE VISUALS"
    kwargs = {"direction": "rtl", "language": "ar"} if language == "ar" else {}
    bounds = font.getbbox(label, **kwargs)
    width, height = bounds[2] - bounds[0], bounds[3] - bounds[1]
    badge = Image.new("RGBA", (width + 34, height + 22))
    draw = ImageDraw.Draw(badge)
    draw.rounded_rectangle((0, 0, badge.width - 1, badge.height - 1), 7, fill=(3, 15, 32, 220))
    draw.text((17 - bounds[0], 11 - bounds[1]), label, font=font, fill=(235, 249, 255, 255), **kwargs)
    return badge


def compose_bed(scenes, duration, destination):
    spec = importlib.util.spec_from_file_location("original_brand_score", ROOT / "remotion/brand/score/compose.py")
    score = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(score)
    count = round(duration * RATE)
    bed = np.zeros((count, 2), dtype=np.float32)
    chords = [[50, 57, 65], [46, 53, 62], [53, 60, 69], [48, 55, 64], [50, 57, 65], [50, 57, 66, 69]]
    for index, (scene, chord) in enumerate(zip(scenes, chords)):
        start = round(scene["start"] * RATE)
        length = min(duration - scene["start"], scene["end"] - scene["start"] + 1.1)
        rng = np.random.default_rng([20261123, index])
        pad = score.chord_pad(rng, chord, max(0.1, length - 1.1), attack=1.1, release=1.1, detune=7)
        pad = score.bw(pad, "lp", 900.0)
        end = min(count, start + len(pad))
        bed[start:end] += (0.17 * pad[:end - start]).astype(np.float32)
        if index:
            bell = score.stereo(score.fm_bell(chord[-1] + 12, dur=1.8, index=1.0, tau=0.6), -0.18 if index % 2 else 0.18)
            place = min(count - 1, start + round(0.65 * RATE))
            stop = min(count, place + len(bell))
            bed[place:stop] += (0.008 * bell[:stop - place]).astype(np.float32)
    bed *= score.fades(count, 1.0, 2.5)[:, None]
    wavfile.write(destination, RATE, bed)
    return {"source": "remotion/brand/score/compose.py", "reused_functions": ["chord_pad", "fm_bell", "stereo", "fades", "bw"],
            "arrangement": "New narration-led D-minor / B-flat / F / C / D-minor / D-major scene voicings; no original mixed audio used",
            "seed": 20261123, "sample_rate": RATE}


def audio_mix(language, alignment, scenes, work):
    voice = work / f"voice-normalized-{language}.wav"
    voice_analysis = normalize(HERE / "assets" / f"narration-{language}.flac", voice)
    sample_rate, speech = wavfile.read(voice)
    assert sample_rate == RATE and speech.ndim == 1
    count = len(speech)
    duration = count / RATE
    bed_path = work / f"music-original-{language}.wav"
    composition = compose_bed(scenes, duration, bed_path)
    _, bed = wavfile.read(bed_path)
    # Actual speech energy is the sidechain key. Look ahead 60 ms, release 700 ms.
    hop = 480
    energy = np.sqrt(np.maximum(uniform_filter1d(speech.astype(np.float64) ** 2, size=1440)[::hop], 0))
    future = np.minimum(np.arange(len(energy)) + 6, len(energy) - 1)
    target = np.clip((energy[future] - 0.004) / 0.02, 0, 1)
    envelope = np.empty_like(target)
    level = 0.0
    for index, value in enumerate(target):
        coefficient = math.exp(-0.01 / (0.06 if value > level else 0.7))
        level = coefficient * level + (1 - coefficient) * value
        envelope[index] = level
    envelope = np.interp(np.arange(count), np.arange(len(envelope)) * hop, envelope)
    ducked = bed * 10 ** ((-4.5 * envelope[:, None]) / 20)
    active = np.repeat(energy > 0.014, hop)[:count]
    if len(active) < count:
        active = np.pad(active, (0, count - len(active)), constant_values=False)
    speech_rms = math.sqrt(float(np.mean(speech[active].astype(np.float64) ** 2)))
    bed_rms = math.sqrt(float(np.mean(ducked[active].astype(np.float64) ** 2)))
    gain = speech_rms / (10 ** (22 / 20) * max(bed_rms, 1e-12))
    ducked *= gain
    wavfile.write(work / f"music-ducked-{language}.wav", RATE, ducked.astype(np.float32))
    premix = work / f"mix-premaster-{language}.wav"
    wavfile.write(premix, RATE, (speech[:, None] + ducked).astype(np.float32))
    final = work / f"mix-final-{language}.wav"
    mix_analysis = normalize(premix, final, target=-16, peak=-2.5)
    return final, {"voice_normalization": voice_analysis, "music": composition, "sidechain": {
        "key": "Normalized narration RMS", "lookahead_ms": 60, "attack_ms": 60, "release_ms": 700,
        "maximum_duck_db": 4.5, "active_speech_to_music_aggregate_rms_db": 20 * math.log10(
            speech_rms / math.sqrt(float(np.mean(ducked[active].astype(np.float64) ** 2)))),
        "limitation": "Aggregate active-speech RMS balance is not a per-word loudness or listening verdict"},
        "final_mix_normalization": mix_analysis, "speech_speed": 1, "audio_samples": count, "sample_rate": RATE}


def encode(language, frames, clips, audio, destination):
    badge = make_badge(language)

    @lru_cache(maxsize=32)
    def source_frame(index):
        picture = Image.fromarray(np.array(frames[min(779, index)]), "RGB").convert("RGBA")
        picture.alpha_composite(badge, (22, H - badge.height - 18))
        return picture.convert("RGB")

    def index_at(clip, frame):
        return min(clip["source_end_frame_exclusive"] - 1,
                   clip["source_start_frame"] + max(0, frame - clip["start_frame"]))

    command = ["ffmpeg", "-nostdin", "-v", "warning", "-n", "-f", "rawvideo", "-pix_fmt", "rgb24",
               "-video_size", f"{W}x{H}", "-framerate", str(FPS), "-i", "pipe:0", "-i", str(audio),
               "-map", "0:v:0", "-map", "1:a:0", "-vf",
               "format=gbrp,zscale=matrixin=gbr:transferin=iec61966-2-1:primariesin=bt709:rangein=full:matrix=bt709:transfer=bt709:primaries=bt709:range=limited,format=yuv420p",
               "-c:v", "libx264", "-preset", "slow", "-crf", "23", "-maxrate", "230k", "-bufsize", "460k",
               "-threads", "2", "-pix_fmt", "yuv420p", "-color_range", "tv", "-color_primaries", "bt709",
               "-color_trc", "bt709", "-colorspace", "bt709", "-c:a", "aac", "-b:a", "80k", "-ar", str(RATE),
               "-ac", "2", "-movflags", "+faststart", "-metadata:s:a:0", f"language={'ara' if language == 'ar' else 'eng'}", str(destination)]
    with (audio.parent / f"encode-{language}.log").open("w") as log:
        process = subprocess.Popen(command, stdin=subprocess.PIPE, stderr=log)
        current = 0
        try:
            for frame in range(clips[-1]["end_frame"]):
                while current + 1 < len(clips) and frame >= clips[current]["end_frame"]:
                    current += 1
                clip = clips[current]
                picture = source_frame(index_at(clip, frame))
                local = frame - clip["start_frame"]
                if current and local < clip["transition_frames"]:
                    prior = source_frame(index_at(clips[current - 1], clips[current - 1]["end_frame"] - 1))
                    amount = (local + 1) / clip["transition_frames"]
                    amount = amount * amount * (3 - 2 * amount)
                    picture = Image.blend(prior, picture, amount)
                process.stdin.write(picture.tobytes())
            process.stdin.close()
            if process.wait():
                raise RuntimeError(f"Encode failed: {destination}")
        finally:
            if process.poll() is None:
                process.kill()
                process.wait()
    source_frame.cache_clear()
    return command


def review(language, destination, scenes, work):
    run(["ffmpeg", "-v", "error", "-i", destination, "-map", "0:v:0", "-map", "0:a:0", "-f", "null", "-"])
    points = [scene["start"] + 1.2 for scene in scenes] + [float(probe(destination)["format"]["duration"]) - 1]
    sheet = Image.new("RGB", (1020, 4 * 198), (5, 16, 30))
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 14)
    for index, point in enumerate(points):
        image = work / f"review-{language}-{index}.png"
        run(["ffmpeg", "-v", "error", "-ss", point, "-i", destination, "-frames:v", "1", "-vf", "scale=510:170", image])
        with Image.open(image) as picture:
            sheet.paste(picture, ((index % 2) * 510, (index // 2) * 198))
        draw.text(((index % 2) * 510 + 6, (index // 2) * 198 + 175), f"{language} {point:.3f}s", fill="white", font=font)
    sheet.save(work / f"contact-{language}.jpg", quality=90)
    stats = loudness(destination)
    return {"full_decode": "passed", "encoded_loudness": stats, "sample_times": points,
            "listening_review": "not performed", "independent_transcript_review": "not performed",
            "normal_speed_playback_review": "pending; decoded still review does not establish motion quality"}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--work", type=Path, default=ROOT / ".audit-tmp/identity-final-20261123")
    parser.add_argument("--output", type=Path, default=ROOT / "public/media/identity")
    args = parser.parse_args()
    args.work = args.work.resolve()
    args.output = args.output.resolve()
    args.work.mkdir(parents=True, exist_ok=True)
    args.output.mkdir(parents=True, exist_ok=True)
    assert sha(SOURCE) == SOURCE_SHA and sha(TWIN) == TWIN_SHA
    source_probe = probe(SOURCE)
    manifest = {"source": {"path": str(SOURCE.relative_to(ROOT)), "sha256": SOURCE_SHA, "probe": source_probe},
                "preserved_twin_sha256": TWIN_SHA, "sequence": {"width": W, "height": H, "fps": FPS,
                "aspect_ratio": "3:1", "color": "SDR Rec.709; source matrix bt470bg/full decoded to RGB, RGB working transfer assumed sRGB"},
                "policy": {"generation_calls_in_renderer": 0, "assistant_voice_changes": 0, "source_audio_used": False,
                           "global_speed_change": False, "imagery": "Original approved illustrative AI imagery, no real plant/live data claim"}, "outputs": {}}
    frames = cache_picture(args.work)
    for language in ["ar", "en"]:
        destination = args.output / f"sadeed-identity-{language}.mp4"
        if destination.exists():
            raise FileExistsError(destination)
        alignment, scenes = scene_data(language)
        clips = edit_decisions(language, alignment, scenes)
        final_audio, audio_notes = audio_mix(language, alignment, scenes, args.work)
        command = encode(language, frames, clips, final_audio, destination)
        caption = args.output / f"sadeed-identity-{language}.vtt"
        caption_bytes = (HERE / f"narration-{language}.vtt").read_bytes()
        if caption.exists() and caption.read_bytes() != caption_bytes:
            raise FileExistsError(caption)
        caption.write_bytes(caption_bytes)
        checks = review(language, destination, scenes, args.work)
        data = {"language": language, "scenes": scenes, "edit_decisions": clips, "caption_timing": "Unchanged provider character-aligned VTT, no retiming", "audio": audio_notes}
        (HERE / f"scenes-{language}.json").write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")
        manifest["outputs"][language] = {"path": str(destination.relative_to(ROOT)) if destination.is_relative_to(ROOT) else str(destination), "bytes": destination.stat().st_size,
            "sha256": sha(destination), "probe": probe(destination), "checks": checks, "command": command}
        print(json.dumps({"language": language, "path": str(destination), "bytes": destination.stat().st_size}), flush=True)
    manifest["served_video_total_bytes"] = sum(x["bytes"] for x in manifest["outputs"].values())
    manifest["combined_6mib_target_passed"] = manifest["served_video_total_bytes"] <= 6 * 1024 ** 2
    manifest["versions"] = {"python": platform.python_version(), "numpy": np.__version__, "scipy": scipy.__version__, "pillow": Image.__version__, "ffmpeg": run(["ffmpeg", "-version"]).stdout.splitlines()[0]}
    assert sha(SOURCE) == SOURCE_SHA and sha(TWIN) == TWIN_SHA
    (HERE / "production-manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
    del frames
    (args.work / "source-frames.rgb").unlink()
    print(json.dumps({"total_bytes": manifest["served_video_total_bytes"], "within_target": manifest["combined_6mib_target_passed"]}), flush=True)


if __name__ == "__main__":
    main()
