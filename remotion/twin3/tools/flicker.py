#!/usr/bin/env python3
"""قياس الوميض بتطبيق تعريف WCAG 2.3.1 على إطارات الفيلم (تقريبيّ، ليس أداة رسمية).
تصغير إلى 320x180، sRGB->خطّي، إضاءة نسبيّة BT.709؛ لكلّ زوج إطارين متتاليين:
 - أقصى فرق في متوسّط الإضاءة النسبية للإطار.
 - أقصى نسبة بكسلات (في أيّ نافذة 25% من الإطار) تغيّرت إضاءتها النسبية >= 0.10 والأغمق < 0.80.
 - عدد الأزواج فوق عتبة 25%، وعدد «ومضات» الإشارة (تغيّر متوسّط الإضاءة المعاكس) خلال أيّ ثانية.
usage: flicker.py <input video or %04d.png pattern> """
import subprocess, sys, numpy as np
src = sys.argv[1]
W, H = 320, 180
cmd = ["ffmpeg", "-loglevel", "error", "-i", src, "-vf", f"scale={W}:{H}:flags=area", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"]
if "%" in src:
    cmd = ["ffmpeg", "-loglevel", "error", "-framerate", "30", "-i", src, "-vf", f"scale={W}:{H}:flags=area", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"]
p = subprocess.Popen(cmd, stdout=subprocess.PIPE)
fs = W * H * 3
def lin(c):
    c = c / 255.0
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
prev = None
n = 0
wmax = []
mean_d = []
frac_max = []
over = []
win_w, win_h = W // 2, H // 2  # 25% of area
means = []
while True:
    b = p.stdout.read(fs)
    if len(b) < fs:
        break
    a = np.frombuffer(b, np.uint8).reshape(H, W, 3).astype(np.float64)
    L = 0.2126 * lin(a[..., 0]) + 0.7152 * lin(a[..., 1]) + 0.0722 * lin(a[..., 2])
    means.append(L.mean())
    if prev is not None:
        d = np.abs(L - prev)
        darker = np.minimum(L, prev)
        mask = ((d >= 0.10) & (darker < 0.80)).astype(np.int32)
        ii = np.pad(mask.cumsum(0).cumsum(1), ((1, 0), (1, 0)))
        best = 0
        for y in range(0, H - win_h + 1, 6):
            for x in range(0, W - win_w + 1, 8):
                s = ii[y + win_h, x + win_w] - ii[y, x + win_w] - ii[y + win_h, x] + ii[y, x]
                best = max(best, s)
        fr = best / (win_w * win_h)
        frac_max.append(fr)
        if fr > 0.25:
            over.append(n)
        mean_d.append(L.mean() - prev.mean())
    prev = L
    n += 1
mean_d = np.array(mean_d)
print(f"frames={n}")
print(f"max |mean luminance change| between consecutive frames = {np.abs(mean_d).max():.5f} (at pair {int(np.abs(mean_d).argmax())})")
print(f"max changed-area fraction in any 25% window = {max(frac_max):.4f} (at pair {int(np.argmax(frac_max))}); pairs over 25%: {len(over)}")
print("over-25% pairs (seconds):", [round(i/30,2) for i in over])
print("fractions >0.1:", [(round(i/30,2), round(f,2)) for i, f in enumerate(frac_max) if f > 0.1][:60])
# flashes: count sign reversals of significant (>=0.05 of the mean-luminance scale) mean changes inside any 1 s window
thr = 0.02
sig = [(i, v) for i, v in enumerate(mean_d) if abs(v) >= thr]
flashes = 0
worst = 0
for i, (fi, v) in enumerate(sig):
    cnt = 0
    last = np.sign(v)
    for fj, w in sig[i + 1 :]:
        if fj - fi > 30:
            break
        if np.sign(w) != last:
            cnt += 1
            last = np.sign(w)
    worst = max(worst, cnt)
print(f"significant (|dMeanL|>={thr}) frame-to-frame changes: {len(sig)}; max opposite-direction reversals within 1 s: {worst}")
top = np.argsort(-np.abs(mean_d))[:8]
print("top mean-luminance jumps (pair index, seconds, value):", [(int(i), round(i / 30, 2), round(float(mean_d[i]), 4)) for i in top])
print(f"overall mean relative luminance: min {min(means):.4f} max {max(means):.4f}")
