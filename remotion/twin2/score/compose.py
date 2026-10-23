#!/usr/bin/env python3
"""
موسيقى وصوت «فيلم التوأم الرقمي v2» — تأليفٌ أصليٌّ مركَّبٌ بالكود من الصفر (numpy + scipy)، بلا عيّنةٍ ولا
صوتٍ من طرفٍ ثالث، وبلا أيّ صوتٍ بشريّ أو نطق.

المهمة: «ضع صوت مناسب له» و«أجمل فيديو عصري» — فيلمٌ شارحٌ مسطَّح عن سريان الكهرباء ورجال الأمن في محطات الكهرباء
والتوأم الرقمي. الطابع «cinematic tech explainer»: دافئٌ لا عدوانيّ؛ بساطٌ واسع، أربيجو رقيق، نبضٌ هادئ، جهيرٌ ناعم،
بيانو كهربائيّ (FM)، ولمساتٌ إلكترونية خفيفة — تحتها طبقةُ تصميمِ صوتٍ (خطوات على الحصى، لاسلكيّ، هسيس توليد، رشقات
تيّار، قاطع، خادم بوّابة، صافرات فحص، كاميرات، مسيّرة، شاشات، تحوّل رقميّ، إنذارٌ بنبرتين).

الزمن مقفلٌ على شبكة الفيلم: 56.000 ث بالضبط، 120 نبضة/د (النبضة 0.5 ث، المازورة 2 ث)، 28 مازورة.
القالب: ري (D) — صغيرٌ/دوريّ في الأقسام 1–3 (D Dorian: Dm9 · B♭maj9 · Gm9 …)، وكبيرٌ ابتداءً من 38.0 (التحوّل).
اللحن الموجّه (motif) من ست نغمات يعود في 4.0 (تعريف) ثم 22.0 و48.0 و52.0: A4 D5 F5 | G5 F5 D5 (وفي الكبير
A4 D5 F♯5 | G5 F♯5 A5).

الاستعمال:
  python3 compose.py --out DIR [--encode DIR2] [--evidence]
      ← DIR/twin2-score.wav (‏48 kHz · ستيريو · float32) و DIR/score-meta.json و DIR/cue-sheet.json
      ← ومع --encode: twin2-score.m4a (AAC-LC 128k) و twin2-score.opus.webm (Opus ~112k)
      ← ومع --evidence: spectrum.png · wave.png · analysis.json (يتطلّب ffmpeg)

الناتج حتميّ: بذرةٌ ثابتة ومولّدٌ مستقلّ لكل عنصر، ولا خيوط ولا وقتَ نظامٍ في المسار.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import subprocess
import zlib
from pathlib import Path

import numpy as np
from scipy import signal
from scipy.io import wavfile

# ═══════════════════════════════════ الشبكة والزمن ═══════════════════════════════════

SR = 48_000
SEED = 20261023
FILM_SECONDS = 56.0
TOTAL = FILM_SECONDS
N = int(round(TOTAL * SR))
BEAT = 0.5
BAR = 2.0
STEP8 = BEAT / 2  # الثُّمن 0.25 ث
STEP16 = BEAT / 4  # السادس عشر 0.125 ث
SILENT_FROM = 55.90  # بعده صفرٌ رقميّ

TARGET_LUFS = -15.0
CEILING_DBTP = -1.3
TITLE = "Digital Twin v2 — film score (original)"
WAV_NAME = "twin2-score.wav"
M4A_NAME = "twin2-score.m4a"
WEBM_NAME = "twin2-score.opus.webm"

# ── التآلف: كل مازورة وترٌ — مفتاحه اسم الوتر ──
BAR_CHORDS = [
    # القسم 1 (0–8) الفجر
    "Dm9", "Bbmaj9", "Fmaj9", "Gm9",
    # القسم 2 (8–24) الرحلة
    "Dm9", "Bbmaj9", "Fmaj9", "Gm9",
    "Dm9", "Gm9", "Bbmaj9", "Dm9",
    # القسم 3 (24–38) الأمن
    "Dm9", "Bbmaj9", "Gm9", "Asus4",
    "Dm9", "Bbmaj9", "Asus4",
    # القسم 4 (38–50) التوأم — ري الكبير
    "Dadd9", "Bm7", "Gmaj9", "Em7b5", "Asus4", "Dmaj9",
    # القسم 5 (50–56) الخاتمة
    "Gmaj9", "Dadd9", "Dmaj9",
]  # fmt: skip
assert len(BAR_CHORDS) == 28

PAD = {  # أصواتٌ مفتوحة (MIDI، A4 = 69) بقيادة أصواتٍ ناعمة
    "Dm9": [50, 57, 60, 65, 69, 76],
    "Bbmaj9": [46, 53, 57, 62, 65, 72],
    "Fmaj9": [53, 57, 60, 64, 67, 72],
    "Gm9": [55, 58, 62, 65, 69, 74],
    "Asus4": [57, 62, 67, 69, 74, 76],
    "Dadd9": [50, 57, 66, 69, 74, 76],
    "Bm7": [54, 57, 62, 66, 69, 71],
    "Gmaj9": [55, 59, 62, 66, 69, 74],
    "Em7b5": [52, 55, 58, 62, 67, 70],
    "Dmaj9": [50, 57, 61, 66, 69, 73, 76],
}
BASS = {"Dm9": 38, "Bbmaj9": 34, "Fmaj9": 41, "Gm9": 43, "Asus4": 45, "Dadd9": 38, "Bm7": 35, "Gmaj9": 43, "Em7b5": 40, "Dmaj9": 38}
PCS = {  # أصناف النغمات للأربيجو
    "Dm9": {2, 5, 9, 0, 4},
    "Bbmaj9": {10, 2, 5, 9, 0},
    "Fmaj9": {5, 9, 0, 4, 7},
    "Gm9": {7, 10, 2, 5, 9},
    "Asus4": {9, 2, 4, 7},
    "Dadd9": {2, 6, 9, 4},
    "Bm7": {11, 2, 6, 9},
    "Gmaj9": {7, 11, 2, 6, 9},
    "Em7b5": {4, 7, 10, 2},
    "Dmaj9": {2, 6, 9, 1, 4},
}
EP = {  # أصواتُ البيانو الكهربائيّ (أربع نغماتٍ حول 55–74)
    "Dm9": [57, 60, 65, 69, 76],
    "Bbmaj9": [58, 62, 65, 69, 72],
    "Fmaj9": [57, 60, 64, 67, 72],
    "Gm9": [58, 62, 65, 69, 74],
    "Asus4": [57, 62, 64, 67, 69],
    "Dadd9": [57, 62, 66, 69, 76],
    "Bm7": [57, 62, 66, 69, 71],
    "Gmaj9": [59, 62, 66, 69, 74],
    "Em7b5": [55, 58, 62, 64, 67],
    "Dmaj9": [61, 64, 66, 69, 73],
}

# ── اللحن الموجّه ──
MOTIF_T = [0.0, 0.5, 1.0, 1.75, 2.0, 2.5]  # ث (عند سلّم 1)
MOTIF_D = [0.5, 0.5, 0.75, 0.25, 0.5, 1.5]
MOTIF_MIN = [69, 74, 77, 79, 77, 74]  # A4 D5 F5 G5 F5 D5
MOTIF_MAJ = [69, 74, 78, 79, 78, 81]  # A4 D5 F♯5 G5 F♯5 A5

# ═══════════════════════════════════════ أدوات ═══════════════════════════════════════


def ns(sec: float) -> int:
    return int(round(sec * SR))


def tvec(n: int) -> np.ndarray:
    return np.arange(n) / SR


def dbg(db: float) -> float:
    return 10.0 ** (db / 20.0)


def mtof(m: float) -> float:
    return float(440.0 * 2.0 ** ((m - 69.0) / 12.0))


def rng_for(tag: str) -> np.random.Generator:
    """مولّدٌ ثابت البذرة لكل عنصر: إضافةُ عنصرٍ لا تغيّر ضجيج غيره."""
    return np.random.default_rng([SEED, zlib.crc32(tag.encode("utf-8"))])


def pan_gains(p: float) -> tuple[float, float]:
    a = (float(np.clip(p, -1.0, 1.0)) + 1.0) * np.pi / 4.0
    return float(np.cos(a) * np.sqrt(2.0)), float(np.sin(a) * np.sqrt(2.0))


def fades(n: int, fin: float, fout: float) -> np.ndarray:
    """جيب تمامٍ مرفوع في الطرفين: يبدأ من صفرٍ وينتهي بصفر — فلا نقرة."""
    g = np.ones(n)
    a, b = min(ns(fin), n), min(ns(fout), n)
    if a > 0:
        g[:a] *= 0.5 - 0.5 * np.cos(np.pi * np.arange(a) / a)
    if b > 0:
        g[n - b :] *= 0.5 + 0.5 * np.cos(np.pi * (np.arange(b) + 1) / b)
    return g


def norm(x: np.ndarray) -> np.ndarray:
    peak = float(np.max(np.abs(x)))
    return x / peak if peak > 0 else x


def stereo(x: np.ndarray, pan: float = 0.0) -> np.ndarray:
    left, right = pan_gains(pan)
    if x.ndim == 2:
        return x * np.array([left, right]) if pan else x
    return np.stack([x * left, x * right], axis=1)


def pan_path(x: np.ndarray, p: np.ndarray) -> np.ndarray:
    a = (np.clip(p, -1.0, 1.0) + 1.0) * np.pi / 4.0
    return np.stack([x * np.cos(a), x * np.sin(a)], axis=1) * np.sqrt(2.0)


def perc(n: int, attack: float, tau: float) -> np.ndarray:
    t = tvec(n)
    a = np.clip(t / attack, 0.0, 1.0) if attack > 0 else np.ones(n)
    return a * np.exp(-np.maximum(t - attack, 0.0) / tau)


def curve(points: list[tuple[float, float]], t: np.ndarray, log: bool = False) -> np.ndarray:
    """منحنى متعدّد القطع على متّجه الزمن؛ `log=True` للتردّدات (تدرّجٌ أُسّيّ)."""
    xs, ys = [p[0] for p in points], [p[1] for p in points]
    if log:
        return np.exp(np.interp(t, xs, np.log(ys)))
    return np.interp(t, xs, ys)


def slow_noise(rng: np.random.Generator, n: int, fc: float) -> np.ndarray:
    """ضجيجٌ بطيءٌ مقيَّس إلى (0،1) — للنفخات والتموّج."""
    z = signal.sosfilt(signal.butter(2, fc, btype="lowpass", fs=SR, output="sos"), rng.standard_normal(n + SR))[SR:]
    z = (z - z.mean()) / (z.std() + 1e-12)
    return 1.0 / (1.0 + np.exp(-1.6 * z))


# ═════════════════════════════════════ المذبذبات ═════════════════════════════════════


def phase(freq, n: int, phase0: float = 0.0) -> tuple[np.ndarray, np.ndarray]:
    f = np.full(n, float(freq)) if np.ndim(freq) == 0 else np.asarray(freq, dtype=float)[:n]
    dt = f / SR
    ph = np.empty(n)
    ph[0] = 0.0
    np.cumsum(dt[:-1], out=ph[1:])
    return np.mod(ph + phase0, 1.0), dt


def saw(freq, n: int, phase0: float = 0.0) -> np.ndarray:
    """منشارٌ محدود النطاق (PolyBLEP)."""
    ph, dt = phase(freq, n, phase0)
    y = 2.0 * ph - 1.0
    m = ph < dt
    x = ph[m] / dt[m]
    y[m] -= x + x - x * x - 1.0
    m = ph > 1.0 - dt
    x = (ph[m] - 1.0) / dt[m]
    y[m] -= x * x + x + x + 1.0
    return y


def sine(freq, n: int, phase0: float = 0.0) -> np.ndarray:
    ph, _ = phase(freq, n, phase0)
    return np.sin(2.0 * np.pi * ph)


# ═════════════════════════════════════ المرشّحات ═════════════════════════════════════


def rbj(kind: str, f: float, q: float = 0.7071, gain_db: float = 0.0):
    f = min(max(float(f), 5.0), 0.47 * SR)
    w0 = 2.0 * np.pi * f / SR
    cw, sw = np.cos(w0), np.sin(w0)
    alpha = sw / (2.0 * q)
    big_a = 10.0 ** (gain_db / 40.0)
    if kind == "lp":
        b = [(1 - cw) / 2, 1 - cw, (1 - cw) / 2]
        a = [1 + alpha, -2 * cw, 1 - alpha]
    elif kind == "hp":
        b = [(1 + cw) / 2, -(1 + cw), (1 + cw) / 2]
        a = [1 + alpha, -2 * cw, 1 - alpha]
    elif kind == "bp":
        b = [alpha, 0.0, -alpha]
        a = [1 + alpha, -2 * cw, 1 - alpha]
    elif kind == "peak":
        b = [1 + alpha * big_a, -2 * cw, 1 - alpha * big_a]
        a = [1 + alpha / big_a, -2 * cw, 1 - alpha / big_a]
    elif kind == "hshelf":
        s = 2 * np.sqrt(big_a) * alpha
        b = [
            big_a * ((big_a + 1) + (big_a - 1) * cw + s),
            -2 * big_a * ((big_a - 1) + (big_a + 1) * cw),
            big_a * ((big_a + 1) + (big_a - 1) * cw - s),
        ]
        a = [(big_a + 1) - (big_a - 1) * cw + s, 2 * ((big_a - 1) - (big_a + 1) * cw), (big_a + 1) - (big_a - 1) * cw - s]
    elif kind == "lshelf":
        s = 2 * np.sqrt(big_a) * alpha
        b = [
            big_a * ((big_a + 1) - (big_a - 1) * cw + s),
            2 * big_a * ((big_a - 1) - (big_a + 1) * cw),
            big_a * ((big_a + 1) - (big_a - 1) * cw - s),
        ]
        a = [(big_a + 1) + (big_a - 1) * cw + s, -2 * ((big_a - 1) + (big_a + 1) * cw), (big_a + 1) + (big_a - 1) * cw - s]
    else:
        raise ValueError(kind)
    b, a = np.asarray(b, dtype=float), np.asarray(a, dtype=float)
    return b / a[0], a / a[0]


def biquad(x: np.ndarray, kind: str, f: float, q: float = 0.7071, gain_db: float = 0.0) -> np.ndarray:
    b, a = rbj(kind, f, q, gain_db)
    return signal.lfilter(b, a, x, axis=0)


def bw(x: np.ndarray, kind: str, f, order: int = 2) -> np.ndarray:
    btype = {"lp": "lowpass", "hp": "highpass", "bp": "bandpass"}[kind]
    sos = signal.butter(order, f, btype=btype, fs=SR, output="sos")
    return signal.sosfilt(sos, x, axis=0)


def sweep(x: np.ndarray, kind: str, fc, q: float = 0.7071, block: int = 32, stages: int = 1) -> np.ndarray:
    """مرشّحٌ يتحرّك تردّده مع الزمن (معاملات RBJ تُحدَّث كل `block` عيّنة والحالة مستمرّة)."""
    x = np.asarray(x, dtype=float)
    n = x.shape[0]
    fc = np.full(n, float(fc)) if np.ndim(fc) == 0 else np.asarray(fc, dtype=float)
    y = x
    for _ in range(stages):
        out = np.empty_like(y)
        zi = np.zeros((2,) + y.shape[1:])
        for i in range(0, n, block):
            j = min(n, i + block)
            b, a = rbj(kind, fc[(i + j) // 2], q)
            out[i:j], zi = signal.lfilter(b, a, y[i:j], axis=0, zi=zi)
        y = out
    return y


def softsat(x: np.ndarray, drive: float) -> np.ndarray:
    return np.tanh(drive * x) / np.tanh(drive)


# ═══════════════════════════════════ آلات الموسيقى ═══════════════════════════════════
# كل آلةٍ تعيد إشارةً قمّتها ≈1؛ المستوى يُضبط في التوزيع (dB).


def pad_voice(midis: list[int], t0: float, dur: float, att: float, rel: float, detune: float = 7.0, width: float = 0.85) -> np.ndarray:
    """بساطٌ دافئ: ثلاثة مناشير منحرفةٌ قليلًا لكل نغمة + جيبٌ يملأ الجسم، بأطوارٍ مطلقة (متّصلةٌ عبر المقاطع)
    فلا يلغي بعضُها بعضًا عند التراكب بين مازورتين. موزَّعةٌ على العرض."""
    n = ns(dur)
    out = np.zeros((n, 2))
    cents, pans, gains = (-detune, 0.0, detune), (-0.8, 0.0, 0.8), (0.7, 1.0, 0.7)
    for i, m in enumerate(midis):
        f = mtof(m)
        for k, c in enumerate(cents):
            ff = f * 2.0 ** (c / 1200.0)
            ph0 = (rng_for(f"padph/{m}/{k}").random() + ff * t0) % 1.0
            v = saw(ff, n, ph0) * gains[k]
            left, right = pan_gains(pans[(k + i) % 3] * width)
            out[:, 0] += v * left
            out[:, 1] += v * right
        body = 0.55 * sine(f, n, (f * t0) % 1.0)
        left, right = pan_gains(0.25 * width * (1 if i % 2 else -1))
        out[:, 0] += body * left
        out[:, 1] += body * right
    out /= np.sqrt(len(midis) * 2.0)
    return out * fades(n, att, rel)[:, None]


def kick_soft(rng: np.random.Generator) -> np.ndarray:
    """نبضةٌ ناعمة: جيبٌ يهبط 118→46 Hz بتشبّعٍ خفيف ونقرةٌ خافتة."""
    n = ns(0.5)
    t = tvec(n)
    f = 46.0 + (118.0 - 46.0) * np.exp(-t / 0.035)
    body = sine(f, n) * perc(n, 0.0012, 0.15)
    body = softsat(body, 1.25)
    cn = ns(0.006)
    click = norm(bw(rng.standard_normal(cn) * np.exp(-tvec(cn) / 0.001), "bp", (1200.0, 5000.0)))
    body[:cn] += dbg(-24.0) * click
    return norm(body * fades(n, 0.0, 0.06))


def boom_soft(rng: np.random.Generator, f_hi: float = 90.0, f_lo: float = 34.0, dur: float = 2.2, tau_a: float = 0.6, drive: float = 1.4) -> np.ndarray:
    """ضربةٌ عميقة ناعمة (sub drop)."""
    n = ns(dur)
    t = tvec(n)
    f = f_lo + (f_hi - f_lo) * np.exp(-t / 0.3)
    x = softsat(sine(f, n) * perc(n, 0.004, tau_a), drive)
    thump = norm(bw(rng.standard_normal(n) * perc(n, 0.002, 0.05), "lp", 220.0, 4))
    return norm((x + dbg(-12.0) * thump) * fades(n, 0.0, 0.35))


def sub_bass(midi: int, dur: float, harm: float = 0.3, drive: float = 1.25) -> np.ndarray:
    """جهيرٌ ناعم: جيبٌ وأوّل جوابٍ خفيف بتشبّعٍ ليّن، يصعد في 8 ms ويخفت في 40 ms."""
    f = mtof(midi)
    n = ns(dur + 0.04)
    x = sine(f, n) + harm * sine(2.0 * f, n, 0.1) + 0.08 * sine(3.0 * f, n, 0.3)
    return softsat(x, drive) * fades(n, 0.008, 0.04)


def epiano(midi: int, dur: float, vel: float = 1.0) -> np.ndarray:
    """بيانو كهربائيّ بالتعديل التردّديّ (FM): دافئ، مؤشّرٌ يضمحلّ، ونقرة «تاين» خافتة."""
    f = mtof(midi)
    n = ns(dur + 0.4)
    t = tvec(n)
    idx = (0.7 + 1.5 * vel) * np.exp(-t / 0.3) + 0.12
    car = np.sin(2 * np.pi * f * t + idx * np.sin(2 * np.pi * f * t))
    tine = 0.10 * vel * np.sin(2 * np.pi * 5.0 * f * t + 0.4) * np.exp(-t / 0.06)
    env = np.minimum(1.0, t / 0.004) * np.exp(-t / 1.1)
    y = (car * env + tine) * fades(n, 0.0, 0.35)
    return bw(y, "lp", 6500.0)


def pluck(rng: np.random.Generator, midi: int, gate: float, vel: float, cutoff: float, env_amt: float = 1800.0) -> np.ndarray:
    """نقرة الأربيجو: منشاران وجوابٌ جيبيّ عبر مرشّحٍ رباعيّ بغلافٍ سريع."""
    f = mtof(midi)
    n = ns(gate + 0.06)
    t = tvec(n)
    x = 0.5 * saw(f * 2 ** (-6 / 1200), n, rng.random()) + 0.5 * saw(f * 2 ** (6 / 1200), n, rng.random())
    x += 0.2 * sine(2.0 * f, n)
    fc = np.minimum(cutoff + env_amt * vel * np.exp(-t / 0.07), 14000.0)
    x = sweep(x, "lp", fc, q=0.9, block=32, stages=2)
    return vel * x * np.minimum(1.0, t / 0.002) * np.exp(-t / 0.2) * fades(n, 0.0, 0.05)


def signature(midi: int, dur: float = 1.2, vel: float = 1.0, tau: float = 0.7, bright: float = 1.0) -> np.ndarray:
    """صوتُ اللحن الموجّه: نقرةٌ زجاجية دافئة (FM بنسبة 2 ومؤشّرٌ يضمحلّ) بنسختين منحرفتين قليلًا."""
    f = mtof(midi)
    n = ns(dur)
    t = tvec(n)
    idx = (1.7 * bright) * np.exp(-t / 0.11) + 0.1
    y = np.zeros(n)
    for c in (-3.0, 3.0):
        ff = f * 2.0 ** (c / 1200.0)
        y += np.sin(2 * np.pi * ff * t + idx * np.sin(2 * np.pi * ff * 2.0 * t))
    y += 0.22 * np.sin(2 * np.pi * 3.0 * f * t) * np.exp(-t / 0.12) * bright
    y *= np.minimum(1.0, t / 0.002) * np.exp(-t / tau) * fades(n, 0.0, min(0.4, dur * 0.4))
    return norm(bw(y, "lp", 9000.0))


GLOCK = ((1.0, 1.0, 1.0), (2.756, 0.34, 0.4), (5.404, 0.12, 0.2), (8.933, 0.04, 0.1))


def glock(rng: np.random.Generator, midi: int, dur: float = 1.6, tau: float = 1.1, top_hz: float = 9500.0) -> np.ndarray:
    """جرسٌ زجاجيّ: أجزاءٌ غير توافقية تضمحلّ العليا منها أسرع؛ محصورٌ تحت `top_hz`."""
    f = mtof(midi)
    n = ns(dur)
    t = tvec(n)
    y = np.zeros(n)
    for r, a, d in GLOCK:
        if f * r < top_hz:
            y += a * np.sin(2 * np.pi * f * r * t + rng.random() * 2 * np.pi) * np.exp(-t / (tau * d))
    return norm(y * np.minimum(1.0, t / 0.0012) * fades(n, 0.0, min(0.1, dur * 0.3)))


def marimba(midi: int, dur: float = 0.7, tau: float = 0.22) -> np.ndarray:
    """خشبيّ ناعم (إنذار): جزءٌ أساسيّ وجزءٌ رابعٌ سريع الاضمحلال."""
    f = mtof(midi)
    n = ns(dur)
    t = tvec(n)
    y = np.sin(2 * np.pi * f * t) * np.exp(-t / tau)
    y += 0.28 * np.sin(2 * np.pi * 3.99 * f * t) * np.exp(-t / 0.05)
    y += 0.03 * np.sin(2 * np.pi * 9.9 * f * t) * np.exp(-t / 0.02)
    return norm(y * np.minimum(1.0, t / 0.002) * fades(n, 0.0, 0.12))


# ═══════════════════════════════════ الإيقاع والانتقالات ═══════════════════════════════════


def shaker(rng: np.random.Generator, dur: float = 0.11, tau: float = 0.035) -> np.ndarray:
    """شاكر ناعم: ضجيجٌ 4.5–9.5 kHz بهجومٍ 6 ms — لا حدّة."""
    n = ns(dur)
    a, b = rng.standard_normal((2, n))
    st = np.stack([0.9 * a + 0.4 * b, 0.9 * a - 0.4 * b], axis=1)
    st *= perc(n, 0.006, tau)[:, None]
    st = bw(bw(st, "hp", 4500.0), "lp", 9500.0)
    return norm(st * fades(n, 0.0, 0.015)[:, None])


def snap(rng: np.random.Generator) -> np.ndarray:
    """طقطقة أصابع/تصفيق خفيف: ثلاث دفعاتٍ متقاربة في 1.1–4.5 kHz."""
    n = ns(0.22)
    t = tvec(n)
    env = np.zeros(n)
    for k, off in enumerate((0.0, 0.009, 0.019)):
        tt = t - off
        on = tt >= 0
        tau, lvl = (0.004, 0.8) if k < 2 else (0.05, 1.0)
        env[on] = np.maximum(env[on], lvl * np.minimum(1.0, tt[on] / 0.0006) * np.exp(-tt[on] / tau))
    a, b = rng.standard_normal((2, n))
    st = np.stack([0.9 * a + 0.4 * b, 0.9 * a - 0.4 * b], axis=1) * env[:, None]
    st = biquad(bw(st, "bp", (1100.0, 4500.0)), "peak", 2000.0, 1.0, 3.0)
    return norm(st * fades(n, 0.0, 0.05)[:, None])


def tick(rng: np.random.Generator, f: float = 2300.0) -> np.ndarray:
    """نقرةٌ خشبية قصيرة (tick)."""
    n = ns(0.07)
    x = sine(f, n) * perc(n, 0.0004, 0.008) + 0.5 * bw(rng.standard_normal(n), "bp", (1800.0, 5500.0)) * perc(n, 0.0003, 0.004)
    return norm(x * fades(n, 0.0, 0.02))


def crash(rng: np.random.Generator, dur: float = 2.2, tau: float = 0.55, hp: float = 3000.0, lp: float = 9000.0) -> np.ndarray:
    n = ns(dur)
    t = tvec(n)
    a, b = rng.standard_normal((2, n))
    st = np.stack([0.8 * a + 0.6 * b, 0.8 * a - 0.6 * b], axis=1)
    for f in (3150.0, 4420.0, 5310.0, 6870.0):
        ring = 0.1 * np.sin(2 * np.pi * f * t + rng.random() * 2 * np.pi)
        st += np.stack([ring, np.roll(ring, 37)], axis=1)
    st *= perc(n, 0.002, tau)[:, None]
    st = bw(bw(st, "hp", hp), "lp", lp)
    return norm(st * fades(n, 0.0, 0.2)[:, None])


def reverse_cymbal(rng: np.random.Generator, dur: float, peak_end: float = 0.004) -> np.ndarray:
    c = crash(rng, dur=dur, tau=dur * 0.42)[::-1].copy()
    return norm(c * fades(c.shape[0], dur * 0.25, peak_end)[:, None])


def whoosh(rng: np.random.Generator, dur: float, peak: float, pan_from: float, pan_to: float, f_lo: float = 600.0, f_hi: float = 3200.0) -> np.ndarray:
    n = ns(dur)
    t = tvec(n)
    up = np.clip(t / peak, 0.0, 1.0)
    down = np.clip((t - peak) / (dur - peak), 0.0, 1.0)
    env = np.where(t < peak, np.sin(0.5 * np.pi * up) ** 2.2, (1.0 - down) ** 2)
    fc = np.where(t < peak, f_lo * (f_hi / f_lo) ** up, f_hi * (f_lo / f_hi) ** (0.6 * down))
    x = sweep(rng.standard_normal(n), "bp", fc, q=1.4) * env
    return norm(pan_path(x, pan_from + (pan_to - pan_from) * t / dur))


def riser(rng: np.random.Generator, dur: float, f0: float = 350.0, f1: float = 7000.0, floor_db: float = -34.0) -> np.ndarray:
    n = ns(dur)
    u = tvec(n) / dur
    st = rng.standard_normal((n, 2))
    st = sweep(st, "bp", f0 * (f1 / f0) ** (u**1.5), q=1.1, block=64)
    st = bw(bw(st, "hp", 220.0), "lp", 9500.0)
    amp = dbg(floor_db * (1.0 - u) ** 1.3) * fades(n, 0.05, 0.003)
    return norm(st * amp[:, None])


def shimmer(rng: np.random.Generator, dur: float = 1.5, turns: float = 2.0, f0: float = 1800.0, f1: float = 9000.0, tail: float = 0.4) -> np.ndarray:
    """بريقٌ صاعد: ضجيجٌ ضيّق النطاق يصعد تردّده ويدور بين السمّاعتين."""
    n = ns(dur)
    u = tvec(n) / dur
    x = sweep(rng.standard_normal(n), "bp", f0 * (f1 / f0) ** u, q=3.0)
    x *= np.sin(0.5 * np.pi * np.clip(u / 0.7, 0.0, 1.0)) ** 2 * fades(n, 0.0, tail)
    return norm(bw(pan_path(x, 0.7 * np.sin(2 * np.pi * turns * u)), "lp", 10000.0))


# ═══════════════════════════════════ تصميم الصوت (SFX) ═══════════════════════════════════


def step(rng: np.random.Generator, heavy: float = 1.0, bright: float = 1.0) -> np.ndarray:
    """خطوةٌ على حصى: حبيباتٌ ضجيجية دقيقة (قرمشة) + خدشُ جلدٍ + ثقلٌ منخفض."""
    n = ns(0.24)
    t = tvec(n)
    x = np.zeros(n)
    count = int(26 + 26 * heavy)
    pos = (rng.random(count) ** 1.7) * 0.12
    for p in pos:
        gl = ns(0.0012 + 0.0022 * rng.random())
        i = ns(p)
        g = rng.standard_normal(gl) * np.hanning(gl) * (0.25 + 0.75 * rng.random())
        k = min(gl, n - i)
        x[i : i + k] += g[:k]
    x = bw(x, "bp", (900.0 * bright, 6200.0))
    x *= perc(n, 0.005, 0.045)
    scuff = bw(rng.standard_normal(n), "bp", (300.0, 1300.0)) * perc(n, 0.007, 0.03)
    thud = sine(62.0 + 40.0 * np.exp(-t / 0.025), n) * perc(n, 0.004, 0.04)
    y = 0.9 * norm(x) + 0.5 * norm(scuff) + 0.65 * heavy * norm(thud)
    return norm(y * fades(n, 0.0, 0.04))


def radio_call(rng: np.random.Generator) -> np.ndarray:
    """نقرةُ فتح اللاسلكيّ + هسيسٌ ضيّق النطاق + بوقٌ خفيف (D6) + ذيلُ إغلاق — بمرشّح لاسلكيّ 450–3400 Hz."""
    n = ns(0.72)
    t = tvec(n)
    x = np.zeros(n)
    c = ns(0.007)
    x[:c] += bw(rng.standard_normal(c) * np.exp(-tvec(c) / 0.0018), "bp", (900.0, 4200.0)) * 2.4  # نقرة الفتح
    h0, h1 = ns(0.012), ns(0.19)
    hiss = bw(rng.standard_normal(h1 - h0), "bp", (700.0, 3400.0))
    hiss *= fades(h1 - h0, 0.01, 0.05) * (0.55 + 0.45 * np.sin(2 * np.pi * 37.0 * tvec(h1 - h0)) ** 2)
    x[h0:h1] += 0.55 * hiss
    b0, b1 = ns(0.205), ns(0.205 + 0.095)
    beep = (sine(mtof(86), b1 - b0) + 0.15 * sine(mtof(98), b1 - b0)) * fades(b1 - b0, 0.006, 0.025)
    x[b0:b1] += 0.7 * beep
    q0, q1 = ns(0.34), ns(0.34 + 0.16)
    tailn = bw(rng.standard_normal(q1 - q0), "bp", (800.0, 3200.0)) * perc(q1 - q0, 0.003, 0.03) * 0.8
    x[q0:q1] += tailn
    cc = ns(0.36)
    x[cc : cc + c] += 0.9 * bw(rng.standard_normal(c) * np.exp(-tvec(c) / 0.0018), "bp", (900.0, 4200.0))  # نقرة الإغلاق
    x = np.tanh(1.8 * bw(x, "bp", (450.0, 3400.0))) / np.tanh(1.8)
    return norm(x * fades(n, 0.0, 0.04))


def station_hum(dur: float, fin: float = 1.6, fout: float = 1.4, lp: float = 420.0) -> np.ndarray:
    """طنين محطةٍ بعيد (50/100/150/200 Hz) بتموّجٍ بطيء — خافتٌ جدًّا ويظهر ويغيب."""
    n = ns(dur)
    t = tvec(n)
    x = 0.4 * np.sin(2 * np.pi * 50.0 * t) + 1.0 * np.sin(2 * np.pi * 100.0 * t + 0.3) + 0.5 * np.sin(2 * np.pi * 150.0 * t + 0.9) + 0.22 * np.sin(2 * np.pi * 200.0 * t + 1.7)
    x *= 1.0 + 0.14 * np.sin(2 * np.pi * 0.17 * t)
    return norm(bw(x, "lp", lp)) * fades(n, fin, fout)


def air(rng: np.random.Generator, dur: float) -> np.ndarray:
    """هواء الفجر: ضجيجٌ وردي رقيق بنفخاتٍ بطيئة تختلف بين القناتين."""
    n = ns(dur)
    out = np.zeros((n, 2))
    for ch in range(2):
        w = rng.standard_normal(n)
        g = slow_noise(rng, n, 0.28)
        w = sweep(bw(w, "bp", (280.0, 6000.0)), "lp", 700.0 + 2600.0 * g, q=0.7, block=128)
        out[:, ch] = w * (0.3 + 0.7 * g)
    return norm(out) * fades(n, 1.8, 1.2)[:, None]


def gen_swell(rng: np.random.Generator, dur: float) -> np.ndarray:
    """هسهسةٌ وأزيز توليدٍ يتصاعد: ضجيجٌ مكتسَح، طنينُ مرسام 100 Hz بمرشّحٍ يفتح، ونحيبُ توربين."""
    n = ns(dur)
    t = tvec(n)
    u = t / dur
    hiss = sweep(rng.standard_normal((n, 2)), "bp", 500.0 * (3200.0 / 500.0) ** (u**1.2), q=0.9, block=64)
    hiss *= (dbg(-22.0 * (1.0 - u) ** 1.3) * fades(n, 0.02, 0.4))[:, None]
    buzz = saw(100.0 * (1.0 + 0.25 * u), n, 0.1)
    buzz = sweep(buzz, "lp", 500.0 + 1500.0 * u, q=1.0, block=64) * (0.8 + 0.2 * np.sin(2 * np.pi * 12.0 * t))
    whine = (sine(330.0 * 2.0 ** u * (1 + 0.004 * np.sin(2 * np.pi * 5.3 * t)), n) + 0.3 * sine(660.0 * 2.0 ** u, n)) * 0.5
    mono = (0.55 * norm(buzz) + 0.38 * norm(whine)) * dbg(-12.0 * (1.0 - u) ** 1.2) * fades(n, 0.02, 0.4)
    st = 0.9 * norm(hiss) + 0.7 * stereo(mono)
    return norm(st)


def power_thump(rng: np.random.Generator) -> np.ndarray:
    """دفعة تشغيلٍ منخفضة (رفع الجهد): جيبٌ 70→44 Hz وطقطقةٌ كهربائية قصيرة."""
    n = ns(0.5)
    t = tvec(n)
    body = softsat(sine(44.0 + 30.0 * np.exp(-t / 0.05), n) * perc(n, 0.002, 0.14), 1.4)
    cn = ns(0.02)
    zap_ = bw(rng.standard_normal(cn) * np.exp(-tvec(cn) / 0.004), "bp", (1500.0, 6000.0))
    body[:cn] += 0.35 * norm(zap_)
    return norm(body * fades(n, 0.0, 0.08))


def step_up(dur: float = 1.0) -> np.ndarray:
    """نغمة رفع الجهد: مكدَّس هارمونيات يصعد أُسّيًّا (110→1760 Hz) ويعلو، ينتهي لحظة الرنين."""
    n = ns(dur)
    t = tvec(n)
    u = t / dur
    f = 110.0 * 16.0 ** (u**1.25)
    ph, _ = phase(f, n)
    y = np.zeros(n)
    for h, a in ((1, 1.0), (2, 0.5), (3, 0.32), (4, 0.22), (5, 0.14)):
        lim = np.clip((8000.0 - h * f) / 2500.0, 0.0, 1.0)
        y += a * lim * np.sin(2 * np.pi * h * ph)
    env = (0.35 + 0.65 * u**1.2) * fades(n, 0.012, 0.025)
    return norm(y * env)


def flow_zap(rng: np.random.Generator, midi: int, dur: float, pan_from: float, pan_to: float) -> np.ndarray:
    """رشقة تيّارٍ ناعمة: همسةٌ مكتسَحة + طقطقةٌ كهربائية نادرة + «زيب» نغميّ على سلّم ري الصغير — تعبر من جانب لآخر."""
    n = ns(dur)
    u = tvec(n) / dur
    env = np.sin(np.pi * u) ** 2
    w = sweep(rng.standard_normal(n), "bp", 700.0 * (4200.0 / 700.0) ** u, q=1.3, block=32)
    k = (rng.random(n) < 140.0 / SR) * rng.standard_normal(n)
    k = bw(k, "hp", 1800.0)
    f = mtof(midi) * (0.82 + 0.36 * u)
    z = sine(f, n) + 0.28 * sine(2.0 * f, n, 0.2)
    x = (0.85 * norm(w) + 0.22 * norm(k) + 0.5 * z) * env
    x = bw(x, "lp", 8500.0)
    return norm(pan_path(x, np.linspace(pan_from, pan_to, n)))


def relay_click(rng: np.random.Generator) -> np.ndarray:
    """قاطع (relay): نقرتان معدنيّتان متقاربتان وثقلٌ منخفض."""
    n = ns(0.45)
    t = tvec(n)
    x = np.zeros(n)
    for off, lvl in ((0.0, 1.0), (0.021, 0.7)):
        i = ns(off)
        cn = ns(0.02)
        tv = tvec(cn)
        c = bw(rng.standard_normal(cn), "bp", (1400.0, 6000.0)) * np.exp(-tv / 0.003)
        c += 0.45 * np.sin(2 * np.pi * 1900.0 * tv) * np.exp(-tv / 0.012)
        x[i : i + cn] += lvl * c
    thud = sine(55.0 + 40.0 * np.exp(-t / 0.05), n) * perc(n, 0.002, 0.09)
    x += 0.55 * norm(thud) * (t > 0.035)
    x[: ns(0.035)] += 0.0
    return norm(x * fades(n, 0.0, 0.1))


def step_down_ring(dur: float = 1.5) -> np.ndarray:
    """رنينٌ هابط (رفع→خفض): جيبٌ ينزلق 1568→440 Hz مع جوابين وضمور."""
    n = ns(dur)
    t = tvec(n)
    f = 440.0 + (1568.0 - 440.0) * np.exp(-t / 0.33)
    ph, _ = phase(f, n)
    y = np.sin(2 * np.pi * ph) + 0.33 * np.sin(4 * np.pi * ph) + 0.12 * np.sin(6 * np.pi * ph)
    return norm(y * perc(n, 0.005, 0.5) * fades(n, 0.0, 0.2))


def servo(dur: float = 0.5) -> np.ndarray:
    """خادمُ رفع الحاجز: أزيزٌ قصير صاعد بتعديل خطوات محرّك."""
    n = ns(dur)
    t = tvec(n)
    u = t / dur
    f = 120.0 * 4.0 ** (u**0.85)
    x = 0.6 * saw(f, n, 0.0) + 0.4 * sine(f * 2.0, n)
    x = sweep(x, "lp", 600.0 + 1600.0 * u, q=1.1, block=32, stages=2)
    x *= 0.72 + 0.28 * np.sin(2 * np.pi * 36.0 * t)
    return norm(x * fades(n, 0.03, 0.05))


def clunk(rng: np.random.Generator) -> np.ndarray:
    """ارتطامٌ معدنيّ خفيف: جسمٌ منخفض + رنينان معدنيّان قصيران."""
    n = ns(0.4)
    t = tvec(n)
    body = softsat(sine(52.0 + 44.0 * np.exp(-t / 0.04), n) * perc(n, 0.002, 0.1), 1.3)
    metal = bw(rng.standard_normal(n), "bp", (900.0, 3800.0)) * perc(n, 0.0007, 0.012)
    ring = (0.3 * sine(640.0, n) * np.exp(-t / 0.05) + 0.2 * sine(1210.0, n, 0.3) * np.exp(-t / 0.035))
    return norm((0.9 * norm(body) + 0.5 * norm(metal) + ring) * fades(n, 0.0, 0.12))


def beep(midi: int, dur: float = 0.11) -> np.ndarray:
    f = mtof(midi)
    n = ns(dur)
    return (sine(f, n) + 0.16 * sine(2.0 * f, n)) * fades(n, 0.006, 0.03)


def scan_hum(rng: np.random.Generator, dur: float) -> np.ndarray:
    """مسحُ جهاز الفحص: نطاقٌ هادئ ينزلق صعودًا ثم هبوطًا."""
    n = ns(dur)
    u = tvec(n) / dur
    fc = 500.0 * (2400.0 / 500.0) ** (0.5 - 0.5 * np.cos(2 * np.pi * u))
    x = sweep(rng.standard_normal((n, 2)), "bp", fc, q=2.0, block=64) * (np.sin(np.pi * u) ** 1.5)[:, None]
    return norm(x)


def whirr(rng: np.random.Generator, f0: float, f1: float, dur: float = 0.3) -> np.ndarray:
    """أزيزُ كاميرا (زوم/توجيه): منشارٌ صغير صاعد/هابط بتعديلٍ سريع."""
    n = ns(dur)
    t = tvec(n)
    u = t / dur
    f = f0 * (f1 / f0) ** u
    x = 0.6 * saw(f, n, rng.random()) + 0.4 * sine(f * 2.0, n)
    x = sweep(x, "lp", 2.2 * f, q=1.0, block=32)
    x *= 0.75 + 0.25 * np.sin(2 * np.pi * 52.0 * t)
    x += 0.15 * bw(rng.standard_normal(n), "bp", (1500.0, 4000.0))
    return norm(x * fades(n, 0.012, 0.08))


def sonar(midi: int, dur: float = 1.8) -> np.ndarray:
    """«بينغ» سونار: جيبٌ نقيّ بانزلاقٍ هابط خفيف وذيلٍ طويل."""
    f = mtof(midi)
    n = ns(dur)
    t = tvec(n)
    ff = f * (1.0 + 0.012 * np.exp(-t / 0.03))
    ph, _ = phase(ff, n)
    y = np.sin(2 * np.pi * ph) + 0.22 * np.sin(4 * np.pi * ph) * np.exp(-t / 0.2)
    return norm(y * perc(n, 0.004, 0.55) * fades(n, 0.0, 0.25))


def rotor(rng: np.random.Generator, dur: float) -> np.ndarray:
    """دوّارُ مسيّرة بحدّةٍ منخفضة تصعد: منشاران (82→188 Hz) بتعديل دوّار 22→36 Hz وضجيجٌ ضيّق النطاق."""
    n = ns(dur)
    t = tvec(n)
    u = t / dur
    f0 = 82.0 * 2.3 ** (u**1.2)
    x = 0.6 * saw(f0, n, rng.random()) + 0.28 * saw(f0 * 1.5 * 1.003, n, rng.random())
    x = sweep(x, "lp", 500.0 + 700.0 * u, q=0.9, block=64)
    bph, _ = phase(22.0 + 14.0 * u, n)
    am = 0.5 + 0.5 * np.sin(2 * np.pi * bph)
    nz = bw(rng.standard_normal(n), "bp", (300.0, 1700.0))
    y = (x * (0.62 + 0.38 * am) + 0.45 * nz * am) * dbg(-16.0 * (1.0 - u) ** 1.2)
    return norm(y * fades(n, 0.6, 0.5))


def bleep(midi: int, dur: float = 0.17) -> np.ndarray:
    """صفيرُ بياناتٍ لشاشة: جيبٌ بانزلاقٍ صاعدٍ قصير ورفرفة بوّابة 40 Hz في بدايته."""
    f = mtof(midi)
    n = ns(dur)
    t = tvec(n)
    ff = f * (0.95 + 0.05 * np.minimum(1.0, t / 0.012))
    y = sine(ff, n) + 0.22 * sine(2.0 * ff, n, 0.2) + 0.08 * sine(3.0 * ff, n, 0.5)
    gate = 1.0 - 0.35 * (t < 0.06) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 40.0 * t)))
    return norm(y * gate * fades(n, 0.004, 0.07) * np.exp(-t / 0.2))


def glass_sweep(rng: np.random.Generator, dur: float = 1.1) -> np.ndarray:
    """كنسٌ زجاجيّ لامع للتحوّل الرقميّ: ضجيجٌ ضيّق يصعد (1.5→9 kHz) بتعديلٍ سريع يخفت."""
    n = ns(dur)
    t = tvec(n)
    u = t / dur
    x = sweep(rng.standard_normal((n, 2)), "bp", 1500.0 * (9000.0 / 1500.0) ** (u**0.9), q=4.0, block=32)
    x *= (0.6 + 0.4 * np.sin(2 * np.pi * 26.0 * t * (1.0 - 0.6 * u)))[:, None]
    x *= (np.sin(np.pi * np.clip(u, 0, 1) ** 0.6) ** 1.4)[:, None]
    return norm(bw(x, "lp", 10000.0) * fades(n, 0.01, 0.12)[:, None])


def glitch_burst(rng: np.random.Generator, midi: int, dur: float) -> np.ndarray:
    """رشقةُ «خلل» ناعمة: جيبٌ مكمَّم بأربع بتّات ومعاد أخذ عيّنات (S&H)، بمرشّحٍ تحت 6 kHz."""
    n = ns(dur)
    y = sine(mtof(midi), n) + 0.4 * sine(mtof(midi) * 2.0, n)
    y = np.round(norm(y) * 7.0) / 7.0
    q = int(rng.integers(2, 5))
    y = np.repeat(y[::q], q)[:n]
    return bw(y, "lp", 6000.0) * fades(n, 0.002, 0.004)


# ═══════════════════════════════════════ الفضاء ═══════════════════════════════════════


def reverb_ir(rng: np.random.Generator, seconds: float = 3.0, predelay: float = 0.02, damp: float = 1.0) -> np.ndarray:
    """صدىً مولَّد (ستيريو): خمسة نطاقاتٍ تضمحلّ العليا منها أسرع، فالصدى دافئٌ لا يلمع."""
    n = ns(seconds)
    t = tvec(n)
    bands = ((20.0, 250.0, 3.0), (250.0, 1000.0, 2.8), (1000.0, 3000.0, 2.2), (3000.0, 6500.0, 1.5), (6500.0, 12000.0, 0.9))
    ir = np.zeros((n, 2))
    for ch in range(2):
        noise = rng.standard_normal(n)
        for lo, hi, t60 in bands:
            ir[:, ch] += bw(noise, "bp", (lo, hi)) * 10.0 ** (-3.0 * t / (t60 * damp * seconds / 3.0))
    pre = ns(predelay)
    ir = np.vstack([np.zeros((pre, 2)), ir[:-pre]])
    ir *= (np.clip((t - predelay) / 0.04, 0.0, 1.0) ** 1.5)[:, None]
    for ch in range(2):
        for _ in range(8):
            tk = 0.008 + 0.06 * rng.random()
            ir[ns(tk), ch] += (3.0 + 2.0 * rng.random()) * np.exp(-tk / 0.05) * (1.0 if rng.random() < 0.5 else -1.0)
    ir *= fades(n, 0.0, 0.2)[:, None]
    return ir / np.sqrt(np.sum(ir**2) / 2.0)


def convolve_st(x: np.ndarray, ir: np.ndarray, cross: float = 0.15) -> np.ndarray:
    left = (1.0 - cross) * x[:, 0] + cross * x[:, 1]
    right = (1.0 - cross) * x[:, 1] + cross * x[:, 0]
    return np.stack([signal.fftconvolve(left, ir[:, 0]), signal.fftconvolve(right, ir[:, 1])], axis=1)


def reverse_reverb(dry: np.ndarray, ir: np.ndarray, length: float) -> np.ndarray:
    src = convolve_st(dry, ir)
    src[: dry.shape[0]] += 0.35 * dry
    seg = src[::-1][-ns(length) :].copy()
    return norm(seg * fades(seg.shape[0], length * 0.35, 0.003)[:, None])


def ping_pong(x: np.ndarray, delay: float, fb: float, taps: int = 6, band=(320.0, 4200.0)) -> np.ndarray:
    mono = x.mean(axis=1) if x.ndim == 2 else x
    n = mono.shape[0]
    d = ns(delay)
    out = np.zeros((n, 2))
    sos = signal.butter(1, list(band), btype="bandpass", fs=SR, output="sos")
    y = mono
    for k in range(1, taps + 1):
        y = signal.sosfilt(sos, y) * fb
        s = k * d
        if s >= n:
            break
        out[s:, (k - 1) % 2] += y[: n - s]
    return out


def duck(hits: list[float], depth_db: float, release: float) -> np.ndarray:
    """ضغطٌ جانبيّ: ينخفض المسار عند كل ضربة طبل ثم يعود — «النبض» العصريّ."""
    g = np.ones(N)
    d = 1.0 - dbg(-depth_db)
    att, rel = ns(0.004), ns(release)
    shape = np.empty(att + rel)
    shape[:att] = 1.0 - d * np.sin(0.5 * np.pi * np.arange(att) / att)
    shape[att:] = 1.0 - d * (0.5 + 0.5 * np.cos(np.pi * np.arange(rel) / rel))
    for h in hits:
        i = ns(h)
        j = min(N, i + shape.size)
        g[i:j] = np.minimum(g[i:j], shape[: j - i])
    return g


# ══════════════════════════════════════ المازج ══════════════════════════════════════


class Mixer:
    """مساراتٌ ستيريو بطول القطعة؛ `add` يضع الصوت عند لحظته بمستواه وموضعه ويسجّل ورقة الإشارات."""

    def __init__(self) -> None:
        self.bus: dict[str, np.ndarray] = {}
        self.cues: list[dict] = []
        self.onsets: list[float] = []

    def add(self, name: str, sig: np.ndarray, t0: float, db: float = 0.0, pan: float = 0.0, cue: str | None = None, mark: bool = True) -> None:
        buf = self.bus.setdefault(name, np.zeros((N, 2)))
        st = stereo(sig, pan) * dbg(db)
        i = ns(t0)
        if i < 0:
            st, i = st[-i:], 0
        j = min(N, i + st.shape[0])
        if j > i:
            buf[i:j] += st[: j - i]
        self.onsets.append(round(float(t0), 4))
        if cue:
            self.cues.append({"t": round(float(t0), 3), "bus": name, "event": cue})


def arp_pool(name: str, lo: int, hi: int) -> list[int]:
    return [m for m in range(lo, hi + 1) if m % 12 in PCS[name]]


# ══════════════════════════════════════ التوزيع ══════════════════════════════════════


def motif(mx: Mixer, t0: float, notes: list[int], scale: float, db: float, tau: float = 0.7, vel: float = 0.85, bright: float = 1.0, pan: float = 0.0, bus: str = "lead", cue: str = "") -> None:
    for i, (ot, od, m) in enumerate(zip(MOTIF_T, MOTIF_D, notes)):
        d = od * scale
        last = i == len(notes) - 1
        sig = signature(m, dur=max(0.9, d + 0.8) + (1.2 if last else 0.0), vel=vel, tau=tau * (1.8 if last else 1.0), bright=bright)
        mx.add(bus, sig, t0 + ot * scale, db + (0.0 if i else 1.5), pan=pan + 0.12 * (i - 2.5) / 2.5, cue=cue if i == 0 else f"  motif note {i + 1}/6 (midi {m})")


def place_pads(mx: Mixer) -> None:
    """بساطٌ بوترٍ لكل مازورة، متراكبٌ نصف ثانيةٍ في كل حدّ بأطوارٍ مطلقة فلا ثغرة ولا نبض."""
    xf = 0.5
    for k, name in enumerate(BAR_CHORDS):
        t0 = k * BAR
        if k == 0:
            sig = pad_voice(PAD[name], 0.0, BAR + xf, att=2.0, rel=1.0)
            mx.add("pad", sig, 0.0, 0.0, cue="pad opens from silence (Dm9)")
            continue
        start = t0 - xf
        if k == 27:  # الوتر الختاميّ يخفت بنعومة (يتأرجح بالمعالجة اللاحقة)
            sig = pad_voice(PAD[name], start, 2.0 + xf, att=2 * xf, rel=1.8)
            mx.add("pad_end", sig, start, 0.0, cue="closing chord (Dmaj9) — sways, fades")
            continue
        if k == 26:
            sig = pad_voice(PAD[name], start, BAR + 2 * xf, att=2 * xf, rel=2 * xf, width=1.0, detune=9.0)
            mx.add("pad", sig, start, 0.0, cue=f"pad {name}")
            continue
        if k == 25:
            sig = pad_voice(PAD[name], start, BAR + 2 * xf, att=2 * xf, rel=2 * xf, width=1.0, detune=9.0)
            mx.add("pad", sig, start, 0.0, cue=f"pad {name} (pull-back, wide)")
            continue
        sig = pad_voice(PAD[name], start, BAR + 2 * xf, att=2 * xf, rel=2 * xf, detune=7.0 if k < 19 else 8.0)
        mx.add("pad", sig, start, 0.0, cue=f"pad {name}" if k % 4 == 0 or k in (18, 19, 22, 23, 24) else None)


def arrange() -> tuple[Mixer, list[float], dict[str, np.ndarray]]:
    mx = Mixer()
    kicks: list[float] = []
    irs = {"hall": reverb_ir(rng_for("reverb/hall"), 3.0, 0.02), "room": reverb_ir(rng_for("reverb/room"), 0.55, 0.004, damp=1.0)}

    def kick_at(t: float, db: float = 0.0, cue: str | None = None) -> None:
        mx.add("kick", kick_soft(rng_for(f"kick/{t:.3f}")), t, db, cue=cue)
        kicks.append(t)

    def bars(a: float, b: float):
        k = int(round(a / BAR))
        while k * BAR < b - 1e-9:
            yield k, k * BAR, BAR_CHORDS[k]
            k += 1

    place_pads(mx)

    # ═══════════ القسم 1 (0–8): فجرٌ هادئ فوق المحطة ═══════════
    mx.add("amb", air(rng_for("air"), 8.6), 0.0, -8.5, cue="dawn air (soft wind)")
    mx.add("amb", station_hum(7.6), 0.8, -14.5, cue="distant station hum 50 Hz + harmonics")
    # خطوات حارسٍ على الحصى من 2.0، خطوةٌ كل 0.5 ث، تنتقل ببطء يسارًا ← يمينًا (يمشي على السياج)
    r = rng_for("steps/s1")
    for i in range(12):  # 2.0 … 7.5
        t = 2.0 + i * BEAT + (r.random() - 0.5) * 0.012
        pan = -0.55 + 1.1 * i / 11.0
        lvl = -10.0 + 3.0 * np.sin(np.pi * min(1.0, i / 11.0)) - 5.0 * max(0.0, (i - 9) / 2.0)
        mx.add("sfx", step(rng_for(f"step/s1/{i}"), heavy=0.8 + 0.2 * (i % 2), bright=0.9), t, lvl, pan=pan, cue=f"gravel footstep {i + 1}/12")
    # اللحن الموجّه — التعريف الأوّل (4.0): نقرةٌ ناعمة داكنة
    motif(mx, 4.0, MOTIF_MIN, 1.0, -13.0, tau=0.8, vel=0.62, bright=0.8, pan=0.1, cue="MOTIF #1 (A4 D5 F5 G5 F5 D5) — dawn statement")
    # 5.5 لاسلكيّ: نقرةٌ + هسيس + بوق D6 خفيف + إغلاق
    mx.add("sfx", radio_call(rng_for("radio")), 5.5, -4.0, pan=0.18, cue="RADIO squelch + beep (D6)")
    # لمعاتٌ عالية رقيقة تعلن الشروق (6.0–7.5)
    for i, (t, m) in enumerate(((6.25, 86), (6.75, 90), (7.25, 93))):
        mx.add("lead", glock(rng_for(f"dawn/{i}"), m, dur=1.6, tau=0.7), t, -23.0 + 1.0 * i, pan=(-0.4, 0.4, 0.0)[i], cue=f"sunrise glint {i + 1}/3")
    # swell عابر: ضجيجٌ وصنجٌ معكوس يعلوان ثم ينقطعان عند 8.0
    mx.add("fx", riser(rng_for("swell/s1"), 2.0, f0=300.0, f1=5200.0, floor_db=-30.0), 6.0, -15.0, cue="pass-by swell (ends at 8.0)")
    mx.add("fx", reverse_cymbal(rng_for("swell/cym"), 1.9), 6.1, -17.0)

    # ═══════════ القسم 2 (8–24): رحلة الكهرباء ═══════════
    # 8.0 توليد: ضربةٌ عميقة وطبل وهسيس يتصاعد (حتى 11.0)
    mx.add("sub", boom_soft(rng_for("gen/boom"), f_hi=80.0, f_lo=36.0, dur=1.8, tau_a=0.5), 8.0, -3.0, cue="GENERATION: soft sub hit")
    mx.add("fx", gen_swell(rng_for("gen/swell"), 3.6), 8.0, -9.0, cue="GENERATION: hiss + buzz + turbine whine rising (8→11)")
    kick_at(8.0, 0.0, cue="kick pulse begins (every 1.0s from 8.0)")
    for t in np.arange(9.0, 12.0, 1.0):
        kick_at(float(t), -1.0)
    # 11.0 رفع الجهد: دفعةٌ وصاعدُ هارمونيات ينتهي برنينٍ زجاجيّ عند 12.0
    mx.add("sfx", power_thump(rng_for("stepup/thump")), 11.0, -4.0, cue="STEP-UP: power thump")
    mx.add("fx", step_up(1.0), 11.0, -8.0, cue="STEP-UP: rising harmonic sweep 110→1760 Hz (11→12)")
    mx.add("lead", glock(rng_for("stepup/ring1"), 86, dur=3.2, tau=2.0), 12.0, -12.0, pan=-0.3, cue="STEP-UP: ring (D6)")
    mx.add("lead", glock(rng_for("stepup/ring2"), 93, dur=3.2, tau=1.8), 12.0, -15.0, pan=0.3, cue="STEP-UP: ring (A6)")
    # 12.0–20.0: أربعٌ على الأرض
    for t in np.arange(12.0, 19.25, 0.5):
        kick_at(float(t), -1.5 if (round(t * 2) % 2) else -0.5)
    # 14.0–18.0 سريان التيار: رشقةٌ على كل نبضةٍ (8) تعبر يسارًا ← يمينًا، النغمة تصعد على سلّم ري الصغير
    scale_up = [74, 77, 79, 81, 84, 86, 89, 91]  # D5 F5 G5 A5 C6 D6 F6 G6
    for i in range(8):
        t = 14.0 + i * BEAT
        mx.add("fx", flow_zap(rng_for(f"flow/{i}"), scale_up[i], 0.56, -0.9, 0.9), t, -11.0, cue=f"CURRENT FLOW zap {i + 1}/8 (L to R)")
    # 18.0: اقتراب المحطة — طنينُ محوّلٍ يتصاعد حتى القاطع
    hum2 = station_hum(2.05, fin=1.9, fout=0.03, lp=900.0)
    mx.add("amb", hum2, 17.95, -8.0, cue="APPROACH: transformer hum swells (18→20)")
    mx.add("fx", riser(rng_for("approach/riser"), 2.0, f0=250.0, f1=3400.0, floor_db=-28.0), 18.0, -16.0)
    # 20.0 خفض الجهد: نقرة قاطعٍ وثقلٌ ورنينٌ هابط
    mx.add("sfx", relay_click(rng_for("relay")), 20.0, 0.0, cue="BREAKER: relay click")
    mx.add("sub", boom_soft(rng_for("relay/boom"), f_hi=70.0, f_lo=38.0, dur=1.4, tau_a=0.35), 20.0, -2.0, cue="STEP-DOWN: sub drop")
    mx.add("lead", step_down_ring(1.5), 20.03, -10.0, pan=0.2, cue="STEP-DOWN: descending ring (1568→440 Hz)")
    for t in np.arange(20.0, 22.0, 1.0):
        kick_at(float(t), -2.0)
    # 22.0–24.0: اللحن الموجّه مضغوطًا ×0.5 على بلّورٍ لامع، ثم ركضٌ خماسيّ يتسارع (كل نغمة = نافذةٌ تضيء)
    for t in np.arange(22.0, 23.75, 0.5):
        kick_at(float(t), -1.0)
    motif(mx, 22.0, MOTIF_MIN, 0.5, -10.0, tau=0.5, vel=0.95, bright=1.1, pan=0.0, cue="MOTIF #2 (x0.5) — windows light up")
    run_notes = [77, 79, 81, 84, 86, 89, 91]  # F5 G5 A5 C6 D6 F6 G6 (ري الصغير الخماسيّ)
    gaps = [0.17, 0.15, 0.13, 0.11, 0.095, 0.08, 0.07]
    t = 23.25
    for i, (m, g) in enumerate(zip(run_notes, gaps)):
        t += g
        mx.add("lead", signature(m, dur=0.9, vel=0.9, tau=0.3, bright=1.2), t, -10.5 + 0.35 * i, pan=-0.45 + 0.15 * i, cue=f"pentatonic run note {i + 1}/7 (accelerating)")
    mx.add("fx", reverse_cymbal(rng_for("rev/24"), 0.62), 23.38, -14.0, cue="reverse cymbal into 24.0")
    mx.add("fx", riser(rng_for("riser/24"), 1.0, f0=500.0, f1=6500.0, floor_db=-26.0), 23.0, -17.0)

    # باص/بيانو/أربيجو/إيقاع القسم 2
    for k, t0, name in bars(8.0, 24.0):
        root = BASS[name]
        if t0 < 12.0:  # جهيرٌ متباعد
            for off, d, v in ((0.0, 0.9, 1.0), (1.0, 0.45, 0.8), (1.5, 0.2, 0.7)):
                mx.add("bass", sub_bass(root, d), t0 + off, -6.0 + 20 * np.log10(v), mark=False)
        elif t0 < 20.0 or t0 >= 22.0:  # نبضُ أثمان: الأثمان الضعيفة أعلى
            for s in range(8):
                v = 1.0 if s % 2 else 0.7
                m = root + (12 if s == 7 else 0)
                if t0 == 18.0 and s >= 5:
                    continue  # فراغٌ قصير قبل القاطع
                mx.add("bass", sub_bass(m, STEP8 * 0.8), t0 + s * STEP8, -6.0 + 20 * np.log10(v), mark=False)
        else:  # خفض الجهد: نصف الإيقاع
            for off, d, v in ((0.0, 0.9, 1.0), (1.0, 0.9, 0.85)):
                mx.add("bass", sub_bass(root, d), t0 + off, -6.5 + 20 * np.log10(v), mark=False)
        if 12.0 <= t0 < 20.0 or 22.0 <= t0 < 24.0:  # بيانو كهربائيّ بتزامن
            for off, d, v in ((0.0, 0.7, 1.0), (0.75, 0.4, 0.72), (1.25, 0.55, 0.85)):
                if t0 == 18.0 and off == 1.25:
                    continue
                for j, m in enumerate(EP[name][1:5]):
                    mx.add("ep", epiano(m, d, v), t0 + off + 0.006 * j, -12.0, pan=(-0.3, 0.1, -0.1, 0.3)[j], mark=(j == 0))
        # أربيجو
        pool = arp_pool(name, 62 + (7 if 14.0 <= t0 < 18.0 else 0), 88)
        if 12.0 <= t0 < 14.0 or 18.0 <= t0 < 22.0:
            pat = [0, 1, 2, 3, 4, 3, 2, 1]
            for s in range(8):
                if t0 == 18.0 and s >= 5:
                    continue
                idx = min(len(pool) - 1, 1 + pat[s])
                mx.add("arp", pluck(rng_for(f"arp/{t0}/{s}"), pool[idx], STEP8 * 0.9, 0.7 + 0.2 * (s % 2 == 0), 1500.0, 2200.0), t0 + s * STEP8, -8.0, pan=0.1 * (-1) ** s, mark=False)
        elif 14.0 <= t0 < 18.0:  # يصعد: ستة عشريّات صاعدة، النافذة ترتفع مع المازورة
            base = (t0 - 14.0) / BAR * 2
            for s in range(16):
                idx = min(len(pool) - 1, int(base) + (s % 8))
                mx.add("arp", pluck(rng_for(f"arp/{t0}/{s}"), pool[idx], STEP16 * 0.9, 0.62 + 0.25 * (s % 4 == 0), 1500.0 + 90.0 * s, 2200.0), t0 + s * STEP16, -9.0, pan=0.12 * (-1) ** s, mark=False)
        # إيقاع خفيف
        if t0 >= 12.0 and not 20.0 <= t0 < 22.0:
            for s in range(8):
                t = t0 + s * STEP8
                if s % 2 == 1 and not (t0 == 18.0 and s >= 5):
                    mx.add("perc", shaker(rng_for(f"shk/{t:.3f}")), t, -9.0, pan=0.18, mark=False)
        if t0 >= 16.0 and not 20.0 <= t0 < 22.0:
            for off in (0.5, 1.5):
                if t0 == 18.0 and off == 1.5:
                    continue
                mx.add("perc", snap(rng_for(f"snap/{t0 + off:.3f}")), t0 + off, -6.0, pan=-0.12, mark=False)
        if 10.0 <= t0 < 12.0:
            for s in range(1, 8, 2):
                mx.add("perc", shaker(rng_for(f"shk/{t0 + s * STEP8:.3f}")), t0 + s * STEP8, -14.0, pan=0.18, mark=False)

    # ═══════════ القسم 3 (24–38): الأمن في الميدان ═══════════
    mx.add("sub", boom_soft(rng_for("gate/boom"), f_hi=95.0, f_lo=36.0, dur=2.0, tau_a=0.6), 24.0, -3.5, cue="GATE: section hit (sub)")
    kick_at(24.0, -1.0)
    mx.add("sfx", servo(0.5), 24.0, -9.0, pan=-0.1, cue="GATE: servo whine rising (barrier lifts)")
    mx.add("sfx", clunk(rng_for("gate/clunk")), 24.5, -6.0, pan=0.1, cue="GATE: clunk")
    for t in np.arange(25.0, 30.0, 1.0):
        kick_at(float(t), -2.0)
    # 27.0 جهاز الفحص: صافرتان نظيفتان (A5 ثم D6) ومسحٌ هادئ
    for j, (dt, m) in enumerate(((0.0, 81), (0.25, 86))):
        mx.add("sfx", beep(m, 0.11), 27.0 + dt, -7.0, pan=-0.2 + 0.4 * j, cue="SCANNER: double beep (A5 -> D6)" if j == 0 else None)
    mx.add("sfx", scan_hum(rng_for("scan/hum"), 1.4), 27.1, -20.0, cue="SCANNER: soft band sweep")
    mx.add("sfx", beep(81, 0.11), 27.75, -11.0, pan=-0.2)
    mx.add("sfx", beep(86, 0.11), 28.0, -11.0, pan=0.2)
    # 30.0 كاميرات: ثلاثة أزيزٍ صغيرة مفرّقة + بينغ سونار كلّ مازورة
    for j, (dt, f0, f1, p) in enumerate(((0.0, 520.0, 980.0, -0.55), (0.14, 700.0, 1250.0, 0.0), (0.28, 610.0, 1100.0, 0.55))):
        mx.add("sfx", whirr(rng_for(f"cam/{j}"), f0, f1, 0.3), 30.0 + dt, -12.0, pan=p, cue="CAMERAS: whirr x3 (pan spread)" if j == 0 else None)
    for j, t in enumerate((30.0, 32.0, 34.0)):
        mx.add("sfx", sonar(93 if j != 1 else 88, 1.9), t + 0.02, -13.0, pan=-0.4 + 0.4 * j, cue="SONAR ping" if j == 0 else None)
    # 32.0 دورية: خطواتٌ مزدوجة متزامنة (حارسان) حتى 35.5
    for i in range(7):
        t = 32.0 + i * BEAT
        lv = -10.0 - 5.0 * max(0.0, (i - 4) / 2.0)
        mx.add("sfx", step(rng_for(f"step/p/{i}/a"), heavy=1.0, bright=0.85), t, lv, pan=-0.38, cue=f"PATROL: paired footsteps {i + 1}/7 (two guards)")
        mx.add("sfx", step(rng_for(f"step/p/{i}/b"), heavy=1.15, bright=0.8), t + 0.009, lv - 0.5, pan=0.38, mark=False)
    # 34.0 مسيّرة: دوّارٌ يعلو (حتى 36.0 ثم يخفت)
    mx.add("sfx", rotor(rng_for("drone"), 2.5), 34.0, -7.0, cue="DRONE: rotor rising (34→36)")
    # 36.0 غرفة التحكم: ستة صفيرات بياناتٍ صاعدة بالتتابع على الخماسيّ (D5 F5 G5 A5 C6 D6) — ثم swell عكسيّ إلى 38.0
    for i, m in enumerate((74, 77, 79, 81, 84, 86)):
        mx.add("sfx", bleep(m, 0.2), 36.0 + 0.25 * i, -6.0 + 0.6 * i, pan=-0.6 + 0.24 * i, cue=f"CONTROL ROOM: data bleep {i + 1}/6 (ascending)")
    mx.add("fx", riser(rng_for("riser/38"), 1.9, f0=300.0, f1=8000.0, floor_db=-30.0), 36.1, -14.0, cue="reverse swell to 38.0")
    mx.add("fx", reverse_cymbal(rng_for("rev/38"), 1.5), 36.5, -17.0)
    # باص/بيانو/أربيجو/إيقاع القسم 3
    for k, t0, name in bars(24.0, 38.0):
        root = BASS[name]
        if t0 < 36.0:
            pat = ((0.0, 0.9, 1.0), (1.0, 0.35, 0.7), (1.25, 0.35, 0.8), (1.75, 0.2, 0.6)) if t0 < 30.0 else None
            if pat:
                for off, d, v in pat:
                    mx.add("bass", sub_bass(root, d), t0 + off, -6.0 + 20 * np.log10(v), mark=False)
            else:  # من 30.0: نبضُ أثمانٍ أعمق
                for s in range(8):
                    v = 1.0 if s % 2 else 0.72
                    mx.add("bass", sub_bass(root, STEP8 * 0.78), t0 + s * STEP8, -6.5 + 20 * np.log10(v), mark=False)
        else:  # توتّر قبل التحوّل: جيبٌ ممدود
            mx.add("bass", sub_bass(root, BAR * 0.9, harm=0.2), t0, -8.0, mark=False)
        if t0 >= 30.0 and t0 < 36.0:
            for t in np.arange(t0, t0 + BAR, BEAT):
                kick_at(float(t), -3.0)
        if 26.0 <= t0 < 36.0:
            for off, d, v in ((0.0, 0.8, 0.9), (1.25, 0.6, 0.75)):
                for j, m in enumerate(EP[name][1:5]):
                    mx.add("ep", epiano(m, d, v), t0 + off + 0.006 * j, -16.5, pan=(-0.3, 0.1, -0.1, 0.3)[j], mark=(j == 0))
        if 26.0 <= t0 < 36.0:
            pool = arp_pool(name, 62, 86)
            pat = [0, 2, 1, 3, 2, 4, 3, 2] if t0 < 32.0 else [0, 1, 2, 3, 2, 1, 3, 4]
            for s in range(8):
                idx = min(len(pool) - 1, 1 + pat[s])
                mx.add("arp", pluck(rng_for(f"arp/{t0}/{s}"), pool[idx], STEP8 * 0.9, 0.62 + 0.18 * (s % 2 == 0), 1300.0, 2200.0), t0 + s * STEP8, -11.5, pan=0.1 * (-1) ** s, mark=False)
        if t0 >= 28.0 and t0 < 36.0:
            for s in range(1, 8, 2):
                mx.add("perc", shaker(rng_for(f"shk/{t0 + s * STEP8:.3f}")), t0 + s * STEP8, -11.0, pan=0.18, mark=False)
        if t0 >= 30.0 and t0 < 36.0:
            for off in (0.5, 1.5):
                mx.add("perc", tick(rng_for(f"tk/{t0 + off:.3f}"), 1900.0), t0 + off, -9.0, pan=-0.1, mark=False)

    # ═══════════ القسم 4 (38–50): التوأم الرقميّ — ري الكبير ═══════════
    mx.add("sub", boom_soft(rng_for("twin/boom"), f_hi=100.0, f_lo=38.0, dur=2.2, tau_a=0.6), 38.0, -2.5, cue="DIGITAL DISSOLVE: sub hit")
    mx.add("fx", glass_sweep(rng_for("twin/glass"), 1.2), 37.95, -8.0, cue="DIGITAL DISSOLVE: glassy sweep")
    gt = 38.02
    r = rng_for("twin/glitch")
    for i in range(10):
        m = int(r.choice([86, 90, 93, 95, 98]))
        d = 0.03 + 0.03 * r.random()
        mx.add("fx", glitch_burst(rng_for(f"twin/gl/{i}"), m, d), gt, -15.0, pan=(-1) ** i * 0.55, cue=f"DIGITAL DISSOLVE: soft glitch burst {i + 1}/10")
        gt += 0.035 + 0.05 * r.random() * (1.0 + i * 0.2)
    mx.add("fx", crash(rng_for("twin/crash"), dur=2.0, tau=0.5, hp=3600.0), 38.0, -17.0)
    # ضربة وتر ري الكبير (إظهار الثيم الجديد)
    for j, m in enumerate((57, 62, 66, 69, 74, 78)):
        mx.add("ep", epiano(m, 1.4, 1.0), 38.0 + 0.012 * j, -10.0, pan=(-0.4, -0.2, 0.0, 0.2, 0.4, 0.55)[j], cue="NEW KEY: D major reveal chord" if j == 0 else None, mark=(j == 0))
    for t in np.arange(38.0, 44.0, 0.5):
        kick_at(float(t), -1.5)
    kick_at(44.0, -2.0)
    kick_at(46.0, -3.0)
    kick_at(47.0, -3.0)
    for t in np.arange(47.5, 50.0, 0.5):
        kick_at(float(t), -1.0 if t >= 48.0 else -3.0)
    # 41.0–43.0: pings تصاعدية (نقاط الحسّاسات) على سلّم ري الكبير الخماسيّ (D E F♯ A B)
    sensor = [78, 81, 83, 86, 88, 90, 93, 95, 98]  # F♯5 A5 B5 D6 E6 F♯6 A6 B6 D7
    for i, m in enumerate(sensor):
        mx.add("lead", glock(rng_for(f"sensor/{i}"), m, dur=1.5, tau=0.6, top_hz=9000.0), 41.0 + i * 0.25, -9.0 + 0.2 * i, pan=-0.75 + 1.5 * i / 8.0, cue=f"SENSOR ping {i + 1}/9 (ascending)")
    # 44.0 إنذار: نغمتان amber لطيفتان (E5) ثم ثالثة أعلى (B♭5 — الخامسة المنقوصة) خطر
    for j, t in enumerate((44.0, 44.5)):
        mx.add("lead", marimba(76, 0.8, 0.3), t, -8.5, pan=-0.12, cue="ALARM amber tone (E5)" if j == 0 else None)
    mx.add("lead", marimba(82, 1.2, 0.45), 45.0, -7.0, pan=0.12, cue="ALARM danger tone (Bb5, tritone above E)")
    mx.add("lead", marimba(94, 1.0, 0.25), 45.0, -17.0, pan=0.2)
    mx.add("sub", sub_bass(40, 1.0, harm=0.2), 45.0, -8.0, cue="ALARM: low E warning under danger tone")
    # 46.0 tick توجيه + whoosh
    mx.add("sfx", tick(rng_for("route/tick"), 2600.0), 46.0, -4.0, pan=0.0, cue="ROUTE: tick (icon move)")
    mx.add("fx", whoosh(rng_for("route/whoosh"), 0.8, 0.28, -0.8, 0.8, f_lo=700.0, f_hi=4200.0), 46.0, -9.0, cue="ROUTE: whoosh L->R")
    # 47.0–48.0 swell إلى الانفراج
    mx.add("fx", riser(rng_for("riser/48"), 1.0, f0=500.0, f1=7000.0, floor_db=-30.0), 47.0, -12.0)
    mx.add("fx", reverse_cymbal(rng_for("rev/48"), 0.9), 47.1, -13.0)
    # 48.0 انفراج أخضر: وترٌ مشرق + اللحن الموجّه (ري الكبير) + صنجٌ ناعم
    mx.add("sub", boom_soft(rng_for("resolve/boom"), f_hi=90.0, f_lo=36.0, dur=2.4, tau_a=0.7), 48.0, -3.0, cue="RESOLVE (green): sub hit")
    mx.add("fx", crash(rng_for("resolve/crash"), dur=2.6, tau=0.7, hp=3200.0), 48.0, -14.0)
    for j, (dt, m) in enumerate(((0.0, 50), (0.04, 57), (0.08, 61), (0.12, 66), (0.16, 69), (0.2, 73), (0.24, 76))):
        mx.add("ep", epiano(m, 1.8, 1.0), 48.0 + dt, -9.5, pan=(-0.5, -0.3, -0.1, 0.1, 0.3, 0.45, 0.6)[j], cue="RESOLVE: bright Dmaj9 strum" if j == 0 else None, mark=(j == 0))
    motif(mx, 48.0, MOTIF_MAJ, 1.0, -9.5, tau=0.9, vel=0.95, bright=1.1, pan=0.0, cue="MOTIF #3 (D major: A4 D5 F#5 G5 F#5 A5) — resolve")
    # باص/بيانو/أربيجو/إيقاع القسم 4
    for k, t0, name in bars(38.0, 50.0):
        root = BASS[name]
        if t0 < 44.0 or t0 >= 46.0:
            for s in range(8):
                v = 1.0 if s % 2 else 0.72
                m = root + (12 if s == 7 and t0 != 46.0 else 0)
                if t0 == 46.0 and s >= 4:
                    continue
                mx.add("bass", sub_bass(m, STEP8 * 0.8), t0 + s * STEP8, -6.5 + 20 * np.log10(v), mark=False)
        elif t0 == 44.0:
            mx.add("bass", sub_bass(root, 0.9, harm=0.2), t0, -8.5, mark=False)
        if t0 < 44.0 or t0 >= 48.0:
            for off, d, v in ((0.0, 0.7, 1.0), (0.75, 0.4, 0.72), (1.25, 0.55, 0.85)):
                if t0 == 38.0 and off == 0.0:
                    continue
                if t0 == 48.0 and off == 0.0:
                    continue
                for j, m in enumerate(EP[name][1:5]):
                    mx.add("ep", epiano(m, d, v), t0 + off + 0.006 * j, -12.5 - (5.0 if t0 in (40.0, 42.0) else 0.0), pan=(-0.3, 0.1, -0.1, 0.3)[j], mark=(j == 0))
        if t0 < 44.0 or t0 >= 48.0:
            pool = arp_pool(name, 66, 90)
            pat = [0, 2, 3, 2, 1, 3, 4, 3] if t0 % 4 == 0 else [0, 1, 3, 2, 4, 3, 2, 1]
            for s in range(8):
                idx = min(len(pool) - 1, 1 + pat[s])
                mx.add("arp", pluck(rng_for(f"arp/{t0}/{s}"), pool[idx], STEP8 * 0.9, 0.62 + 0.2 * (s % 2 == 0), 1900.0, 2400.0), t0 + s * STEP8, -9.5 - (6.0 if t0 in (40.0, 42.0) else 0.0), pan=0.12 * (-1) ** s, mark=False)
        if t0 < 44.0 or t0 >= 48.0:
            for s in range(8):
                if s % 2 == 1:
                    mx.add("perc", shaker(rng_for(f"shk/{t0 + s * STEP8:.3f}")), t0 + s * STEP8, -9.0, pan=0.18, mark=False)
            for off in (0.5, 1.5):
                mx.add("perc", snap(rng_for(f"snap/{t0 + off:.3f}")), t0 + off, -6.5, pan=-0.12, mark=False)
        elif t0 == 44.0:
            mx.add("perc", tick(rng_for("t44"), 1900.0), 44.0, -12.0, mark=False)

    # ═══════════ القسم 5 (50–56): الخاتمة ═══════════
    # 50.0–52.0 الارتداد: بساطٌ عريض وأربيجو هارب يخبو
    pool = arp_pool("Gmaj9", 74, 95)
    for s in range(8):
        mx.add("arp", pluck(rng_for(f"arp/end/{s}"), pool[(s * 2) % len(pool)], STEP8 * 0.9, 0.5, 1700.0), 50.0 + s * STEP8, -12.0 - 1.2 * s, pan=0.3 * (-1) ** s, mark=False)
    mx.add("fx", whoosh(rng_for("pull/whoosh"), 1.6, 0.9, 0.7, -0.7, f_lo=500.0, f_hi=2600.0), 50.0, -17.0, cue="PULL-BACK: soft wide whoosh")
    # 52.0 رنّة الشعار + اللحن الموجّه مبطَّءًا + بريقٌ صاعد
    mx.add("lead", glock(rng_for("logo/a"), 74, dur=4.2, tau=3.0), 52.0, -9.5, pan=-0.2, cue="LOGO RING: bell cluster D5 A5 D6 F#6")
    mx.add("lead", glock(rng_for("logo/b"), 81, dur=4.2, tau=3.0), 52.0, -10.5, pan=0.2)
    mx.add("lead", glock(rng_for("logo/c"), 86, dur=4.0, tau=2.8), 52.0, -11.5, pan=-0.1)
    mx.add("lead", glock(rng_for("logo/d"), 90, dur=3.8, tau=2.5), 52.0, -13.0, pan=0.15)
    mx.add("lead", signature(62, dur=3.0, vel=1.0, tau=1.5, bright=0.9), 52.0, -14.0, mark=False)
    mx.add("fx", shimmer(rng_for("logo/shimmer"), 1.9, turns=2.0, f0=2200.0, f1=9000.0, tail=0.8), 52.0, -17.5, cue="LOGO: rising shimmer")
    for i, m in enumerate((86, 90, 93, 95, 98)):
        mx.add("lead", glock(rng_for(f"logo/g/{i}"), m, dur=1.8, tau=0.9), 52.3 + 0.2 * i, -19.0 + 0.8 * i, pan=0.5 * (-1) ** i)
    motif(mx, 52.55, MOTIF_MAJ[1:], 0.9, -15.5, tau=1.0, vel=0.7, bright=0.9, pan=0.0, cue="MOTIF #4 (logo, slowed tail)")
    mx.add("sub", sub_bass(38, 2.6, harm=0.18), 52.0, -9.0, cue="logo: low D sub")
    mx.add("sub", sub_bass(38, 1.4, harm=0.15), 54.0, -12.0)
    return mx, kicks, irs


# ══════════════════════════════ المعالجة والمزج والإتقان ══════════════════════════════

# أتمتة مستوى كل مسار (dB) على قوس الفيلم: (زمن، dB) — تُطبَّق بعد المعالجة وقبل الجمع
AUTO = {
    "pad": [(0.0, -9.0), (8.0, -8.0), (12.0, -8.0), (20.0, -9.5), (22.0, -8.0), (24.0, -8.0), (25.0, -9.5), (36.0, -9.5), (37.9, -8.0), (38.0, -7.0), (44.0, -8.5), (46.0, -7.5), (48.0, -6.0), (52.0, -6.5), (56.0, -6.5)],
    "bass": [(0.0, -6.0), (8.0, -4.5), (24.0, -4.5), (25.0, -5.5), (37.9, -5.5), (38.0, -4.0), (56.0, -5.0)],
    "kick": [(0.0, -5.0), (8.0, -3.5), (12.0, -3.5), (24.0, -4.0), (38.0, -3.0), (50.0, -3.0), (56.0, -3.0)],
}
# إرسال كل مسارٍ إلى الصدى (dB) — (قاعة، غرفة)؛ None = جافّ
SENDS = {
    "pad": (-9.0, None),
    "pad_end": (-8.0, None),
    "ep": (-8.0, None),
    "arp": (-8.0, None),
    "lead": (-6.0, None),
    "fx": (-9.0, None),
    "sfx": (-14.0, -12.0),
    "perc": (-18.0, -14.0),
    "amb": (-16.0, None),
    "bass": (None, None),
    "kick": (None, None),
    "sub": (-20.0, None),
}


def process(mx: Mixer, kicks: list[float]) -> None:
    b = mx.bus
    t = tvec(N)
    # ── البساط: مرشّحٌ يفتح ويغلق مع قوس الفيلم، تشبّعٌ ليّن، تمريرٌ عالٍ ──
    pad_fc = curve(
        [(0.0, 380.0), (3.0, 800.0), (6.0, 1500.0), (8.0, 1900.0), (12.0, 2000.0), (18.0, 2800.0), (20.0, 1700.0), (22.0, 2000.0), (24.0, 3200.0),
         (24.5, 1500.0), (30.0, 1900.0), (36.0, 2200.0), (37.9, 4200.0), (38.5, 5200.0), (44.0, 4300.0), (45.0, 2300.0), (46.0, 2500.0),
         (48.0, 5600.0), (52.0, 4200.0), (56.0, 2600.0)], t, log=True)  # fmt: skip
    pad = sweep(b["pad"], "lp", pad_fc, q=0.75, block=64, stages=2)
    pad = softsat(biquad(bw(pad, "hp", 170.0), "peak", 300.0, 0.9, -3.0), 1.15)
    b["pad"] = pad * duck(kicks, 3.5, 0.3)[:, None]
    if "pad_end" in b:
        pe = bw(sweep(b["pad_end"], "lp", curve([(0.0, 3200.0), (54.0, 3600.0), (56.0, 1800.0)], t, log=True), q=0.75, block=64), "hp", 140.0)
        sway = 0.5 * np.sin(2 * np.pi * 0.33 * (t - 53.5))
        pe[:, 0] *= 1.0 + 0.2 * sway
        pe[:, 1] *= 1.0 - 0.2 * sway
        b["pad_end"] = pe
    ep = biquad(bw(b["ep"], "hp", 210.0), "peak", 330.0, 0.9, -2.0)
    ep = ep + dbg(-7.0) * ping_pong(ep, 0.375, 0.35, taps=4, band=(400.0, 5000.0))
    b["ep"] = ep * duck(kicks, 2.5, 0.2)[:, None]
    arp = bw(b["arp"], "hp", 200.0)
    arp = arp + dbg(-4.0) * ping_pong(arp, 0.375, 0.42, taps=5)
    b["arp"] = arp * duck(kicks, 2.0, 0.16)[:, None]
    b["bass"] = b["bass"] * duck(kicks, 8.0, 0.14)[:, None]
    b["lead"] = bw(b["lead"], "hp", 220.0)
    for name, f in (("fx", 150.0), ("sfx", 90.0), ("perc", 400.0)):
        if name in b:
            b[name] = bw(b[name], "hp", f)
    b["sub"] = bw(b["sub"], "lp", 400.0)
    if "amb" in b:
        b["amb"] = bw(b["amb"], "hp", 60.0)
    for name, pts in AUTO.items():
        b[name] = b[name] * (10.0 ** (np.interp(t, [p[0] for p in pts], [p[1] for p in pts]) / 20.0))[:, None]


def render(mx: Mixer, irs: dict[str, np.ndarray]) -> np.ndarray:
    dry = np.zeros((N, 2))
    hall = np.zeros((N, 2))
    room = np.zeros((N, 2))
    for name, x in mx.bus.items():
        dry += x
        sh, sr = SENDS[name]
        if sh is not None:
            hall += x * dbg(sh)
        if sr is not None:
            room += x * dbg(sr)
    wet_h = bw(bw(convolve_st(hall, irs["hall"])[:N], "hp", 180.0), "lp", 7800.0)
    wet_r = bw(bw(convolve_st(room, irs["room"])[:N], "hp", 250.0), "lp", 6500.0)
    return dry + wet_h + 0.8 * wet_r


def k_weight(x: np.ndarray) -> np.ndarray:
    b1 = [1.53512485958697, -2.69169618940638, 1.19839281085285]
    a1 = [1.0, -1.69065929318241, 0.73248077421585]
    b2 = [1.0, -2.0, 1.0]
    a2 = [1.0, -1.99004745483398, 0.99007225036621]
    return signal.lfilter(b2, a2, signal.lfilter(b1, a1, x, axis=0), axis=0)


def lufs(x: np.ndarray) -> float:
    """الجهارة المتكاملة (BS.1770-4) بالبوّابتين المطلقة والنسبية."""
    p = np.sum(k_weight(x) ** 2, axis=1) if x.ndim == 2 else k_weight(x) ** 2
    cs = np.concatenate([[0.0], np.cumsum(p)])
    nb, nh = ns(0.4), ns(0.1)
    st = np.arange(0, p.size - nb + 1, nh)
    z = (cs[st + nb] - cs[st]) / nb
    z = z[-0.691 + 10.0 * np.log10(z + 1e-20) > -70.0]
    if z.size == 0:
        return float("-inf")
    rel = -0.691 + 10.0 * np.log10(np.mean(z)) - 10.0
    z = z[-0.691 + 10.0 * np.log10(z) > rel]
    return float(-0.691 + 10.0 * np.log10(np.mean(z)))


def true_peak_db(x: np.ndarray) -> float:
    up = signal.resample_poly(x, 4, 1, axis=0)
    return float(20.0 * np.log10(np.max(np.abs(up)) + 1e-20))


def mono_below(x: np.ndarray, fc: float = 120.0) -> np.ndarray:
    mid, side = 0.5 * (x[:, 0] + x[:, 1]), 0.5 * (x[:, 0] - x[:, 1])
    side = signal.sosfiltfilt(signal.butter(4, fc, btype="highpass", fs=SR, output="sos"), side)
    return np.stack([mid + side, mid - side], axis=1)


def glue(x: np.ndarray, thr_db: float = -19.0, ratio: float = 1.6, knee_db: float = 10.0) -> tuple[np.ndarray, float]:
    n, hop = x.shape[0], 32
    p = np.mean(x**2, axis=1)
    w = ns(0.01)
    cs = np.concatenate([[0.0], np.cumsum(p)])
    idx = np.arange(n)
    lo, hi = np.maximum(0, idx - w // 2), np.minimum(n, idx + w // 2)
    level = 10.0 * np.log10((cs[hi] - cs[lo]) / (hi - lo) + 1e-12) + 3.01
    over = level - thr_db
    slope = 1.0 - 1.0 / ratio
    gr = np.where(over <= -knee_db / 2, 0.0, np.where(over >= knee_db / 2, over * slope, slope * (over + knee_db / 2) ** 2 / (2 * knee_db)))[::hop]
    att, rel = np.exp(-hop / (0.02 * SR)), np.exp(-hop / (0.25 * SR))
    sm = np.empty_like(gr)
    s = 0.0
    for i, v in enumerate(gr):
        c = att if v > s else rel
        s = c * s + (1.0 - c) * v
        sm[i] = s
    gr_full = np.interp(idx, np.arange(0, n, hop), sm)
    return x * (10.0 ** (-gr_full / 20.0))[:, None], float(np.max(gr_full))


def limiter(x: np.ndarray, ceiling_db: float, lookahead: float = 0.004, release: float = 0.1) -> tuple[np.ndarray, float]:
    n = x.shape[0]
    up = signal.resample_poly(x, 4, 1, axis=0)[: 4 * n]
    pk = np.maximum(np.max(np.abs(up), axis=1).reshape(n, 4).max(axis=1), np.max(np.abs(x), axis=1))
    need = np.minimum(1.0, dbg(ceiling_db) / np.maximum(pk, 1e-12))
    la = ns(lookahead)
    fwd = np.lib.stride_tricks.sliding_window_view(np.concatenate([need, np.ones(la)]), la + 1).min(axis=1)
    cs = np.concatenate([[0.0], np.cumsum(np.concatenate([np.ones(la), fwd]))])
    avg = (cs[la + 1 + np.arange(n)] - cs[np.arange(n)]) / (la + 1)
    coef = np.exp(-1.0 / (release * SR))
    g = np.empty(n)
    s = 1.0
    for i in range(n):
        a = avg[i]
        s = a if a < s else a + (s - a) * coef
        g[i] = s
    return x * g[:, None], float(-20.0 * np.log10(np.min(g)))


def master(mix: np.ndarray) -> tuple[np.ndarray, dict]:
    x = mono_below(mix, 120.0)
    x = biquad(bw(x, "hp", 24.0), "hshelf", 9000.0, 0.7, -2.0)
    x = biquad(x, "peak", 320.0, 0.9, -2.0)
    x = bw(biquad(biquad(x, "peak", 3200.0, 0.8, 0.8), "peak", 5200.0, 0.8, 1.2), "lp", 16000.0, 4)
    x = x / np.max(np.abs(x)) * dbg(-6.0)
    # الذيل: خفوتٌ أُسّيّ في الديسيبل (0 → −62 dB) من 54.3 إلى 55.9 ثم ذوبانٌ أخير في 50 ms وصمتٌ رقميّ.
    # يُطبَّق قبل ضبط الجهارة فيُقاس الناتج النهائيّ نفسه.
    fade = np.ones(N)
    a, b = ns(54.3), ns(SILENT_FROM)
    u = np.arange(b - a) / (b - a)
    fade[a:b] = 10.0 ** (-62.0 * (0.5 - 0.5 * np.cos(np.pi * u)) ** 1.15 / 20.0)
    c = ns(0.05)
    fade[b - c : b] *= 0.5 + 0.5 * np.cos(np.pi * (np.arange(c) + 1) / c)
    fade[b:] = 0.0
    x, glue_gr = glue(x)
    x = x * fade[:, None]
    gain = TARGET_LUFS - lufs(x)
    for _ in range(8):
        y, lim_gr = limiter(x * dbg(gain), CEILING_DBTP)
        err = TARGET_LUFS - lufs(y)
        if abs(err) < 0.02:
            break
        gain += err
    return y, {"glue_max_gr_db": round(glue_gr, 2), "limiter_max_gr_db": round(lim_gr, 2), "gain_db": round(gain, 2)}


# ═══════════════════════════════════════ القياس ═══════════════════════════════════════

SECTIONS = [
    ("1_dawn", 0.0, 8.0),
    ("2_journey", 8.0, 24.0),
    ("3_security", 24.0, 38.0),
    ("4_twin", 38.0, 50.0),
    ("5_outro", 50.0, 56.0),
]
SUBSECTIONS = [
    ("s1a_open", 0.0, 4.0), ("s1b_walk", 4.0, 8.0), ("s2a_gen", 8.0, 12.0), ("s2b_flow", 12.0, 20.0), ("s2c_step", 20.0, 24.0),
    ("s3a_gate", 24.0, 30.0), ("s3b_patrol", 30.0, 36.0), ("s3c_ctrl", 36.0, 38.0), ("s4a_twin", 38.0, 44.0), ("s4b_alarm", 44.0, 48.0),
    ("s4c_resolve", 48.0, 50.0), ("s5a_pull", 50.0, 52.0), ("s5b_logo", 52.0, 56.0),
]  # fmt: skip
BANDS = ((20, 60), (60, 120), (120, 250), (250, 500), (500, 2000), (2000, 6000), (6000, 10000), (10000, 24000))
# إشاراتٌ مفتاحيّة للتدقيق (الزمن، الوصف، النطاق بالهرتز)
KEY_CUES = [
    (2.0, "first gravel step", (900.0, 6000.0)),
    (4.0, "motif #1", (400.0, 2500.0)),
    (5.5, "radio squelch", (600.0, 3500.0)),
    (8.0, "generation: sub + kick + hiss", (20.0, 24000.0)),
    (11.0, "step-up thump + sweep", (30.0, 24000.0)),
    (14.0, "first current-flow zap", (500.0, 9000.0)),
    (20.0, "breaker click + sub", (20.0, 24000.0)),
    (22.0, "motif #2 + windows", (400.0, 6000.0)),
    (24.0, "gate: sub + servo", (20.0, 24000.0)),
    (27.0, "scanner double beep", (700.0, 3000.0)),
    (30.0, "camera whirr + sonar", (400.0, 3000.0)),
    (32.0, "paired footsteps", (900.0, 6000.0)),
    (34.0, "drone rotor", (60.0, 1800.0)),
    (36.0, "control-room bleeps", (500.0, 3000.0)),
    (38.0, "digital dissolve", (20.0, 24000.0)),
    (41.0, "first sensor ping", (500.0, 9000.0)),
    (44.0, "alarm amber tone 1", (500.0, 3000.0)),
    (45.0, "alarm danger tone", (600.0, 6000.0)),
    (46.0, "route tick + whoosh", (1500.0, 7000.0)),
    (48.0, "resolve strum + motif", (20.0, 24000.0)),
    (52.0, "logo ring", (500.0, 9000.0)),
]


def section_stats(x: np.ndarray, spans) -> list[dict]:
    rows = []
    for name, a, b in spans:
        seg = x[ns(a) : ns(b)]
        mono = seg.mean(axis=1)
        f, pxx = signal.welch(mono, fs=SR, nperseg=min(4096, mono.size))
        total = float(np.sum(pxx)) + 1e-30
        bands = {f"{lo}-{hi}": round(10 * np.log10(float(np.sum(pxx[(f >= lo) & (f < hi)])) / total + 1e-30), 1) for lo, hi in BANDS}
        _, p_side = signal.welch(0.5 * (seg[:, 0] - seg[:, 1]), fs=SR, nperseg=min(8192, mono.size))
        f8, p_mid = signal.welch(mono, fs=SR, nperseg=min(8192, mono.size))
        low = (f8 > 0) & (f8 < 100.0)
        rows.append(
            {
                "section": name, "from": a, "to": b,
                "lufs_integrated": round(lufs(seg), 2),
                "rms_dbfs": round(20 * np.log10(np.sqrt(np.mean(seg**2)) + 1e-20), 2),
                "peak_dbfs": round(20 * np.log10(np.max(np.abs(seg)) + 1e-20), 2),
                "band_share_db": bands,
                "side_vs_mid_below_100hz_db": round(10 * np.log10((np.sum(p_side[low]) + 1e-30) / (np.sum(p_mid[low]) + 1e-30)), 1),
                "mono_fold_loss_db": round(lufs(np.repeat(mono[:, None], 2, axis=1)) - lufs(seg), 2),
            }
        )  # fmt: skip
    return rows


def rms_100ms(x: np.ndarray) -> np.ndarray:
    mono = x.mean(axis=1)
    n = mono.size // ns(0.1)
    return 10.0 * np.log10(np.mean(mono[: n * ns(0.1)].reshape(n, ns(0.1)) ** 2, axis=1) + 1e-20)


def cue_table(x: np.ndarray) -> list[dict]:
    """لكل إشارةٍ مفتاحيّة: RMS في 100 ms قبلها وبعدها (مجمل النطاق)، وطاقة النطاق الخاصّ بها، والقفزة بالديسيبل،
    وأقرب قمّة تدفّقٍ طيفيّ لبدايتها (±60 ms)."""
    mono = x.mean(axis=1)
    nfft, hop = 1024, 48
    frames = np.lib.stride_tricks.sliding_window_view(np.pad(mono, (nfft // 2, nfft)), nfft)[::hop]
    mag = np.abs(np.fft.rfft(frames[: mono.size // hop + 1] * np.hanning(nfft), axis=1))
    times, freqs = np.arange(mag.shape[0]) * hop / SR, np.fft.rfftfreq(nfft, 1.0 / SR)
    rows = []
    for cue, what, (lo, hi) in KEY_CUES:
        pre = mono[ns(cue - 0.1) : ns(cue)]
        post = mono[ns(cue) : ns(cue + 0.1)]
        post2 = mono[ns(cue + 0.1) : ns(cue + 0.2)]
        sosb = signal.butter(4, [max(lo, 20.0), min(hi, 23000.0)], btype="bandpass", fs=SR, output="sos")
        seg = signal.sosfilt(sosb, mono[ns(cue - 0.3) : ns(cue + 0.3)])
        bp_pre, bp_post = seg[ns(0.2) : ns(0.3)], seg[ns(0.3) : ns(0.4)]
        band = mag[:, (freqs >= lo) & (freqs < hi)]
        flux = np.concatenate([[0.0], np.maximum(0.0, np.diff(band, axis=0)).sum(axis=1)])
        w = (times >= cue - 0.06) & (times <= cue + 0.12)
        i = np.flatnonzero(w)[np.argmax(flux[w])]
        d = lambda a: 10 * np.log10(np.mean(a**2) + 1e-20)  # noqa: E731
        rows.append(
            {
                "cue_s": cue, "what": what,
                "rms_pre100_db": round(d(pre), 1), "rms_post100_db": round(d(post), 1), "rms_post100_200_db": round(d(post2), 1),
                "rms_jump_db": round(d(post) - d(pre), 1),
                "band_hz": [lo, hi], "band_pre_db": round(d(bp_pre), 1), "band_post_db": round(d(bp_post), 1), "band_jump_db": round(d(bp_post) - d(bp_pre), 1),
                "flux_peak_s": round(float(times[i]), 3), "flux_delta_ms": round(1000.0 * float(times[i] - cue), 1),
            }
        )  # fmt: skip
    return rows


def click_scan(x: np.ndarray) -> dict:
    """بحثٌ عن انقطاعاتٍ رقميّة (نقرات): قمّة المشتقّة الثانية المنفردة (عيّنةٌ واحدة) مقارنةً بمتوسّطها المحلّيّ في ±2 ms.
    الانتقالات الحقيقية (طبل، صنج) نطاقيّةٌ تمتدّ عدّة عيّنات فلا تُصنَّف نقرة؛ والانقطاع الفجائيّ يظهر عيّنةً واحدة."""
    from scipy import ndimage

    mono = x.mean(axis=1)
    s2 = np.abs(mono[2:] - 2.0 * mono[1:-1] + mono[:-2])
    base = ndimage.uniform_filter1d(s2, size=ns(0.004)) + 1e-9
    ratio = s2 / base
    cand = np.flatnonzero((ratio > 60.0) & (s2 > 3e-3))
    out, last = [], -1.0
    for c in cand:
        tt = (c + 1) / SR
        if tt - last < 0.01:
            continue
        last = tt
        out.append({"t": round(float(tt), 4), "ratio": round(float(ratio[c]), 1), "s2": round(float(s2[c]), 4)})
    return {"candidates": len(out), "top": sorted(out, key=lambda r: -r["ratio"])[:25]}


def max_step(x: np.ndarray) -> dict:
    """أكبر قفزةٍ بين عيّنتين متجاورتين (للنقرات الرقميّة) وموضعها."""
    d = np.max(np.abs(np.diff(x, axis=0)), axis=1)
    i = int(np.argmax(d))
    return {"max_sample_step": round(float(d[i]), 4), "at_s": round(i / SR, 4)}


def run(*cmd: str) -> subprocess.CompletedProcess:
    return subprocess.run(list(cmd), check=True, capture_output=True, text=True)


def ebur128(path: Path) -> dict:
    log = run("ffmpeg", "-hide_banner", "-nostdin", "-i", str(path), "-af", "ebur128=peak=true", "-f", "null", "-").stderr
    tail = log[log.rfind("Summary:") :]

    def grab(pat: str) -> float:
        return float(re.search(pat, tail).group(1))

    return {"integrated_lufs": grab(r"I:\s+(-?[\d.]+) LUFS"), "lra_lu": grab(r"LRA:\s+(-?[\d.]+) LU"), "true_peak_dbtp": grab(r"Peak:\s+(-?[\d.]+) dBFS")}


def silences(path: Path) -> list[dict]:
    log = run("ffmpeg", "-hide_banner", "-nostdin", "-i", str(path), "-af", "silencedetect=noise=-60dB:d=0.12", "-f", "null", "-").stderr
    starts = [float(v) for v in re.findall(r"silence_start: (-?[\d.]+)", log)]
    ends = re.findall(r"silence_end: ([\d.]+) \| silence_duration: ([\d.]+)", log)
    out = []
    for i, s in enumerate(starts):
        e = float(ends[i][0]) if i < len(ends) else None
        out.append({"start": round(s, 3), "end": e, "duration": float(ends[i][1]) if i < len(ends) else None})
    return out


def decode(path: Path) -> np.ndarray:
    raw = subprocess.run(["ffmpeg", "-hide_banner", "-nostdin", "-i", str(path), "-f", "f32le", "-ac", "2", "-ar", str(SR), "-"], check=True, capture_output=True).stdout
    return np.frombuffer(raw, dtype="<f4").reshape(-1, 2).astype(float)


def probe(path: Path) -> dict:
    out = run(
        "ffprobe", "-v", "error", "-show_entries",
        "format=duration,size,bit_rate:format_tags:stream=codec_name,profile,sample_rate,channels,bit_rate:stream_tags", "-of", "json", str(path),
    ).stdout  # fmt: skip
    return json.loads(out)


def encode(wav: Path, media: Path) -> tuple[Path, Path]:
    """AAC-LC ‏128k (‏+faststart) وOpus ‏112k، صوتٌ وحده، بلا وسومٍ سوى العنوان."""
    media.mkdir(parents=True, exist_ok=True)
    m4a, webm = media / M4A_NAME, media / WEBM_NAME
    common = [
        "ffmpeg", "-hide_banner", "-nostdin", "-y", "-i", str(wav), "-map", "0:a:0", "-vn", "-sn", "-dn",
        "-map_metadata", "-1", "-map_chapters", "-1", "-metadata", f"title={TITLE}",
        "-fflags", "+bitexact", "-flags:a", "+bitexact", "-ar", str(SR), "-ac", "2",
    ]  # fmt: skip
    run(*common, "-c:a", "aac", "-profile:a", "aac_low", "-b:a", "128k", "-movflags", "+faststart", str(m4a))
    run(*common, "-c:a", "libopus", "-b:a", "112k", "-vbr", "constrained", "-compression_level", "10", "-write_crc32", "0", str(webm))
    return m4a, webm


def evidence(out: Path, wav: Path, y: np.ndarray, encoded, meta: dict, mx: Mixer) -> dict:
    run(
        "ffmpeg", "-hide_banner", "-nostdin", "-y", "-i", str(wav), "-lavfi",
        "showspectrumpic=s=1800x700:legend=1:scale=log:fscale=lin:mode=combined:color=intensity", str(out / "spectrum.png"),
    )  # fmt: skip
    marks = [8, 11, 14, 18, 20, 22, 24, 27, 30, 32, 34, 36, 38, 41, 44, 46, 48, 50, 52]
    lines = ",".join(f"drawbox=x={round(m / TOTAL * 1800)}:y=0:w=1:h=ih:color=0xffd27a@0.55:t=fill" for m in marks)
    run(
        "ffmpeg", "-hide_banner", "-nostdin", "-y", "-i", str(wav), "-filter_complex",
        "color=c=0x0b1530:s=1800x420:d=1[bg];[0:a]showwavespic=s=1800x420:split_channels=1:colors=0x6cc3ff|0x7fe3b0:scale=lin[w];"
        f"[bg][w]overlay=format=auto,{lines}", "-frames:v", "1", str(out / "wave.png"),
    )  # fmt: skip
    r100 = rms_100ms(y)
    report = {
        "file": wav.name, "sha256": hashlib.sha256(wav.read_bytes()).hexdigest(), "sample_rate": SR, "channels": 2,
        "duration_s": round(y.shape[0] / SR, 4),
        "measured_by_ffmpeg_ebur128": ebur128(wav),
        "measured_in_python": {"integrated_lufs": round(lufs(y), 2), "true_peak_dbtp_x4": round(true_peak_db(y), 2)},
        "sample_peak_dbfs": round(20 * np.log10(np.max(np.abs(y))), 2),
        "clipped_samples": int(np.sum(np.abs(y) >= 1.0)),
        "last_nonzero_sample_s": round(float(np.flatnonzero(np.any(y != 0.0, axis=1))[-1] / SR), 4),
        "first_nonzero_sample_s": round(float(np.flatnonzero(np.any(y != 0.0, axis=1))[0] / SR), 4),
        "max_sample_step": max_step(y),
        "silencedetect_-60dB_0.12s": silences(wav),
        "sections": section_stats(y, SECTIONS),
        "subsections": section_stats(y, SUBSECTIONS),
        "cue_table": cue_table(y),
        "rms_100ms_db": [round(float(v), 1) for v in r100],
        "click_scan": click_scan(y),
        "mix": meta,
    }  # fmt: skip
    if encoded:
        report["encodes"] = {}
        for path in encoded:
            dec = decode(path)
            report["encodes"][path.name] = {
                "bytes": path.stat().st_size, "sha256": hashlib.sha256(path.read_bytes()).hexdigest(), "probe": probe(path),
                "measured_by_ffmpeg_ebur128": ebur128(path), "decoded_duration_s": round(dec.shape[0] / SR, 4),
                "decoded_clipped_samples": int(np.sum(np.abs(dec) >= 1.0)),
                "decoded_true_peak_dbtp_x4": round(true_peak_db(dec), 2),
            }  # fmt: skip
    (out / "analysis.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return report


def bus_report(mx: Mixer) -> dict:
    """جهارة كل مسارٍ جافّ في كل قسمٍ فرعيّ (K-weighted LUFS) — لضبط التوازن بالأرقام."""
    rep = {}
    for name, x in sorted(mx.bus.items()):
        row = {}
        for sec, a, b in SUBSECTIONS:
            seg = x[ns(a) : ns(b)]
            if np.any(seg):
                row[sec] = round(lufs(seg) if seg.shape[0] > ns(0.5) else -99.0, 1)
        rep[name] = row
    return rep


# ═══════════════════════════════════════ التشغيل ═══════════════════════════════════════


def main() -> None:
    ap = argparse.ArgumentParser(description="Digital Twin v2 film score — original synthesis")
    ap.add_argument("--out", required=True, type=Path)
    ap.add_argument("--encode", type=Path, metavar="MEDIA_DIR")
    ap.add_argument("--evidence", action="store_true")
    ap.add_argument("--buses", action="store_true", help="يطبع جهارة كل مسارٍ في كل قسم (للضبط)")
    args = ap.parse_args()
    args.out.mkdir(parents=True, exist_ok=True)

    mx, kicks, irs = arrange()
    process(mx, kicks)
    buses = bus_report(mx) if args.buses else {}
    if buses:
        print(json.dumps(buses, ensure_ascii=False))
    mix = render(mx, irs)
    y, meta = master(mix)

    wav = args.out / WAV_NAME
    wavfile.write(wav, SR, y.astype(np.float32))
    cues = sorted(mx.cues, key=lambda c: (c["t"], c["bus"]))
    (args.out / "cue-sheet.json").write_text(json.dumps({"note": "times in seconds from audio start == video frame 0; measured detection offsets are in analysis.json (cue_table)", "duration_s": TOTAL, "bpm": 120, "cues": cues, "kick_times_s": [round(k, 3) for k in sorted(set(kicks))]}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (args.out / "score-meta.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"wav: {wav}  lufs={lufs(y):.2f}  tp={true_peak_db(y):.2f} dBTP  {json.dumps(meta, ensure_ascii=False)}  sha256={hashlib.sha256(wav.read_bytes()).hexdigest()[:16]}")

    encoded = encode(wav, args.encode) if args.encode else None
    if encoded:
        for p in encoded:
            print(f"{p}: {p.stat().st_size} bytes")
    if args.evidence:
        report = evidence(args.out, wav, y, encoded, meta, mx)
        print(json.dumps({k: report[k] for k in ("measured_by_ffmpeg_ebur128", "clipped_samples", "last_nonzero_sample_s")}, ensure_ascii=False))


if __name__ == "__main__":
    main()
