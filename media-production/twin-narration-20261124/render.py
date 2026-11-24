#!/usr/bin/env python3
"""Reproduce the owner-requested bilingual prerecorded twin narration.

No network/provider call. Uses the exact recorded stems and retained original
56-second picture. The requested 1.25 speech effect is applied once to the voice
stems only; there is no picture speed change or timing ratio used to force a fit.
"""
from __future__ import annotations

import hashlib
import json
import math
import subprocess
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[2]
PROJECT = Path(__file__).resolve().parent
SOURCE = ROOT / "public/media/twin/sadeed-twin-640.mp4"
DESTINATION = ROOT / "public/media/twin/narrated"
RATE = 48_000
CHANNELS = 2


def command(args, *, input=None):
    return subprocess.run(args, input=input, check=True, capture_output=True)


def probe(path):
    return json.loads(command(["ffprobe", "-v", "error", "-show_streams", "-show_format",
                               "-of", "json", str(path)]).stdout)


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def decode(path, tempo=1.0):
    args = ["ffmpeg", "-nostdin", "-v", "error", "-i", str(path), "-map", "0:a:0"]
    if tempo != 1.0:
        args += ["-af", f"atempo={tempo:.8f}"]
    args += ["-ar", str(RATE), "-ac", str(CHANNELS), "-f", "f32le", "pipe:1"]
    return np.frombuffer(command(args).stdout, dtype="<f4").reshape(-1, CHANNELS).copy()


def pcm(path, samples):
    command(["ffmpeg", "-nostdin", "-v", "error", "-y", "-f", "f32le", "-ar", str(RATE),
             "-ac", str(CHANNELS), "-i", "pipe:0", "-c:a", "pcm_f32le", str(path)],
            input=samples.astype("<f4").tobytes())


def active_range(samples):
    """Audio-derived phrase envelope; never invent word timestamps."""
    mono = np.max(np.abs(samples), axis=1)
    threshold = max(0.001, float(np.max(mono)) * 0.008)
    active = np.flatnonzero(mono > threshold)
    if not len(active):
        raise ValueError("Recorded narration is silent")
    return int(active[0]), int(active[-1] + 1)


def stamp(seconds):
    ms = round(seconds * 1000)
    return f"{ms // 3600000:02}:{ms // 60000 % 60:02}:{ms // 1000 % 60:02}.{ms % 1000:03}"


def normalize(source, destination):
    spec = "loudnorm=I=-16:TP=-2:LRA=11"
    first = command(["ffmpeg", "-nostdin", "-hide_banner", "-i", str(source), "-af",
                     spec + ":print_format=json", "-f", "null", "-"])
    stderr = first.stderr.decode()
    measured = json.loads(stderr[stderr.rfind("{"):])
    params = (
        f"{spec}:measured_I={measured['input_i']}:measured_TP={measured['input_tp']}:"
        f"measured_LRA={measured['input_lra']}:measured_thresh={measured['input_thresh']}:"
        f"offset={measured['target_offset']}:linear=true:print_format=json,aresample={RATE}"
    )
    command(["ffmpeg", "-nostdin", "-hide_banner", "-y", "-i", str(source),
             "-af", params, "-c:a", "pcm_f32le", str(destination)])
    return measured


def render():
    config_path = PROJECT / "scenes.json"
    config = json.loads(config_path.read_text())
    tempo = float(config["narrationTempo"])
    if tempo != 1.25:
        raise ValueError("The owner requested exactly one 1.25 voice-only speed effect")
    scenes = config["scenes"]
    for scene in scenes:
        for lang in ("ar", "en"):
            if not (PROJECT / "stems" / f"{scene['id']}-{lang}.mp3").is_file():
                raise FileNotFoundError(f"Missing recorded stem: {scene['id']}-{lang}.mp3")
    prepared = {}
    for scene in scenes:
        for lang in ("ar", "en"):
            speech = decode(PROJECT / "stems" / f"{scene['id']}-{lang}.mp3", tempo)
            length = len(speech) / RATE
            allowed = float(scene["end"]) - float(scene["start"])
            if length > allowed:
                raise ValueError(f"{scene['id']}-{lang} needs {length:.3f}s; scene allows {allowed:.3f}s. Revise the script/recording; never force-fit speech.")
            active_range(speech)
            prepared[lang, scene["id"]] = speech
    original = probe(SOURCE)
    seconds = float(original["format"]["duration"])
    if seconds != config["filmSeconds"] or seconds != 56:
        raise ValueError("The retained source must remain exactly 56 seconds")
    frames = round(seconds * RATE)
    original_score = decode(SOURCE)
    if abs(len(original_score) - frames) > 1:
        raise ValueError("Original score does not cover the retained picture clock")
    original_score = original_score[:frames]
    work = PROJECT / "work"
    work.mkdir(exist_ok=True)
    DESTINATION.mkdir(parents=True, exist_ok=True)
    manifest = {
        "schema": 1,
        "source": str(SOURCE.relative_to(ROOT)),
        "sourceSha256": sha256(SOURCE),
        "scriptSha256": sha256(config_path),
        "pictureSeconds": seconds,
        "pictureSpeed": 1,
        "voiceProvider": config["voiceProvider"],
        "voiceId": config["voiceId"],
        "sourceVoiceSpeed": config["sourceVoiceSpeed"],
        "requestedVoiceTempo": tempo,
        "tempoMeaning": "One 1.25x pitch-preserving effect relative to the recorded canonical SADEED voice; picture stays 1x.",
        "captions": "Whole recorded-scene phrases from the approved script; onset/tail from actual audio energy. No word alignment or independent transcription claimed.",
        "listeningReview": "not_performed",
        "ffmpegVersion": command(["ffmpeg", "-version"]).stdout.decode().splitlines()[0],
        "languages": {},
    }
    for lang in ("ar", "en"):
        voice = np.zeros((frames, CHANNELS), dtype=np.float32)
        envelope = np.ones(frames, dtype=np.float32) * 0.18
        cues = []
        recordings = []
        for scene in scenes:
            stem = PROJECT / "stems" / f"{scene['id']}-{lang}.mp3"
            speech = prepared[lang, scene["id"]]
            length = len(speech) / RATE
            first, last = active_range(speech)
            rms = float(np.sqrt(np.mean(speech[first:last] ** 2)))
            gain = min(0.12 / max(rms, 0.000001), 0.88 / max(float(np.max(np.abs(speech))), 0.000001))
            speech *= gain
            # A five-millisecond ramp sits only at the file boundary; no words or
            # pauses are cut, and the source recording remains immutable.
            ramp = min(round(0.005 * RATE), len(speech) // 2)
            speech[:ramp] *= np.linspace(0, 1, ramp)[:, None]
            speech[-ramp:] *= np.linspace(1, 0, ramp)[:, None]
            start = round(float(scene["start"]) * RATE)
            end = start + len(speech)
            voice[start:end] += speech
            speech_rms = float(np.sqrt(np.mean(speech[first:last] ** 2)))
            bed = original_score[start + first:start + last]
            bed_rms = float(np.sqrt(np.mean(bed ** 2)))
            under_gain = min(0.18, speech_rms / (10 ** (22 / 20)) / max(bed_rms, 0.000001))
            anticipation = round(0.08 * RATE)
            recovery = round(0.25 * RATE)
            lead = max(0, start - anticipation)
            tail = min(frames, end + recovery)
            envelope[lead:start] = np.minimum(envelope[lead:start], np.linspace(0.18, under_gain, start - lead))
            envelope[start:end] = np.minimum(envelope[start:end], under_gain)
            envelope[end:tail] = np.minimum(envelope[end:tail], np.linspace(under_gain, 0.18, tail - end))
            cue_start = max(float(scene["start"]), (start + first) / RATE - 0.04)
            cue_end = min(float(scene["end"]), (start + last) / RATE + 0.12)
            cues.append((scene["id"], cue_start, cue_end, scene[lang]))
            recordings.append({
                "scene": scene["id"], "stem": str(stem.relative_to(ROOT)),
                "sha256": sha256(stem), "sourceDurationSeconds": float(probe(stem)["format"]["duration"]),
                "preparedDurationSeconds": length, "tempo": tempo,
                "sequenceStart": float(scene["start"]), "sequenceEnd": end / RATE,
                "activeSpeechStart": (start + first) / RATE, "activeSpeechEnd": (start + last) / RATE,
                "speechRmsDbfs": 20 * math.log10(speech_rms),
                "bedToSpeechDbDuringPhrase": -22 if under_gain < 0.18 else 20 * math.log10(bed_rms * under_gain / speech_rms),
                "text": scene[lang],
            })
        mix = voice + original_score * envelope[:, None]
        pcm(work / f"voice-{lang}.wav", voice)
        pcm(work / f"mix-{lang}.wav", mix)
        loudness = normalize(work / f"mix-{lang}.wav", work / f"master-{lang}.wav")
        vtt = "WEBVTT\n\n" + "\n\n".join(f"{cue}\n{stamp(start)} --> {stamp(end)}\n{text}" for cue, start, end, text in cues) + "\n"
        (DESTINATION / f"sadeed-twin-{lang}.vtt").write_text(vtt)
        (PROJECT / f"transcript-{lang}.txt").write_text("\n\n".join(c[3] for c in cues) + "\n")
        manifest["languages"][lang] = {"recordings": recordings, "normalizationInput": loudness}
    # Copy the existing responsive picture stream rather than re-encode it.
    # Both languages retain exactly the same original 640-tier frames/cadence;
    # this fits the unchanged static-output budget without another lossy pass.
    picture = work / "picture.mp4"
    command(["ffmpeg", "-nostdin", "-v", "error", "-y", "-i", str(SOURCE), "-map", "0:v:0",
             "-an", "-c:v", "copy",
             "-movflags", "+faststart", str(picture)])
    for lang in ("ar", "en"):
        output = DESTINATION / f"sadeed-twin-{lang}.mp4"
        command(["ffmpeg", "-nostdin", "-v", "error", "-y", "-i", str(picture), "-i", str(work / f"master-{lang}.wav"),
                 "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy", "-c:a", "aac", "-b:a", "96k",
                 "-ar", str(RATE), "-movflags", "+faststart", str(output)])
        metadata = probe(output)
        duration = float(metadata["format"]["duration"])
        if abs(duration - seconds) > 1 / 30:
            raise ValueError(f"Output clock differs: {lang} {duration}s")
        # Full decode proves neither stream is merely described by its metadata.
        command(["ffmpeg", "-nostdin", "-v", "error", "-i", str(output), "-f", "null", "-"])
        final_loudness = command(["ffmpeg", "-nostdin", "-hide_banner", "-i", str(output), "-af",
                                  "loudnorm=I=-16:TP=-2:LRA=11:print_format=json", "-f", "null", "-"]).stderr.decode()
        final_levels = json.loads(final_loudness[final_loudness.rfind("{"):])
        manifest["languages"][lang].update({"output": str(output.relative_to(ROOT)), "bytes": output.stat().st_size,
            "sha256": sha256(output), "probe": metadata, "encodedLoudness": final_levels, "fullDecode": "passed"})
    manifest["pictureEncoding"] = {"codec": "h264", "mode": "stream-copy", "dimensions": [640, 360], "fps": 30, "additionalLossyEncode": False}
    manifest["servedBytes"] = sum(p.stat().st_size for p in DESTINATION.iterdir() if p.is_file())
    (PROJECT / "production-manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
    readiness = {
        "status": "rendered_checked",
        "scriptLanguages": ["ar", "en"],
        "requestedNarrationTempo": tempo,
        "pictureSpeed": 1,
        "publicNarratedAssetsCreated": True,
        "productionManifest": "production-manifest.json",
        "listeningReview": manifest["listeningReview"],
        "limits": "Media decoding, timing, size and loudness verified; no independent voice recognition, listening or application deployment claimed.",
    }
    (PROJECT / "readiness.json").write_text(json.dumps(readiness, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({"servedBytes": manifest["servedBytes"], "languages": {lang: {"bytes": manifest["languages"][lang]["bytes"],
        "seconds": manifest["languages"][lang]["probe"]["format"]["duration"]} for lang in ("ar", "en")}}, indent=2))


if __name__ == "__main__":
    render()
