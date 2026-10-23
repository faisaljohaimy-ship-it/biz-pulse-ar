#!/usr/bin/env python3
"""
سلك رمز سَدِيد لليزر الصياغة (`assets/sadeed-emblem-edges.webp`) — مولّده، ليُعاد صنعه لا ليُخمَّن.

أمر المالك ٢٠٢٦/١٠/١٨ (R4) بنصّه: «وفي اخر الفديو تبنى وتتكون علامة سديد بلمعان وليزر مذهل واشعاع». فالليزر
في `film/Forge.tsx` يحفر هذا السلك قبل أن يُبنى الرمز صلبًا فوقه.

الإطار إطار `sadeed-emblem.webp` نفسه (مربّع 483)، فيتطابق السلك والرمز بكسلًا ببكسل. الطريقة (الإصدار الثاني
من المتتبّع، ومنه الاسم): حوافّ Canny على إضاءة CIE-L بالدقّة 1× بعد تمويهٍ غاوسيّ، داخل الرمز وحده (قناة
الشفافية مقضومةً بنواة 9×9)؛ تُسقط الشظايا الأقصر من MIN_PIX، ويُتتبَّع كلّ مكوّنٍ (findContours) وتُنعَّم إحداثيّاته
على امتداده، ثم يُرسم مصقول الحوافّ بأربعة أضعاف ويُصغَّر؛ ومعه الحدّ الخارجيّ النظيف من قناة الشفافية. المخرج
لبٌّ أبيضُ سماويّ وهالةٌ سماويّةٌ ليّنة، بشفافيةٍ مستقيمة (غير مضروبة مسبقًا)، WebP بلا ضياع.

الاستعمال — بالقيم التي صُنع بها الأصل المنشور (من `remotion/brand/tools/`):
  python3 make_edges2.py ../assets/sadeed-emblem.webp ../assets/sadeed-emblem-edges.webp PREVIEW.png 40 100 2.2 45
  المعاملات بعد المسارات: LO HI (عتبتا Canny) · SIG (تمويه CIE-L بالبكسل) · MIN_PIX (أقصر شظيّةٍ تبقى)
  · [CORE_W = 1.5] (عرض اللبّ بالبكسل). و`PREVIEW.png` معاينةٌ على الكحليّ بضعف الحجم — خارج المستودع.

حتميّ: أعاد الملفّ المنشور نفسه بايتًا ببايت (48,688 بايتًا، ٢٠٢٦/١٠/١٨) على Python 3.11.17 · numpy 2.4.6
· opencv-python-headless 5.0.0.93 · Pillow 13.0.0.
"""

import sys
import numpy as np, cv2
from PIL import Image

src, out, preview = sys.argv[1], sys.argv[2], sys.argv[3]
LO, HI, SIG, MIN_PIX = float(sys.argv[4]), float(sys.argv[5]), float(sys.argv[6]), int(sys.argv[7])
CORE_W = float(sys.argv[8]) if len(sys.argv) > 8 else 1.5   # core stroke width at 1x (px)
UP = 4
e = np.array(Image.open(src).convert("RGBA"))
N = e.shape[0]
rgb, a = e[..., :3], e[..., 3]
L = cv2.cvtColor(rgb, cv2.COLOR_RGB2LAB)[..., 0].astype(np.float32)
Lb = np.clip(cv2.GaussianBlur(L, (0, 0), SIG), 0, 255).astype(np.uint8)
ed = cv2.Canny(Lb, LO, HI)
inside = (a > 128).astype(np.uint8)
ed[cv2.erode(inside, np.ones((9, 9), np.uint8)) == 0] = 0
n, lab, stats, _ = cv2.connectedComponentsWithStats((ed > 0).astype(np.uint8), connectivity=8)
keep = np.zeros(n, bool)
keep[1:] = stats[1:, cv2.CC_STAT_AREA] >= MIN_PIX
ed = keep[lab].astype(np.uint8) * 255

def smooth_closed(c, sigma):
    pts = c[:, 0, :].astype(np.float64)
    m = len(pts)
    if m < 5:
        return pts
    k = int(3 * sigma) + 1
    w = np.exp(-0.5 * (np.arange(-k, k + 1) / sigma) ** 2); w /= w.sum()
    pad = np.concatenate([pts[-k:], pts, pts[:k]])
    xs = np.convolve(pad[:, 0], w, mode="valid"); ys = np.convolve(pad[:, 1], w, mode="valid")
    return np.stack([xs, ys], 1)

canvas = np.zeros((N * UP, N * UP), np.uint8)
cs, _ = cv2.findContours(ed, cv2.RETR_LIST, cv2.CHAIN_APPROX_NONE)
for c in cs:
    p = smooth_closed(c, 2.2)
    q = np.round((p + 0.5) * UP * 16).astype(np.int32).reshape(-1, 1, 2)   # shift=4 subpixel
    cv2.polylines(canvas, [q], False, 255, max(1, int(round(CORE_W * UP * 0.75))), cv2.LINE_AA, shift=4)
# outer silhouette from the alpha, smoothed, inset by ~1.2 px
am = cv2.GaussianBlur(a.astype(np.float32), (0, 0), 1.2)
co, _ = cv2.findContours((am > 128).astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
outer = smooth_closed(max(co, key=cv2.contourArea), 3.0)
ctr = outer.mean(0)
d = outer - ctr; r = np.linalg.norm(d, axis=1, keepdims=True)
outer_in = ctr + d * (1 - 1.6 / np.maximum(r, 1))
q = np.round((outer_in + 0.5) * UP * 16).astype(np.int32).reshape(-1, 1, 2)
cv2.polylines(canvas, [q], True, 255, max(1, int(round(CORE_W * UP * 0.9))), cv2.LINE_AA, shift=4)

line = canvas.astype(np.float32) / 255
core = cv2.resize(line, (N, N), interpolation=cv2.INTER_AREA)
core = np.clip(core * 1.25, 0, 1)
halo = cv2.GaussianBlur(line, (0, 0), 3.0 * UP)
halo = cv2.resize(halo, (N, N), interpolation=cv2.INTER_AREA)
halo = np.clip(halo / max(np.percentile(halo[halo > 0.01], 99), 1e-6), 0, 1) * 0.5

cH = np.array([95, 216, 255], np.float32) / 255.0
cC = np.array([236, 252, 255], np.float32) / 255.0
aC, aH = core[..., None], halo[..., None]
aOut = aC + aH * (1 - aC)
premul = cC * aC + cH * aH * (1 - aC)
rgbOut = np.where(aOut > 1e-4, premul / np.maximum(aOut, 1e-4), 0)
img = np.dstack([np.clip(rgbOut * 255 + 0.5, 0, 255), np.clip(aOut * 255 + 0.5, 0, 255)]).astype(np.uint8)
Image.fromarray(img, "RGBA").save(out, "WEBP", lossless=True, quality=100, method=6)
navy = np.zeros((N, N, 3), np.float32); navy[:] = np.array([3, 13, 39], np.float32)
al = img[..., 3:4].astype(np.float32) / 255
pv = img[..., :3].astype(np.float32) * al + navy * (1 - al)
Image.fromarray(pv.astype(np.uint8)).resize((N * 2, N * 2), Image.Resampling.LANCZOS).save(preview)
print("kept", int(keep.sum()), "of", n - 1, "contours", len(cs))
