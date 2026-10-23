#!/usr/bin/env python3
"""
موسيقى فيلم بانر سَدِيد — تأليفٌ أصليٌّ مركَّبٌ بالكود من الصفر (numpy + scipy)، بلا عيّنةٍ ولا صوتٍ من طرفٍ ثالث.

أمر المالك ٢٠٢٦/١٠/١٨ (R4، البند الثالث) بنصّه: «واظف الى فديو الموشن قرافيتي افضل واجمل واحدث موسيقا
احترافية عصرية تزيد من جمالية وضع النظام واجعل علامة سديد في النهاية تكون كالجوهرة المشعة باستمرار وذات
توهج لولبي مشع وبلمعان مستمر من الاسفل الى الاعلى».

لماذا تركيبٌ لا مكتبة موسيقى: المصادر المرخّصة محجوبةٌ عن بيئة العمل (التفصيل بنصّه في README.md)، فكلّ صوتٍ
هنا مولَّدٌ رياضيًّا — مذبذباتٌ ومرشّحاتٌ وضجيجٌ ثابت البذرة — فلا ترخيص يُطلب ولا نسبة تُذكر.

الأسلوب «إلكترونيّ سينمائيّ» على شبكة الفيلم نفسها (120 نبضة/د): ري الصغير (Dm | B♭ | F | C) يسوق المونتاج،
ثم فراغٌ وصياغةٌ بالليزر، ثم انفراجٌ إلى ري الكبير (D add9) لحظة اكتمال الرمز (19.5 ث)، وتصعد «اللمعة» من
الأسفل إلى الأعلى في الثانية الأخيرة، وذيلُ صدىً إلى 26 ث ينتهي بصمتٍ رقميّ.

الاستعمال:
  python3 compose.py --out DIR
      ← DIR/sadeed-film-score.wav (‏48 kHz · ستيريو · float32) و DIR/score-meta.json
  python3 compose.py --out DIR --encode MEDIA_DIR
      ← ومعها MEDIA_DIR/sadeed-film-score.m4a (AAC-LC ‏128k) و MEDIA_DIR/sadeed-film-score.webm (Opus ‏112k)
  python3 compose.py --out DIR --encode MEDIA_DIR --evidence
      ← ومعها DIR/spectrum.png · DIR/wave.png · DIR/analysis.json (يتطلّب ffmpeg)

الناتج حتميّ: البذرة ثابتة، ولا خيوط ولا وقتَ نظامٍ في المسار (قِيس على numpy 2.4.6 · scipy 1.17.1).
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

# ═══════════════════ زمن الفيلم — منسوخٌ من remotion/brand/film/timeline.ts ═══════════════════
# أبقِ هذه الأرقام متزامنةً مع timeline.ts بالأسماء نفسها: تغييرُ أحدهما يغيّر الآخر في الدفعة نفسها.

FILM_FPS = 30
FILM_SECONDS = 24
BEAT = 0.5
ACT = {"igniteEnd": 0.5, "montageEnd": 16.5, "forgeEnd": 20.5, "settleEnd": 23.0}
FORGE = {
    "collapseEnd": 17.0,
    "lasers": [17.0, 17.5, 18.0, 18.5],
    "scanFrom": 18.6,
    "complete": 19.5,
}
CUTS = [
    0.5, 1.5, 2.5, 3.5, 4.5, 5.5, 6.5, 7.5, 8.5, 9.0, 9.5, 10.0, 10.5, 11.0, 11.5, 12.0, 12.5, 13.0,
    13.5, 14.0, 14.5, 15.0, 15.5, 16.5,
]  # fmt: skip
FLASHES = [0.5, 4.5, 8.5, 12.5]
TEXT_REVEAL = 21.6

# ═══════════════════════════════════ ثوابت الموسيقى ═══════════════════════════════════

SR = 48_000
SEED = 20261018
TAIL = 2.0  # ذيل الصدى بعد آخر إطار
TOTAL = FILM_SECONDS + TAIL  # 26.0 ث
N = int(round(TOTAL * SR))
BAR = 4 * BEAT  # المازورة 2 ث — وترٌ لكل مازورة
STEP = BEAT / 4  # السادس عشر 0.125 ث

HIT = ACT["igniteEnd"]  # 0.5 — الضربة الأولى بعد الاشتعال
GROOVE_B = FLASHES[2]  # 8.5 — المقطع الثاني (تصفيق، والأربيجو أعلى بجواب)
BUILD = FLASHES[3]  # 12.5 — التصاعد
CONVERGE = CUTS[-2]  # 15.5 — اللقطة الأخيرة: تقارب الضوء، فيخرج الإيقاع والجهير
DROP = ACT["montageEnd"]  # 16.5 — الانهيار إلى الفراغ: ضربةٌ عميقة وصمت
IMPACT = FORGE["complete"]  # 19.5 — اكتمال الرمز: الضربة الكبرى وانفراج ري الكبير
SHINE = ACT["settleEnd"]  # 23.0 — اللمعة الصاعدة من الأسفل إلى الأعلى
BARS = [HIT + k * BAR for k in range(int(round((DROP - HIT) / BAR)))]  # 0.5 … 14.5

TARGET_LUFS = -16.0
CEILING_DBTP = -1.5  # هامشٌ تحت −1.0 لتجاوز المرمِّز الضائع (AAC/Opus)
TITLE = "SADEED — film score (original)"
WAV_NAME = "sadeed-film-score.wav"

# ── التآلف: الأصوات أرقام MIDI (‏A4 = 69)، وقيادة الأصوات خطوةً خطوة ──
PROGRESSION = ["Dm", "Bb", "F", "C", "Dm", "Bb", "F", "C"]
PAD = {  # A3→B♭3→A3→G3 · D4→D4→C4→C4 · F4→F4→F4→E4 · A4→B♭4→A4→G4
    "Dm": [57, 62, 65, 69],
    "Bb": [58, 62, 65, 70],
    "F": [57, 60, 65, 69],
    "C": [55, 60, 64, 67],
}
BASS = {"Dm": 38, "Bb": 34, "F": 41, "C": 36}  # D2 · B♭1 · F2 · C2
ARP = {  # ستّ نغماتٍ للوتر في نافذةٍ ضيّقة (C4–B♭5) فلا يقفز السجلّ بين الأوتار
    "Dm": [62, 65, 69, 74, 77, 81],
    "Bb": [62, 65, 70, 74, 77, 82],
    "F": [60, 65, 69, 72, 77, 81],
    "C": [60, 64, 67, 72, 76, 79],
}
ARP_STEPS = [0, 3, 2, 3, 1, 3, 2, 4, 0, 3, 2, 3, 1, 4, 5, 4]  # نغمةٌ ثابتة (الجواب) ونهوضٌ آخر المازورة
STAB_DM = [57, 62, 65, 69, 74, 77]  # A3 D4 F4 A4 D5 F5
STAB_D = [57, 62, 66, 69, 74, 78]  # A3 D4 F♯4 A4 D5 F♯5 — ري الكبير الساطع
RESOLVE = [50, 57, 66, 69, 76]  # D3 A3 F♯4 A4 E5 — D add9 مفتوح
BELLS = [  # (زمن، نغمة، شدّة) — يُترك ما حول 21.6 فارغًا للجرس، ونصف ثانيةٍ قبل اللمعة (23.0)
    (20.00, 74, 0.75),
    (20.25, 81, 0.55),
    (20.50, 88, 0.65),
    (20.75, 90, 0.50),
    (21.00, 81, 0.60),
    (21.25, 86, 0.50),
    (22.00, 78, 0.65),
    (22.25, 81, 0.50),
    (22.50, 88, 0.60),
]
GLITTER = [74, 76, 78, 81, 83, 86, 88, 90, 93, 95, 98]  # D5 → D7 خماسيّ ري الكبير صاعدًا
GLITTER_END = 23.9
HAT_VEL = (0.55, 0.35, 0.85, 0.42)  # 1 e & a — النبر على «&»

# إرسال كل مسارٍ إلى الصدى (dB)؛ None = جافّ (الطبل والجهير لا يُغرَقان).
SENDS = {
    "kick": None,
    "bass": None,
    "impact": -14.0,
    "pad": -9.0,
    "stab": -6.0,
    "arp": -11.0,
    "hats": -22.0,
    "clap": -7.0,
    "snare": -10.0,
    "cymbal": -13.0,
    "fx": -9.0,
    "zap": -8.0,
    "drone": -18.0,
    "bells": -5.0,
}

# ═══════════════════════════════════════ أدوات ═══════════════════════════════════════


def ns(sec: float) -> int:
    """ثوانٍ ← عيّنات."""
    return int(round(sec * SR))


def tvec(n: int) -> np.ndarray:
    return np.arange(n) / SR


def dbg(db: float) -> float:
    """ديسيبل ← معاملٌ خطّي."""
    return 10.0 ** (db / 20.0)


def mtof(m: float) -> float:
    """رقم MIDI ← تردّد."""
    return float(440.0 * 2.0 ** ((m - 69.0) / 12.0))


def rng_for(tag: str) -> np.random.Generator:
    """مولّدٌ ثابت البذرة لكل عنصر: إضافةُ عنصرٍ لا تغيّر ضجيج غيره."""
    return np.random.default_rng([SEED, zlib.crc32(tag.encode("utf-8"))])


def pan_gains(p: float) -> tuple[float, float]:
    """توزيعٌ متساوي القدرة، والوسط 0 dB في كل قناة."""
    a = (float(np.clip(p, -1.0, 1.0)) + 1.0) * np.pi / 4.0
    return float(np.cos(a) * np.sqrt(2.0)), float(np.sin(a) * np.sqrt(2.0))


def fades(n: int, fin: float, fout: float) -> np.ndarray:
    """نافذةٌ بجيب تمامٍ مرفوع في الطرفين — تبدأ من صفرٍ وتنتهي بصفر، فلا نقرة."""
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
    """أحاديّ ← ستيريو بموضعه؛ والستيريو يُوازَن بالقانون نفسه (الوسط بلا تغيير)."""
    left, right = pan_gains(pan)
    if x.ndim == 2:
        return x * np.array([left, right]) if pan else x
    return np.stack([x * left, x * right], axis=1)


def pan_path(x: np.ndarray, p: np.ndarray) -> np.ndarray:
    """توزيعٌ يتحرّك مع الزمن (مصفوفة مواضع)."""
    a = (np.clip(p, -1.0, 1.0) + 1.0) * np.pi / 4.0
    return np.stack([x * np.cos(a), x * np.sin(a)], axis=1) * np.sqrt(2.0)


def perc(n: int, attack: float, tau: float) -> np.ndarray:
    """غلافٌ قرعيّ: صعودٌ خطّيّ قصير ثم اضمحلالٌ أُسّيّ."""
    t = tvec(n)
    a = np.clip(t / attack, 0.0, 1.0) if attack > 0 else np.ones(n)
    return a * np.exp(-np.maximum(t - attack, 0.0) / tau)


# ═════════════════════════════════════ المذبذبات ═════════════════════════════════════


def phase(freq, n: int, phase0: float = 0.0) -> tuple[np.ndarray, np.ndarray]:
    f = np.full(n, float(freq)) if np.ndim(freq) == 0 else np.asarray(freq, dtype=float)[:n]
    dt = f / SR
    ph = np.empty(n)
    ph[0] = 0.0
    np.cumsum(dt[:-1], out=ph[1:])
    return np.mod(ph + phase0, 1.0), dt


def saw(freq, n: int, phase0: float = 0.0) -> np.ndarray:
    """منشارٌ محدود النطاق (PolyBLEP): لا طيّ طيفيّ (aliasing) في النغمات العالية."""
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
    """معاملات مرشّحٍ ثنائيّ الرتبة (RBJ Audio EQ Cookbook)."""
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
    elif kind == "bp":  # ذروة 0 dB
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
    else:
        raise ValueError(kind)
    b, a = np.asarray(b, dtype=float), np.asarray(a, dtype=float)
    return b / a[0], a / a[0]


def biquad(x: np.ndarray, kind: str, f: float, q: float = 0.7071, gain_db: float = 0.0) -> np.ndarray:
    b, a = rbj(kind, f, q, gain_db)
    return signal.lfilter(b, a, x, axis=0)


def bw(x: np.ndarray, kind: str, f, order: int = 2) -> np.ndarray:
    """مرشّح Butterworth ثابت."""
    btype = {"lp": "lowpass", "hp": "highpass", "bp": "bandpass"}[kind]
    sos = signal.butter(order, f, btype=btype, fs=SR, output="sos")
    return signal.sosfilt(sos, x, axis=0)


def sweep(x: np.ndarray, kind: str, fc, q: float = 0.7071, block: int = 32, stages: int = 1) -> np.ndarray:
    """مرشّحٌ يتحرّك تردّده مع الزمن: معاملات RBJ تُحدَّث كل `block` عيّنة والحالة مستمرّة بينها."""
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


# ═══════════════════════════════════════ الآلات ═══════════════════════════════════════
# كلّ آلةٍ تعيد إشارةً قمّتها 1 تقريبًا؛ المستوى يُضبط في التوزيع (dB) لا هنا.


def kick(rng: np.random.Generator, f_lo: float = 48.0) -> np.ndarray:
    """طبلة القاع: جيبٌ يهبط تردّده (160→48 Hz) مع تشبّعٍ ليّن، ونقرةٌ قصيرة للوضوح."""
    n = ns(0.6)
    t = tvec(n)
    f = f_lo + (160.0 - f_lo) * np.exp(-t / 0.032)
    body = sine(f, n) * perc(n, 0.0008, 0.2)
    body = np.tanh(1.7 * body) / np.tanh(1.7)
    cn = ns(0.008)
    click = norm(bw(rng.standard_normal(cn) * np.exp(-tvec(cn) / 0.0015), "bp", (1500.0, 6000.0)))
    body[:cn] += dbg(-17.0) * click
    return norm(body * fades(n, 0.0, 0.03))


def boom(
    rng: np.random.Generator,
    f_hi: float = 95.0,
    f_lo: float = 31.0,
    tau_f: float = 0.42,
    tau_a: float = 0.8,
    dur: float = 3.0,
    drive: float = 1.7,
) -> np.ndarray:
    """ضربةٌ عميقة (sub drop): جيبٌ ينحدر ببطء، مشبَّعٌ ليُسمع على السمّاعات الصغيرة، ودفعةُ ضجيجٍ منخفض."""
    n = ns(dur)
    t = tvec(n)
    f = f_lo + (f_hi - f_lo) * np.exp(-t / tau_f)
    x = sine(f, n) * perc(n, 0.003, tau_a)
    x = np.tanh(drive * x) / np.tanh(drive)
    thump = rng.standard_normal(n) * perc(n, 0.001, 0.045)
    thump = norm(bw(bw(thump, "lp", 260.0, 4), "hp", 30.0))
    return norm((x + dbg(-9.0) * thump) * fades(n, 0.0, 0.4))


def clap(rng: np.random.Generator) -> np.ndarray:
    """تصفيق: أربع دفعاتٍ متقاربة (≈10 ms) والأخيرة أطول — في نطاقٍ أوسط بلا حدّة."""
    n = ns(0.45)
    t = tvec(n)
    env = np.zeros(n)
    for k, off in enumerate((0.0, 0.0105, 0.0215, 0.0315)):
        tt = t - off
        on = tt >= 0
        tau, lvl = (0.0045, 0.85) if k < 3 else (0.09, 1.0)
        env[on] = np.maximum(env[on], lvl * np.minimum(1.0, tt[on] / 0.0005) * np.exp(-tt[on] / tau))
    a, b = rng.standard_normal((2, n))
    st = np.stack([0.86 * a + 0.5 * b, 0.86 * a - 0.5 * b], axis=1) * env[:, None]
    st = biquad(bw(st, "bp", (750.0, 5200.0)), "peak", 1250.0, 1.0, 4.0)
    return norm(st * fades(n, 0.0, 0.05)[:, None])


def hat(rng: np.random.Generator, open_: bool = False) -> np.ndarray:
    """صنج: ضجيجٌ بين 6.5 و11.5 kHz بقمّةٍ معدنية خفيفة — لا شيء فوقه يخدش."""
    n = ns(0.5 if open_ else 0.11)
    a, b = rng.standard_normal((2, n))
    st = np.stack([0.9 * a + 0.43 * b, 0.9 * a - 0.43 * b], axis=1)
    st *= perc(n, 0.0005, 0.13 if open_ else 0.032)[:, None]
    st = biquad(bw(bw(st, "hp", 6500.0), "lp", 11500.0), "peak", 8600.0, 2.2, 4.5)
    return norm(st * fades(n, 0.0, 0.01)[:, None])


def snare(rng: np.random.Generator, pitch: float = 1.0, tau_n: float = 0.11) -> np.ndarray:
    """طبلة الفخّ للدحرجة: جسمٌ نغميّ (≈180 Hz) وضجيجٌ مرشَّح، يرتفعان مع `pitch`."""
    n = ns(0.32)
    t = tvec(n)
    f = 182.0 * pitch * (1.0 + 0.35 * np.exp(-t / 0.012))
    body = sine(f, n) * perc(n, 0.0006, 0.05) + 0.35 * sine(f * 1.62, n) * perc(n, 0.0006, 0.03)
    noise = bw(rng.standard_normal(n) * perc(n, 0.0004, tau_n), "bp", (1300.0 * pitch**0.5, 8000.0))
    return norm((0.55 * norm(body) + 0.85 * norm(noise)) * fades(n, 0.0, 0.03))


def crash(
    rng: np.random.Generator, dur: float = 2.6, tau: float = 0.7, hp: float = 2600.0, lp: float = 9500.0
) -> np.ndarray:
    """صنجٌ كبير ناعم: ضجيجٌ عريض وأربعة رنينٍ معدنيّ، مقصوصٌ فوق 9.5 kHz."""
    n = ns(dur)
    t = tvec(n)
    a, b = rng.standard_normal((2, n))
    st = np.stack([0.8 * a + 0.6 * b, 0.8 * a - 0.6 * b], axis=1)
    for f in (3150.0, 4420.0, 5310.0, 6870.0):
        ring = 0.12 * np.sin(2 * np.pi * f * t + rng.random() * 2 * np.pi)
        st += np.stack([ring, np.roll(ring, 37)], axis=1)
    st *= perc(n, 0.0012, tau)[:, None]
    st = bw(bw(st, "hp", hp), "lp", lp)
    return norm(st * fades(n, 0.0, 0.2)[:, None])


def reverse_cymbal(rng: np.random.Generator, dur: float) -> np.ndarray:
    """صنجٌ معكوس: ينتفخ من الصمت وينتهي حادًّا عند اللحظة التالية."""
    c = crash(rng, dur=dur, tau=dur * 0.42)[::-1].copy()
    return norm(c * fades(c.shape[0], dur * 0.2, 0.004)[:, None])


def whoosh(
    rng: np.random.Generator, dur: float, peak: float, pan_from: float, pan_to: float, f_lo: float = 650.0, f_hi: float = 3000.0
) -> np.ndarray:
    """هبّةٌ خفيفة على القطع: نطاقٌ يصعد إلى قمّته عند القطع ثم يهدأ، وتعبر من جانبٍ إلى آخر."""
    n = ns(dur)
    t = tvec(n)
    up = np.clip(t / peak, 0.0, 1.0)
    down = np.clip((t - peak) / (dur - peak), 0.0, 1.0)
    env = np.where(t < peak, np.sin(0.5 * np.pi * up) ** 2.2, (1.0 - down) ** 2)
    fc = np.where(t < peak, f_lo * (f_hi / f_lo) ** up, f_hi * (f_lo / f_hi) ** (0.6 * down))
    x = sweep(rng.standard_normal(n), "bp", fc, q=1.6) * env
    return norm(pan_path(x, pan_from + (pan_to - pan_from) * t / dur))


def riser(rng: np.random.Generator, dur: float, f0: float = 350.0, f1: float = 7500.0, floor_db: float = -36.0) -> np.ndarray:
    """صاعدُ ضجيج: نطاقٌ يكتسح للأعلى ويعلو، عريضٌ بقناتين غير مترابطتين."""
    n = ns(dur)
    u = tvec(n) / dur
    st = rng.standard_normal((n, 2))
    st = sweep(st, "bp", f0 * (f1 / f0) ** (u**1.5), q=1.2, block=64)
    st = bw(bw(st, "hp", 220.0), "lp", 10000.0)
    amp = dbg(floor_db * (1.0 - u) ** 1.3) * fades(n, 0.05, 0.003)
    return norm(st * amp[:, None])


def zap(rng: np.random.Generator, f_hi: float = 3600.0, f_lo: float = 150.0) -> np.ndarray:
    """ليزر: تعديلٌ تردّديّ (FM) يهبط بسرعة، وأزيزٌ قصير، ونبضةٌ منخفضة تمنحه ثِقلًا."""
    n = ns(0.55)
    t = tvec(n)
    f = f_lo + (f_hi - f_lo) * np.exp(-t / 0.035)
    ph_c, _ = phase(f, n)
    ph_m, _ = phase(f * 1.5, n, 0.25)
    idx = 2.4 * np.exp(-t / 0.06) + 0.2
    tone = np.sin(2 * np.pi * ph_c + idx * np.sin(2 * np.pi * ph_m)) * perc(n, 0.0006, 0.1)
    sizzle = bw(rng.standard_normal(n) * perc(n, 0.0005, 0.045), "bp", (2500.0, 7500.0))
    thump = sine(46.0 + 40.0 * np.exp(-t / 0.025), n) * perc(n, 0.0008, 0.09)
    x = 0.8 * norm(tone) + 0.14 * norm(sizzle) + 0.55 * norm(thump)
    return norm(bw(x, "lp", 9000.0) * fades(n, 0.0, 0.05))


def scan_riser(rng: np.random.Generator, dur: float, t_abs: float) -> np.ndarray:
    """مسحُ الليزر الصاعد: نغمةٌ تنزلق جوابين (D4→D6) وضجيجٌ مكتسَح ينبض بأثمان النوتة الثانية والثلاثين."""
    n = ns(dur)
    t = tvec(n)
    u = t / dur
    f = mtof(62) * 2.0 ** (2.0 * u**1.4)
    tone = 0.5 * saw(f, n, 0.0) + 0.5 * saw(f * 1.004, n, 0.37)
    tone = sweep(tone, "lp", f * 3.0 + 400.0, q=0.9, stages=2)
    gate = 1.0 - 0.6 * (0.5 - 0.5 * np.cos(2 * np.pi * 16.0 * (t + t_abs)))
    noise = sweep(rng.standard_normal((n, 2)), "bp", 300.0 * (6500.0 / 300.0) ** u, q=2.0) * gate[:, None]
    st = 0.6 * stereo(norm(tone)) + 0.5 * norm(noise)
    amp = dbg(-30.0 * (1.0 - u) ** 1.6) * fades(n, 0.02, 0.003)
    return norm(st * amp[:, None])


def impact(rng: np.random.Generator) -> np.ndarray:
    """الضربة الكبرى (19.5): انحدارٌ عميق ودفعةُ ضجيجٍ يُغلق مرشّحها وطبلةٌ، مشبَّعةً معًا."""
    n = ns(3.6)
    t = tvec(n)
    sub = boom(rng, f_hi=120.0, f_lo=30.0, tau_f=0.36, tau_a=1.0, dur=3.6, drive=2.2)
    burst = rng.standard_normal((n, 2)) * perc(n, 0.0008, 0.32)[:, None]
    burst = sweep(burst, "lp", 250.0 + 8500.0 * np.exp(-t / 0.11), q=0.7, block=64)
    k = np.zeros(n)
    kk = kick(rng)
    k[: kk.size] = kk
    st = stereo(sub) + 0.4 * norm(burst) + 0.7 * stereo(k)
    return norm(np.tanh(1.3 * st) / np.tanh(1.3))


def bass_note(rng: np.random.Generator, midi: int, gate: float, vel: float, cutoff: float, env_amt: float) -> np.ndarray:
    """جهيرٌ «راكض»: منشاران متباعدان قليلًا بمرشّحٍ رباعيّ الأقطاب ينفتح ويُغلق، وجيبٌ تحتيّ بالتردّد نفسه."""
    f = mtof(midi)
    n = ns(gate + 0.012)
    t = tvec(n)
    x = 0.5 * (saw(f * 2 ** (-4 / 1200), n, rng.random()) + saw(f * 2 ** (4 / 1200), n, rng.random()))
    x = sweep(x, "lp", cutoff + env_amt * vel * np.exp(-t / 0.055), q=0.85, block=16, stages=2)
    amp = np.minimum(1.0, t / 0.0025) * (0.78 + 0.22 * np.exp(-t / 0.07))
    y = (0.6 * x + 0.9 * sine(f, n)) * amp
    return vel * (np.tanh(1.3 * y) / np.tanh(1.3)) * fades(n, 0.0, 0.012)


SS_DETUNE = np.array([-1.0, -0.62, -0.25, 0.0, 0.25, 0.62, 1.0])
SS_GAIN = np.array([0.6, 0.75, 0.9, 1.0, 0.9, 0.75, 0.6])
SS_PAN = np.array([-0.9, 0.6, -0.3, 0.0, 0.3, -0.6, 0.9])  # الحادّ والمسطَّح موزّعان على الجانبين


def supersaw(rng: np.random.Generator, midis: list[int], n: int, detune: float = 16.0, width: float = 0.85) -> np.ndarray:
    """«سوبر‌ساو»: سبعة مناشير لكل نغمة بانحرافٍ في السنتات، بأطوارٍ عشوائية ثابتة البذرة، موزّعةً على العرض."""
    out = np.zeros((n, 2))
    for m in midis:
        f = mtof(m)
        for k in range(7):
            v = saw(f * 2.0 ** (SS_DETUNE[k] * detune / 1200.0), n, rng.random()) * SS_GAIN[k]
            left, right = pan_gains(SS_PAN[k] * width)
            out[:, 0] += v * left
            out[:, 1] += v * right
    return out / (len(midis) * np.sqrt(np.sum(SS_GAIN**2)))


def chord_pad(
    rng: np.random.Generator, midis: list[int], dur: float, attack: float = 0.05, release: float = 0.3, detune: float = 16.0
) -> np.ndarray:
    n = ns(dur + release)
    return supersaw(rng, midis, n, detune) * fades(n, attack, release)[:, None]


def chord_stab(
    rng: np.random.Generator, midis: list[int], dur: float = 1.6, bright: float = 1.0, tau: float = 0.45
) -> np.ndarray:
    """ضربةُ وترٍ ساطعة: سوبر‌ساو يُغلق مرشّحه سريعًا ويهبط إلى ربع مستواه ثم يذوب في البساط."""
    n = ns(dur)
    t = tvec(n)
    x = supersaw(rng, midis, n, 20.0, 0.95)
    x = sweep(x, "lp", 1800.0 + 5200.0 * bright * np.exp(-t / 0.18), q=0.8, block=64, stages=2)
    env = np.minimum(1.0, t / 0.003) * (0.25 + 0.75 * np.exp(-t / tau)) * fades(n, 0.0, min(0.5, dur * 0.4))
    return norm(bw(x * env[:, None], "hp", 120.0))


def pluck(rng: np.random.Generator, midi: int, gate: float, vel: float, cutoff: float, env_amt: float = 2400.0) -> np.ndarray:
    """نقرة الأربيجو: منشاران وجوابٌ جيبيّ خافت عبر مرشّحٍ رباعيّ بغلافٍ سريع."""
    f = mtof(midi)
    n = ns(gate + 0.03)
    t = tvec(n)
    x = 0.5 * saw(f * 2 ** (-6 / 1200), n, rng.random()) + 0.5 * saw(f * 2 ** (6 / 1200), n, rng.random())
    x += 0.15 * sine(2.0 * f, n)
    fc = np.minimum(cutoff + env_amt * vel * np.exp(-t / 0.06), 16000.0)
    x = sweep(x, "lp", fc, q=1.0, block=16, stages=2)
    return vel * x * np.minimum(1.0, t / 0.0015) * np.exp(-t / 0.16) * fades(n, 0.0, 0.03)


def fm_bell(
    midi: int, dur: float = 1.8, ratio: float = 3.5, index: float = 2.4, idx_tau: float = 0.22, tau: float = 1.0
) -> np.ndarray:
    """جرسٌ بالتعديل التردّديّ (FM): مؤشّرٌ يضمحلّ سريعًا فيلمع الهجوم ويصفو الذيل؛ ومحصورٌ تحت 11 kHz."""
    f = mtof(midi)
    n = ns(dur)
    t = tvec(n)
    idx = min(index, max(0.25, (11000.0 / f - 1.0) / ratio - 0.6)) * np.exp(-t / idx_tau) + 0.1
    mod = np.sin(2 * np.pi * f * ratio * t)
    y = np.sin(2 * np.pi * f * t + idx * mod) + 0.16 * np.sin(2 * np.pi * 2.0 * f * t + 0.5 * idx * mod)
    return norm(y * np.minimum(1.0, t / 0.0015) * np.exp(-t / tau) * fades(n, 0.0, 0.05))


GLOCK = ((1.0, 1.0, 1.0), (2.756, 0.38, 0.42), (5.404, 0.16, 0.22), (8.933, 0.06, 0.12))  # قضيبٌ حرّ الطرفين


def glock(rng: np.random.Generator, midi: int, dur: float = 1.6, tau: float = 1.1, top_hz: float = 11000.0) -> np.ndarray:
    """جرسٌ زجاجيّ (غلوكنشبيل): أربعة أجزاءٍ غير توافقية تضمحلّ العليا منها أسرع."""
    f = mtof(midi)
    n = ns(dur)
    t = tvec(n)
    y = np.zeros(n)
    for r, a, d in GLOCK:
        if f * r < top_hz:
            y += a * np.sin(2 * np.pi * f * r * t + rng.random() * 2 * np.pi) * np.exp(-t / (tau * d))
    return norm(y * np.minimum(1.0, t / 0.0008) * fades(n, 0.0, 0.05))


def chime(rng: np.random.Generator) -> np.ndarray:
    """جرس عودة الاسم (21.6): خامسةٌ زجاجية D6/A6 فوق جسمٍ FM على D5."""
    a = stereo(glock(rng, 86, dur=3.2, tau=2.2), -0.25)
    b = stereo(glock(rng, 93, dur=3.2, tau=1.9), 0.25)
    c = stereo(fm_bell(74, dur=3.2, ratio=2.0, index=1.2, idx_tau=0.3, tau=1.6))
    return norm(0.8 * a + 0.55 * b + 0.45 * c)


def shimmer(rng: np.random.Generator, dur: float = 1.3, turns: float = 2.0) -> np.ndarray:
    """بريقٌ «لولبي»: ضجيجٌ ضيّق النطاق يصعد تردّده (1.8→9 kHz) ويدور بين السمّاعتين."""
    n = ns(dur)
    u = tvec(n) / dur
    x = sweep(rng.standard_normal(n), "bp", 1800.0 * (9000.0 / 1800.0) ** u, q=3.0)
    x *= np.sin(0.5 * np.pi * np.clip(u / 0.75, 0.0, 1.0)) ** 2 * fades(n, 0.0, 0.3)
    return norm(bw(pan_path(x, 0.7 * np.sin(2 * np.pi * turns * u)), "lp", 10500.0))


def drone(rng: np.random.Generator, dur: float) -> np.ndarray:
    """طنينٌ منخفض على ري للصياغة: منشاران على D2 وخامسةٌ خافتة، يتصاعد مرشّحه ومستواه حتى الاكتمال."""
    n = ns(dur)
    t = tvec(n)
    u = t / dur
    d1, d2, a2 = mtof(26), mtof(38), mtof(45)
    x = 0.5 * saw(d2 * 2 ** (-6 / 1200), n, rng.random()) + 0.5 * saw(d2 * 2 ** (6 / 1200), n, rng.random())
    x += 0.3 * saw(a2, n, rng.random())
    x = sweep(x, "lp", 200.0 + 650.0 * u**1.7 + 50.0 * np.sin(2 * np.pi * 0.8 * t), q=1.2, block=64, stages=2)
    x = 0.8 * norm(x) + 0.35 * sine(d1, n) + 0.3 * sine(d2, n)
    return norm(x * dbg(-9.0) ** ((1.0 - u) ** 1.2) * fades(n, 0.08, 0.004))


def sub_note(midi: int, dur: float, attack: float = 0.25, release: float = 1.2) -> np.ndarray:
    n = ns(dur + release)
    x = sine(mtof(midi), n)
    return (np.tanh(1.2 * x) / np.tanh(1.2)) * fades(n, attack, release)


# ═══════════════════════════════════════ الفضاء ═══════════════════════════════════════


def reverb_ir(rng: np.random.Generator, seconds: float = 2.2) -> np.ndarray:
    """استجابةُ صدىً مولَّدة (ستيريو، ≈2.2 ث): خمسة نطاقاتٍ تضمحلّ العليا منها أسرع، فالصدى دافئٌ لا يلمع."""
    n = ns(seconds)
    t = tvec(n)
    bands = ((20.0, 250.0, 2.2), (250.0, 1000.0, 2.0), (1000.0, 3000.0, 1.7), (3000.0, 6500.0, 1.25), (6500.0, 12000.0, 0.85))
    ir = np.zeros((n, 2))
    for ch in range(2):
        noise = rng.standard_normal(n)
        for lo, hi, t60 in bands:
            ir[:, ch] += bw(noise, "bp", (lo, hi)) * 10.0 ** (-3.0 * t / t60)
    pre = ns(0.016)
    ir = np.vstack([np.zeros((pre, 2)), ir[:-pre]])
    ir *= (np.clip((t - 0.016) / 0.03, 0.0, 1.0) ** 1.5)[:, None]
    for ch in range(2):  # انعكاساتٌ مبكّرة متفرّقة
        for _ in range(8):
            tk = 0.008 + 0.06 * rng.random()
            ir[ns(tk), ch] += (3.0 + 2.0 * rng.random()) * np.exp(-tk / 0.05) * (1.0 if rng.random() < 0.5 else -1.0)
    ir *= fades(n, 0.0, 0.1)[:, None]
    return ir / np.sqrt(np.sum(ir**2) / 2.0)


def convolve_st(x: np.ndarray, ir: np.ndarray, cross: float = 0.15) -> np.ndarray:
    left = (1.0 - cross) * x[:, 0] + cross * x[:, 1]
    right = (1.0 - cross) * x[:, 1] + cross * x[:, 0]
    return np.stack([signal.fftconvolve(left, ir[:, 0]), signal.fftconvolve(right, ir[:, 1])], axis=1)


def reverse_reverb(dry: np.ndarray, ir: np.ndarray, length: float) -> np.ndarray:
    """صدىً معكوس: ذيلُ الصوت مقلوبًا ينتفخ وينتهي عند لحظته."""
    src = convolve_st(dry, ir)
    src[: dry.shape[0]] += 0.35 * dry
    seg = src[::-1][-ns(length) :].copy()
    return norm(seg * fades(seg.shape[0], length * 0.35, 0.003)[:, None])


def ping_pong(x: np.ndarray, delay: float, fb: float, taps: int = 6) -> np.ndarray:
    """تأخيرٌ متناوب بين السمّاعتين، وكل ارتدادٍ أدكن من سابقه."""
    mono = x.mean(axis=1) if x.ndim == 2 else x
    n = mono.shape[0]
    d = ns(delay)
    out = np.zeros((n, 2))
    sos = signal.butter(1, [320.0, 4200.0], btype="bandpass", fs=SR, output="sos")
    y = mono
    for k in range(1, taps + 1):
        y = signal.sosfilt(sos, y) * fb
        s = k * d
        if s >= n:
            break
        out[s:, (k - 1) % 2] += y[: n - s]
    return out


def duck(hits: list[float], depth_db: float, release: float) -> np.ndarray:
    """ضغطٌ جانبيّ (sidechain): ينخفض المسار عند كل ضربة طبل ثم يعود — «النبض» العصريّ."""
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


# ══════════════════════════════════════ التوزيع ══════════════════════════════════════


class Mixer:
    """مساراتٌ ستيريو بطول القطعة كلّها؛ `add` يضع الصوت عند لحظته بمستواه وموضعه."""

    def __init__(self) -> None:
        self.bus: dict[str, np.ndarray] = {}

    def add(self, name: str, sig: np.ndarray, t0: float, db: float = 0.0, pan: float = 0.0) -> None:
        buf = self.bus.setdefault(name, np.zeros((N, 2)))
        st = stereo(sig, pan) * dbg(db)
        i = ns(t0)
        if i < 0:
            st, i = st[-i:], 0
        j = min(N, i + st.shape[0])
        buf[i:j] += st[: j - i]


def part_of(t: float) -> str:
    return "A" if t < GROOVE_B else ("B" if t < BUILD else "build")


def build_u(t: float) -> float:
    """تقدّم التصاعد 0→1 بين 12.5 و16.5."""
    return float(np.clip((t - BUILD) / (DROP - BUILD), 0.0, 1.0))


def arp_cutoff(t: float) -> float:
    """أتمتة مرشّح الأربيجو: ينفتح عبر المقطع الأوّل، يثبت في الثاني، ويُغلق ثم ينفجر في التصاعد."""
    part = part_of(t)
    if part == "A":
        return 1000.0 * (2200.0 / 1000.0) ** ((t - HIT) / (GROOVE_B - HIT))
    if part == "B":
        return 2400.0 * (3000.0 / 2400.0) ** ((t - GROOVE_B) / (BUILD - GROOVE_B))
    return 900.0 * (6500.0 / 900.0) ** (build_u(t) ** 1.5)


def arp_gain_db(t: float) -> float:
    part = part_of(t)
    if part == "A":
        return -6.0 + 4.0 * min(1.0, (t - HIT) / BAR)
    return -2.0 if part == "B" else -1.0 + 2.0 * build_u(t)


def bass_tone(t: float) -> tuple[float, float]:
    part = part_of(t)
    if part == "A":
        return 300.0, 900.0
    if part == "B":
        return 380.0, 1200.0
    return 320.0 + 380.0 * build_u(t), 1300.0


def pad_cutoff_curve() -> np.ndarray:
    t = tvec(N)
    fc = np.full(N, 1600.0)
    a = (t >= HIT) & (t < GROOVE_B)
    fc[a] = 1800.0 * (2800.0 / 1800.0) ** ((t[a] - HIT) / (GROOVE_B - HIT))
    b = (t >= GROOVE_B) & (t < BUILD)
    fc[b] = 3000.0
    c = t >= BUILD
    fc[c] = 1500.0 * (7000.0 / 1500.0) ** (np.clip((t[c] - BUILD) / (DROP - BUILD), 0.0, 1.0) ** 1.6)
    return fc


def converge_hp_curve() -> np.ndarray:
    """تقارب الضوء (15.5→16.5): مرشّحٌ عالي التمرير يصعد فيرقّ الصوت قبل الفراغ."""
    u = np.clip((tvec(N) - CONVERGE) / (DROP - CONVERGE), 0.0, 1.0)
    return 30.0 * (1200.0 / 30.0) ** (u**1.3)


def arrange(ir: np.ndarray) -> tuple[Mixer, Mixer, list[float]]:
    """القطعة لحظةً لحظة. `pre` كلّ ما قبل الفراغ (يُقطع عند 16.5 بصدّاه)، و`post` ما بعده."""
    pre, post = Mixer(), Mixer()
    kicks: list[float] = []

    def kick_at(t: float, db: float) -> None:
        pre.add("kick", kick(rng_for(f"kick/{t:.3f}")), t, db)
        kicks.append(t)

    # ── 0.0–0.5 الاشتعال: صنجٌ معكوس وصدى وترٍ مقلوب يصعدان إلى الضربة ──
    pre.add("cymbal", reverse_cymbal(rng_for("pickup/cymbal"), HIT), 0.0, -13.0)
    burst = chord_stab(rng_for("pickup/chord"), STAB_DM, dur=0.5, bright=0.8, tau=0.2)
    pre.add("fx", reverse_reverb(burst, ir, HIT), 0.0, -10.0)

    # ── 0.5 الضربة: طبلٌ وانحدارٌ عميق وصنجٌ ووترُ ري الصغير ساطعًا ──
    kick_at(HIT, -1.0)
    pre.add("impact", boom(rng_for("hit/boom"), f_hi=110.0, f_lo=38.0, tau_f=0.22, tau_a=0.5, dur=1.8), HIT, -7.0)
    pre.add("cymbal", crash(rng_for("hit/crash")), HIT, -10.0)
    pre.add("stab", chord_stab(rng_for("hit/stab"), STAB_DM, dur=1.8), HIT, -2.0)

    # ── المونتاج: ثماني مازورات على الشبكة (A: 0.5–8.5 · B: 8.5–12.5 · التصاعد: 12.5–16.5) ──
    for k, name in enumerate(PROGRESSION):
        t0 = BARS[k]
        part = part_of(t0)
        pre.add("pad", chord_pad(rng_for(f"pad/{k}"), PAD[name], BAR, attack=0.02 if k == 0 else 0.05), t0, -2.0)

        if part == "A":  # نصف الإيقاع: الطبل على القطعات (كل ثانية) ودفعةٌ قبل المازورة التالية
            kick_s, clap_s = ([0, 8] if k % 2 == 0 else [0, 8, 14]), []
            hat_s, open_s = (list(range(16)) if k >= 1 else []), []
        elif part == "B":  # أربعٌ على الأرض (على كل قطع)، وتصفيقٌ على 2 و4، وصنجٌ مفتوح على «&»
            kick_s, clap_s = [0, 4, 8, 12], [4, 12]
            hat_s, open_s = [s for s in range(16) if s % 4 != 2], [2, 6, 10, 14]
        else:
            kick_s, clap_s = [0, 4, 8, 12], ([4, 12] if t0 + BAR <= CONVERGE else [])
            hat_s, open_s = list(range(16)), []

        for s in kick_s:
            t = t0 + s * STEP
            if t < CONVERGE and t != HIT:
                kick_at(t, -2.0)
        for s in clap_s:
            pre.add("clap", clap(rng_for(f"clap/{k}/{s}")), t0 + s * STEP, 0.0)
        jitter = rng_for(f"hatvel/{k}")
        for s in hat_s:
            t = t0 + s * STEP
            if t < CONVERGE:
                vel = HAT_VEL[s % 4] * (1.0 + 0.08 * (jitter.random() - 0.5))
                pre.add("hats", hat(rng_for(f"hat/{k}/{s}")), t, -10.0 + 20.0 * np.log10(vel), pan=0.12 if s % 2 else -0.12)
        for s in open_s:
            pre.add("hats", hat(rng_for(f"ohat/{k}/{s}"), open_=True), t0 + s * STEP, -11.0, pan=0.15)

        for s in range(16):  # الجهير الراكض: يصمت على النبضة (حيث الطبل) ويعدو على e & a
            t = t0 + s * STEP
            if s % 4 == 0 or t >= CONVERGE:
                continue
            vel = (0.8, 1.0, 0.85)[s % 4 - 1]
            cutoff, env_amt = bass_tone(t)
            note = bass_note(rng_for(f"bass/{k}/{s}"), BASS[name], STEP * 0.84, vel, cutoff, env_amt)
            pre.add("bass", note, t, -6.0)

        octave = 12 if part == "B" else 0
        for s in range(16):  # الأربيجو بالسادس عشر
            t = t0 + s * STEP
            vel = 1.0 if s % 4 == 0 else (0.86 if s % 2 == 0 else 0.74)
            note = pluck(rng_for(f"arp/{k}/{s}"), ARP[name][ARP_STEPS[s]] + octave, STEP * 0.92, vel, arp_cutoff(t))
            pre.add("arp", note, t, arp_gain_db(t))

    # ── ومضة 4.5: صنجٌ معكوسٌ خافت وصنجٌ صغير ──
    pre.add("cymbal", reverse_cymbal(rng_for("rev/4.5"), 1.0), FLASHES[1] - 1.0, -19.0)
    pre.add("cymbal", crash(rng_for("splash/4.5"), dur=1.6, tau=0.4, hp=3400.0), FLASHES[1], -15.0)

    # ── إلى المقطع الثاني (8.5): صنجٌ معكوس وثلاث ضرباتٍ صاعدة ثم صنج ──
    pre.add("cymbal", reverse_cymbal(rng_for("rev/8.5"), 1.0), GROOVE_B - 1.0, -15.0)
    for i, (dt, v) in enumerate(((-0.375, 0.45), (-0.25, 0.6), (-0.125, 0.8))):
        pre.add("snare", snare(rng_for(f"fill/{i}")), GROOVE_B + dt, -7.0 + 20.0 * np.log10(v))
    pre.add("cymbal", crash(rng_for("crash/8.5")), GROOVE_B, -11.0)

    # ── التصاعد (12.5–16.5): صنج، وصاعدُ ضجيج، ودحرجةٌ بالأثمان ثم بالسادس عشر تعلو وتحتدّ ──
    pre.add("cymbal", crash(rng_for("crash/12.5")), BUILD, -11.0)
    pre.add("fx", riser(rng_for("riser"), DROP - BUILD), BUILD, -2.0)
    roll = [BUILD + i * 2 * STEP for i in range(8)] + [BUILD + BAR + i * STEP for i in range(16)]
    for i, t in enumerate(roll):
        u = i / (len(roll) - 1)
        pre.add("snare", snare(rng_for(f"roll/{i}"), pitch=1.0 + 0.3 * u, tau_n=0.11 - 0.045 * u), t, -11.0 + 12.0 * u)

    # ── هبّاتٌ خفيفة على القطعات (لا على الومضات ولا على الفراغ) ──
    for i, c in enumerate(CUTS[:-1]):
        if c in FLASHES:
            continue
        dense = c >= GROOVE_B
        dur = 0.18 if dense else 0.28
        side = 0.6 if i % 2 else -0.6
        w = whoosh(rng_for(f"whoosh/{i}"), dur, dur * 0.62, side, -side)
        pre.add("fx", w, c - dur * 0.62, -17.0 if dense else -12.0)

    # ── 16.5 الفراغ: ضربةٌ عميقة وحدها، ثم صنجٌ معكوس وصدى جرسٍ مقلوب على ري ينتفخان إلى الليزر ──
    collapse = FORGE["collapseEnd"]
    post.add("impact", boom(rng_for("drop/boom")), DROP, -3.0)
    post.add("cymbal", reverse_cymbal(rng_for("drop/rev"), collapse - DROP), DROP, -14.0)
    bell = stereo(fm_bell(74, dur=0.8, ratio=3.5, index=2.0, tau=0.5))
    post.add("fx", reverse_reverb(bell, ir, collapse - DROP), DROP, -15.0)

    # ── 17.0–19.5 الصياغة: طنين ري، وأربع رشقات ليزر على النبضات، ومسحٌ صاعد ──
    post.add("drone", drone(rng_for("drone"), IMPACT - collapse + 0.05), collapse - 0.05, -5.0)
    for i, t in enumerate(FORGE["lasers"]):
        post.add("zap", zap(rng_for(f"zap/{i}"), f_hi=3000.0 + 420.0 * i), t, -2.0, pan=(-0.3, 0.3, -0.18, 0.18)[i])
    scan = FORGE["scanFrom"]
    post.add("fx", scan_riser(rng_for("scan"), IMPACT - scan, scan), scan, -4.0)

    # ── 19.5 الاكتمال: الضربة الكبرى وصنجٌ ووترُ ري الكبير الساطع ──
    post.add("impact", impact(rng_for("impact")), IMPACT, -2.0)
    post.add("cymbal", crash(rng_for("crash/19.5"), dur=3.0, tau=0.9), IMPACT, -9.0)
    post.add("stab", chord_stab(rng_for("stab/D"), STAB_D, dur=2.4, bright=1.2, tau=0.6), IMPACT, -2.0)

    # ── 19.5–24 الانفراج: بساط D add9 وجيبٌ تحتيّ، وأجراسٌ متتابعة، وجرسُ عودة الاسم عند 21.6 ──
    hold = FILM_SECONDS - IMPACT
    post.add("pad", chord_pad(rng_for("pad/D"), RESOLVE, hold, attack=0.6, release=1.8, detune=11.0), IMPACT, -3.5)
    post.add("bass", sub_note(BASS["Dm"], hold), IMPACT, -13.0)
    for i, (t, m, v) in enumerate(BELLS):
        post.add("bells", fm_bell(m, dur=2.2, tau=1.1), t, -13.0 + 20.0 * np.log10(v), pan=0.35 if i % 2 else -0.35)
    post.add("bells", chime(rng_for("chime")), TEXT_REVEAL, -5.0)

    # ── 23.0–23.9 اللمعة: أجراسٌ صاعدة من الأسفل إلى الأعلى، وبريقٌ يدور ويصعد ──
    for i, m in enumerate(GLITTER):
        u = i / (len(GLITTER) - 1)
        t = SHINE + u * (GLITTER_END - SHINE)
        tone = glock(rng_for(f"glitter/{i}"), m, dur=2.0, tau=0.9 + 0.5 * u)
        post.add("bells", tone, t, -16.0 + 3.0 * u, pan=0.55 * (0.3 + 0.7 * u) * (1 if i % 2 else -1))
    post.add("fx", shimmer(rng_for("shimmer")), SHINE, -20.0)
    return pre, post, kicks


def process(pre: Mixer, post: Mixer, kicks: list[float]) -> None:
    """معالجة المسارات: أتمتة المرشّحات، والتأخير، والضغط الجانبيّ، وإزالة الطين تحت ≈120 Hz من غير الجهير."""
    b = pre.bus
    hp_curve = converge_hp_curve()
    b["pad"] = sweep(b["pad"], "lp", pad_cutoff_curve(), q=0.75, block=64, stages=2)
    b["pad"] = sweep(bw(b["pad"], "hp", 150.0), "hp", hp_curve, block=64)
    arp = bw(b["arp"], "hp", 180.0)
    arp = arp + dbg(-5.0) * ping_pong(arp, 3 * STEP, 0.38)
    b["arp"] = sweep(arp, "hp", hp_curve, block=64)
    b["pad"] *= duck(kicks, 6.0, 0.32)[:, None]
    b["arp"] *= duck(kicks, 2.5, 0.22)[:, None]
    b["bass"] *= duck(kicks, 12.0, 0.14)[:, None]
    for name, f in (("stab", 120.0), ("fx", 150.0), ("snare", 120.0), ("clap", 250.0)):
        b[name] = bw(b[name], "hp", f)

    p = post.bus
    lfo = 2300.0 + 450.0 * np.sin(2 * np.pi * 0.2 * (tvec(N) - IMPACT))
    p["pad"] = bw(sweep(p["pad"], "lp", lfo, q=0.7, block=64), "hp", 100.0)
    p["zap"] = p["zap"] + dbg(-9.0) * ping_pong(p["zap"], 2 * STEP, 0.3, taps=3)
    p["bells"] = bw(bw(p["bells"], "hp", 250.0), "lp", 11000.0)
    for name, f in (("stab", 120.0), ("fx", 150.0)):
        p[name] = bw(p[name], "hp", f)


def render(mix: Mixer, ir: np.ndarray) -> np.ndarray:
    """جمع المسارات الجافّة مع إرسالها إلى صدىً واحد؛ عودة الصدى بين 200 Hz و8 kHz (دافئة بلا طين)."""
    dry = np.zeros((N, 2))
    send = np.zeros((N, 2))
    for name, x in mix.bus.items():
        dry += x
        if SENDS[name] is not None:
            send += x * dbg(SENDS[name])
    wet = convolve_st(send, ir)[:N]
    return dry + bw(bw(wet, "hp", 200.0), "lp", 8000.0)


RIDE = [  # (ث، dB) قوس المونتاج: الأوّل أهدأ، والثاني أعلى، والتصاعد يعلو حتى الفراغ
    (0.0, -1.5),
    (GROOVE_B - 0.02, -1.5),
    (GROOVE_B, 0.0),
    (BUILD - 0.02, 0.0),
    (BUILD, -0.5),
    (DROP - 0.1, 1.5),
    (DROP, 1.5),
]


def ride() -> np.ndarray:
    t = tvec(N)
    return 10.0 ** (np.interp(t, [p[0] for p in RIDE], [p[1] for p in RIDE]) / 20.0)


def drop_gate() -> np.ndarray:
    """الفراغ عند 16.5: كل ما قبله يُقطع بصدّاه في 4 ms."""
    g = np.ones(N)
    i, f = ns(DROP), ns(0.004)
    g[i - f : i] = 0.5 + 0.5 * np.cos(np.pi * (np.arange(f) + 1) / f)
    g[i:] = 0.0
    return g


# ═══════════════════════════════════ الإتقان (master) ═══════════════════════════════════


def k_weight(x: np.ndarray) -> np.ndarray:
    """ترشيح K لقياس الجهارة (ITU-R BS.1770-4) عند 48 kHz."""
    b1 = [1.53512485958697, -2.69169618940638, 1.19839281085285]
    a1 = [1.0, -1.69065929318241, 0.73248077421585]
    b2 = [1.0, -2.0, 1.0]
    a2 = [1.0, -1.99004745483398, 0.99007225036621]
    return signal.lfilter(b2, a2, signal.lfilter(b1, a1, x, axis=0), axis=0)


def lufs(x: np.ndarray) -> float:
    """الجهارة المتكاملة (LUFS) بالبوّابتين: المطلقة −70 والنسبية −10 LU."""
    p = np.sum(k_weight(x) ** 2, axis=1)
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
    """ما تحت 120 Hz أحاديّ: الفرق (Side) يُمرَّر من فوقه وحده (بلا إزاحة طور)."""
    mid, side = 0.5 * (x[:, 0] + x[:, 1]), 0.5 * (x[:, 0] - x[:, 1])
    side = signal.sosfiltfilt(signal.butter(4, fc, btype="highpass", fs=SR, output="sos"), side)
    return np.stack([mid + side, mid - side], axis=1)


def glue(x: np.ndarray, thr_db: float = -18.0, ratio: float = 1.7, knee_db: float = 8.0) -> tuple[np.ndarray, float]:
    """ضاغطُ «لاصق» لطيف على المجموع (RMS 10 ms، هجوم 15 ms، تحرير 200 ms، ركبةٌ ليّنة)."""
    n, hop = x.shape[0], 32
    p = np.mean(x**2, axis=1)
    w = ns(0.01)
    cs = np.concatenate([[0.0], np.cumsum(p)])
    idx = np.arange(n)
    lo, hi = np.maximum(0, idx - w // 2), np.minimum(n, idx + w // 2)
    level = 10.0 * np.log10((cs[hi] - cs[lo]) / (hi - lo) + 1e-12) + 3.01
    over = level - thr_db
    slope = 1.0 - 1.0 / ratio
    gr = np.where(
        over <= -knee_db / 2,
        0.0,
        np.where(over >= knee_db / 2, over * slope, slope * (over + knee_db / 2) ** 2 / (2 * knee_db)),
    )[::hop]
    att, rel = np.exp(-hop / (0.015 * SR)), np.exp(-hop / (0.2 * SR))
    sm = np.empty_like(gr)
    s = 0.0
    for i, v in enumerate(gr):
        c = att if v > s else rel
        s = c * s + (1.0 - c) * v
        sm[i] = s
    gr_full = np.interp(idx, np.arange(0, n, hop), sm)
    return x * (10.0 ** (-gr_full / 20.0))[:, None], float(np.max(gr_full))


def limiter(x: np.ndarray, ceiling_db: float, lookahead: float = 0.004, release: float = 0.08) -> tuple[np.ndarray, float]:
    """محدِّدٌ بنظرٍ مسبق على القمّة الحقيقية (×4): الكسب عند كل قمّة ≤ ما تحتاجه، فلا تجاوز للسقف."""
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
    x = biquad(bw(x, "hp", 22.0), "hshelf", 9000.0, 0.7, -1.5)
    x = bw(biquad(x, "peak", 3000.0, 0.8, 1.0), "lp", 16500.0, 4)
    x = x / np.max(np.abs(x)) * dbg(-6.0)
    x, glue_gr = glue(x)
    gain = TARGET_LUFS - lufs(x)
    for _ in range(6):
        y, lim_gr = limiter(x * dbg(gain), CEILING_DBTP)
        err = TARGET_LUFS - lufs(y)
        if abs(err) < 0.03:
            break
        gain += err
    fade = np.ones(N)
    a, b = ns(TOTAL - 1.0), ns(TOTAL - 0.01)
    fade[a:b] = 0.5 + 0.5 * np.cos(np.pi * np.arange(b - a) / (b - a))
    fade[b:] = 0.0
    y = y * fade[:, None]
    return y, {"glue_max_gr_db": round(glue_gr, 2), "limiter_max_gr_db": round(lim_gr, 2), "gain_db": round(gain, 2)}


# ═══════════════════════════════════════ القياس ═══════════════════════════════════════

SECTIONS = [
    ("pickup", 0.0, HIT),
    ("grooveA", HIT, GROOVE_B),
    ("grooveB", GROOVE_B, BUILD),
    ("build", BUILD, DROP),
    ("drop", DROP, FORGE["collapseEnd"]),
    ("forge", FORGE["collapseEnd"], IMPACT),
    ("resolve", IMPACT, SHINE),
    ("glitter", SHINE, float(FILM_SECONDS)),
    ("tail", float(FILM_SECONDS), TOTAL),
]
FULL, LOW = (0.0, 24000.0), (20.0, 250.0)  # نطاق الكشف: الضربة العميقة تُقاس في نطاقها
CUES = (
    [(HIT, "hit: kick + sub + crash + Dm stab", FULL)]
    + [(c, "cut: kick", FULL) for c in CUTS[1:] if c not in FLASHES and c < CONVERGE]
    + [(CONVERGE, "cut: snare roll 16th (kick out)", FULL)]
    + [(FLASHES[1], "flash: kick + splash", FULL), (GROOVE_B, "groove B: crash + 4-on-floor", FULL)]
    + [(BUILD, "build: crash + roll", FULL), (DROP, "drop: sub boom after silence", LOW)]
    + [(t, f"laser zap {i + 1}", FULL) for i, t in enumerate(FORGE["lasers"])]
    + [(IMPACT, "impact + D major stab", FULL), (TEXT_REVEAL, "chime (TEXT_REVEAL)", FULL)]
    + [(SHINE, "glitter start", FULL)]
)
BANDS = ((20, 60), (60, 120), (120, 250), (250, 500), (500, 2000), (2000, 6000), (6000, 10000), (10000, 24000))


def section_stats(x: np.ndarray) -> list[dict]:
    rows = []
    for name, a, b in SECTIONS:
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
                "section": name,
                "from": a,
                "to": b,
                "rms_dbfs": round(20 * np.log10(np.sqrt(np.mean(seg**2)) + 1e-20), 2),
                "peak_dbfs": round(20 * np.log10(np.max(np.abs(seg)) + 1e-20), 2),
                "band_share_db": bands,
                "side_vs_mid_below_100hz_db": round(10 * np.log10((np.sum(p_side[low]) + 1e-30) / (np.sum(p_mid[low]) + 1e-30)), 1),
                # ما يخسره الجمع الأحاديّ (L+R)/2 من الجهارة — كبيرُه علامةُ تعارضٍ طوريّ بين القناتين
                "mono_fold_loss_db": round(lufs(np.repeat(mono[:, None], 2, axis=1)) - lufs(seg), 2),
            }
        )
    return rows


def onset_spectrum(x: np.ndarray, nfft: int = 1024, hop: int = 48) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """مقدار الطيف بإطاراتٍ متمركزة (21 ms، خطوة 1 ms)."""
    mono = x.mean(axis=1)
    frames = np.lib.stride_tricks.sliding_window_view(np.pad(mono, (nfft // 2, nfft)), nfft)[::hop]
    mag = np.abs(np.fft.rfft(frames[: mono.size // hop + 1] * np.hanning(nfft), axis=1))
    return np.arange(mag.shape[0]) * hop / SR, np.fft.rfftfreq(nfft, 1.0 / SR), mag


def onsets(x: np.ndarray) -> list[dict]:
    """التدفّق الطيفيّ (spectral flux) بالمقدار الخطّيّ داخل نطاق كل إشارة: قمّته عند بداية الحدث.
    (المقدار اللوغاريتميّ يكافئ تموّج الضجيج الصاعد قبل الإشارة فيبكّر الكشف — قِيس وتُرك.)"""
    times, freqs, mag = onset_spectrum(x)
    rows = []
    for cue, what, (lo, hi) in sorted(CUES):
        band = mag[:, (freqs >= lo) & (freqs < hi)]
        flux = np.concatenate([[0.0], np.maximum(0.0, np.diff(band, axis=0)).sum(axis=1)])
        w = (times >= cue - 0.05) & (times <= cue + 0.05)
        i = np.flatnonzero(w)[np.argmax(flux[w])]
        ctx = flux[(times >= cue - 0.5) & (times <= cue + 0.5)]
        rows.append(
            {
                "cue_s": cue,
                "what": what,
                "band_hz": [lo, hi],
                "detected_s": round(float(times[i]), 4),
                "delta_ms": round(1000.0 * float(times[i] - cue), 1),
                "salience": round(float(flux[i] / (np.median(ctx) + 1e-9)), 1),
            }
        )
    return rows


def run(*cmd: str) -> subprocess.CompletedProcess:
    return subprocess.run(list(cmd), check=True, capture_output=True, text=True)


def ebur128(path: Path) -> dict:
    log = run("ffmpeg", "-hide_banner", "-nostdin", "-i", str(path), "-af", "ebur128=peak=true", "-f", "null", "-").stderr
    tail = log[log.rfind("Summary:") :]

    def grab(pat: str) -> float:
        return float(re.search(pat, tail).group(1))

    return {
        "integrated_lufs": grab(r"I:\s+(-?[\d.]+) LUFS"),
        "lra_lu": grab(r"LRA:\s+(-?[\d.]+) LU"),
        "true_peak_dbtp": grab(r"Peak:\s+(-?[\d.]+) dBFS"),
    }


def decode(path: Path) -> np.ndarray:
    raw = subprocess.run(
        ["ffmpeg", "-hide_banner", "-nostdin", "-i", str(path), "-f", "f32le", "-ac", "2", "-ar", str(SR), "-"],
        check=True,
        capture_output=True,
    ).stdout
    return np.frombuffer(raw, dtype="<f4").reshape(-1, 2).astype(float)


def probe(path: Path) -> dict:
    out = run(
        "ffprobe", "-v", "error", "-show_entries",
        "format=duration,size,bit_rate:format_tags:stream=codec_name,profile,sample_rate,channels,bit_rate:stream_tags",
        "-of", "json", str(path),
    ).stdout  # fmt: skip
    return json.loads(out)


def encode(wav: Path, media: Path) -> tuple[Path, Path]:
    """AAC-LC ‏128k (‏+faststart) وOpus ‏112k، صوتٌ وحده، وبلا وسومٍ سوى العنوان."""
    media.mkdir(parents=True, exist_ok=True)
    m4a, webm = media / "sadeed-film-score.m4a", media / "sadeed-film-score.webm"
    common = [
        "ffmpeg", "-hide_banner", "-nostdin", "-y", "-i", str(wav), "-map", "0:a:0", "-vn", "-sn", "-dn",
        "-map_metadata", "-1", "-map_chapters", "-1", "-metadata", f"title={TITLE}",
        "-fflags", "+bitexact", "-flags:a", "+bitexact", "-ar", str(SR), "-ac", "2",
    ]  # fmt: skip
    run(*common, "-c:a", "aac", "-profile:a", "aac_low", "-b:a", "128k", "-movflags", "+faststart", str(m4a))
    run(*common, "-c:a", "libopus", "-b:a", "112k", "-vbr", "constrained", "-compression_level", "10", "-write_crc32", "0", str(webm))
    strip_webm_tags(webm)
    return m4a, webm


def _ebml_id(buf: bytes, i: int) -> tuple[int, int]:
    n = 1
    while not buf[i] & (0x80 >> (n - 1)):
        n += 1
    return int.from_bytes(buf[i : i + n], "big"), n


def _ebml_size(buf: bytes, i: int) -> tuple[int, int, bool]:
    n = 1
    while not buf[i] & (0x80 >> (n - 1)):
        n += 1
    value = int.from_bytes(buf[i : i + n], "big") & ((1 << (7 * n)) - 1)
    return value, n, value == (1 << (7 * n)) - 1


def _ebml_void(total: int) -> bytes:
    """عنصر Void (‏0xEC) بالطول الكلّيّ نفسه — فلا تتزحزح أيّ إزاحةٍ في الملفّ."""
    if total - 2 <= 126:
        return bytes([0xEC, 0x80 | (total - 2)]) + bytes(total - 2)
    return bytes([0xEC, 0x01]) + (total - 9).to_bytes(7, "big") + bytes(total - 9)


def strip_webm_tags(path: Path) -> None:
    """يُفرَّغ عنصر Tags (‏ENCODER/DURATION لكل مسار) ومدخله في SeekHead إلى Void بالحجم نفسه.
    واجهة ffmpeg تعيد كتابة وسم ENCODER ولو طُلب حذفه؛ والعنوان باقٍ في Info (‏Title)."""
    buf = bytearray(path.read_bytes())
    eid, il = _ebml_id(buf, 0)
    size, sl, _ = _ebml_size(buf, il)
    i = il + sl + size  # بعد ترويسة EBML
    eid, il = _ebml_id(buf, i)
    if eid != 0x18538067:
        raise ValueError("not a Matroska segment")
    size, sl, unknown = _ebml_size(buf, i + il)
    j, end = i + il + sl, len(buf) if unknown else i + il + sl + size
    while j < end:
        eid, il = _ebml_id(buf, j)
        size, sl, _ = _ebml_size(buf, j + il)
        total = il + sl + size
        if eid == 0x1254C367:  # Tags
            buf[j : j + total] = _ebml_void(total)
        elif eid == 0x114D9B74:  # SeekHead
            k, stop = j + il + sl, j + total
            while k < stop:
                cid, cil = _ebml_id(buf, k)
                csize, csl, _ = _ebml_size(buf, k + cil)
                ctotal = cil + csl + csize
                if cid == 0x4DBB and b"\x53\xab\x84\x12\x54\xc3\x67" in bytes(buf[k : k + ctotal]):
                    buf[k : k + ctotal] = _ebml_void(ctotal)
                k += ctotal
        j += total
    path.write_bytes(bytes(buf))


def evidence(out: Path, wav: Path, y: np.ndarray, encoded: tuple[Path, Path] | None, meta: dict) -> dict:
    run(
        "ffmpeg", "-hide_banner", "-nostdin", "-y", "-i", str(wav), "-lavfi",
        "showspectrumpic=s=1600x600:legend=1:scale=log:fscale=lin:mode=combined:color=intensity",
        str(out / "spectrum.png"),
    )  # fmt: skip
    marks = sorted({HIT, GROOVE_B, BUILD, CONVERGE, DROP, FORGE["collapseEnd"], IMPACT, TEXT_REVEAL, SHINE, float(FILM_SECONDS)})
    lines = ",".join(f"drawbox=x={round(m / TOTAL * 1600)}:y=0:w=1:h=ih:color=0xffd27a@0.55:t=fill" for m in marks)
    run(
        "ffmpeg", "-hide_banner", "-nostdin", "-y", "-i", str(wav), "-filter_complex",
        "color=c=0x0b1530:s=1600x400:d=1[bg];"
        "[0:a]showwavespic=s=1600x400:split_channels=1:colors=0x6cc3ff|0x7fe3b0:scale=lin[w];"
        f"[bg][w]overlay=format=auto,{lines}",
        "-frames:v", "1", str(out / "wave.png"),
    )  # fmt: skip
    hits = onsets(y)
    report = {
        "file": str(wav.name),
        "sha256": hashlib.sha256(wav.read_bytes()).hexdigest(),
        "sample_rate": SR,
        "channels": 2,
        "duration_s": round(y.shape[0] / SR, 4),
        "measured_by_ffmpeg_ebur128": ebur128(wav),
        "measured_in_python": {"integrated_lufs": round(lufs(y), 2), "true_peak_dbtp_x4": round(true_peak_db(y), 2)},
        "sample_peak_dbfs": round(20 * np.log10(np.max(np.abs(y))), 2),
        "clipped_samples": int(np.sum(np.abs(y) >= 1.0)),
        "last_nonzero_sample_s": round(float(np.flatnonzero(np.any(y != 0.0, axis=1))[-1] / SR), 4),
        "sections": section_stats(y),
        "onsets": hits,
        "onset_max_abs_delta_ms": max(abs(r["delta_ms"]) for r in hits),
        "onsets_within_30ms": all(abs(r["delta_ms"]) <= 30.0 for r in hits),
        "mix": meta,
    }
    if encoded:
        report["encodes"] = {}
        for path in encoded:
            dec = decode(path)
            report["encodes"][path.name] = {
                "bytes": path.stat().st_size,
                "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
                "probe": probe(path),
                "measured_by_ffmpeg_ebur128": ebur128(path),
                "decoded_duration_s": round(dec.shape[0] / SR, 4),
                "decoded_clipped_samples": int(np.sum(np.abs(dec) >= 1.0)),
                "onset_delta_ms_max_abs": max(abs(r["delta_ms"]) for r in onsets(dec[:N] if dec.shape[0] >= N else np.pad(dec, ((0, N - dec.shape[0]), (0, 0))))),
            }
    (out / "analysis.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return report


# ═══════════════════════════════════════ التشغيل ═══════════════════════════════════════


def bus_loudness(mix: Mixer) -> dict:
    return {name: round(lufs(x), 1) for name, x in sorted(mix.bus.items()) if np.any(x)}


def main() -> None:
    ap = argparse.ArgumentParser(description="SADEED film score — original synthesis")
    ap.add_argument("--out", required=True, type=Path, help="مجلّد الإخراج (WAV والأدلة) — خارج المستودع")
    ap.add_argument("--encode", type=Path, metavar="MEDIA_DIR", help="يرمّز m4a وwebm في هذا المجلّد")
    ap.add_argument("--evidence", action="store_true", help="spectrum.png · wave.png · analysis.json")
    args = ap.parse_args()
    args.out.mkdir(parents=True, exist_ok=True)

    ir = reverb_ir(rng_for("reverb"))
    pre, post, kicks = arrange(ir)
    process(pre, post, kicks)
    levels = {"pre": bus_loudness(pre), "post": bus_loudness(post)}
    mix = render(pre, ir) * (ride() * drop_gate())[:, None] + render(post, ir)
    y, meta = master(mix)
    meta["bus_lufs_before_master"] = levels

    wav = args.out / WAV_NAME
    wavfile.write(wav, SR, y.astype(np.float32))
    (args.out / "score-meta.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"wav: {wav}  lufs={lufs(y):.2f}  tp={true_peak_db(y):.2f} dBTP  {json.dumps(meta, ensure_ascii=False)}")

    encoded = encode(wav, args.encode) if args.encode else None
    if encoded:
        for p in encoded:
            print(f"{p}: {p.stat().st_size} bytes")
    if args.evidence:
        report = evidence(args.out, wav, y, encoded, meta)
        print(json.dumps({k: report[k] for k in ("measured_by_ffmpeg_ebur128", "clipped_samples")}, ensure_ascii=False))


if __name__ == "__main__":
    main()
