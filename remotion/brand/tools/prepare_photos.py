#!/usr/bin/env python3
"""
يجهّز صور المالك العشرين لفيلم البانر (R6): نسخٌ في مجلّد الخرج بالأسماء نفسها، **بعد محو** ما لا يجوز
أن يظهر في إطار الفيلم — شاراتُ الأكمام والنصّ المشوَّه على السترات (ثمّةُ رمزٌ وطنيّ على كمّ الصورة 07 وشاراتٌ
صغيرة غير مقروءة في غيرها) — فالأصول في `remotion/photos/` لا تُمسّ.

المحو بلا مكتبة رؤية: يُملأ القناع (قطعٌ ناقص مُريَّش) بالتفاف مُطبَّع لما حوله (متوسّطٌ موزون بنواة غاوس
واسعة من البكسلات خارج القناع) ثم حبيبٌ يطابق ضجيج المحيط — حتميّ (بذرة ثابتة).

الاستعمال:  python3 prepare_photos.py <مجلّد الأصول remotion/photos> <مجلّد الخرج>
"""
import sys, glob, os
import numpy as np
from PIL import Image, ImageFilter

# (رقم الصورة، [(x0، y0، x1، y1) بكسلات 1672×941])
SCRUB = {
    "02": [(843, 497, 870, 517), (893, 503, 916, 528)],  # نصّ السترة + شارة الكمّ
    "04": [(932, 654, 962, 690), (1518, 706, 1540, 744)],  # شارتا كمّ
    "07": [(322, 552, 430, 668)],  # نخلةٌ وسيفان متقاطعان على الكمّ = شعارٌ وطنيّ
    "10": [(1196, 476, 1218, 508), (1434, 622, 1456, 652), (262, 630, 288, 664)],
    "13": [(434, 466, 458, 494), (584, 474, 602, 500), (700, 506, 720, 534), (824, 522, 840, 538)],
    "15": [(732, 392, 768, 416), (812, 406, 842, 438)],
}


def gauss(a: np.ndarray, sigma: float) -> np.ndarray:
    r = int(3 * sigma) + 1
    x = np.arange(-r, r + 1, dtype=np.float32)
    ker = np.exp(-(x**2) / (2 * sigma**2))
    ker /= ker.sum()
    out = np.apply_along_axis(lambda v: np.convolve(np.pad(v, r, mode="edge"), ker, mode="valid"), 0, a)
    return np.apply_along_axis(lambda v: np.convolve(np.pad(v, r, mode="edge"), ker, mode="valid"), 1, out)


def scrub(img: Image.Image, boxes) -> Image.Image:
    a = np.asarray(img.convert("RGB"), dtype=np.float32)
    h, w, _ = a.shape
    mask = np.zeros((h, w), np.float32)
    for x0, y0, x1, y1 in boxes:
        m = Image.new("L", (w, h), 0)
        from PIL import ImageDraw

        ImageDraw.Draw(m).ellipse((x0, y0, x1, y1), fill=255)
        mask = np.maximum(mask, np.asarray(m.filter(ImageFilter.GaussianBlur(1.5)), np.float32) / 255)
    keep = (mask < 0.05).astype(np.float32)
    out = a.copy()
    rng = np.random.default_rng(1672)
    for x0, y0, x1, y1 in boxes:
        pad = max(x1 - x0, y1 - y0) * 2
        X0, Y0, X1, Y1 = max(0, x0 - pad), max(0, y0 - pad), min(w, x1 + pad), min(h, y1 + pad)
        reg = a[Y0:Y1, X0:X1]
        k = keep[Y0:Y1, X0:X1]
        # التفافٌ مُطبَّع بنواة غاوس (numpy فقط: PIL لا يمرّر نمط F إلى GaussianBlur)
        num = np.stack([gauss(reg[..., i] * k, pad / 7) for i in range(3)], axis=-1)
        den = gauss(k, pad / 7)
        fill = num / np.maximum(den[..., None], 1e-3)
        # حبيبٌ أحاديّ القناة بمقدار ضجيج المحيط الفعليّ (ما يتبقّى بعد طرح تنعيمٍ ضيّق)
        lum = reg.mean(axis=-1)
        resid = lum - gauss(lum, 1.5)
        sigma = float(resid[k > 0.5].std()) if (k > 0.5).any() else 1.5
        fill = fill + rng.normal(0, max(0.6, sigma), lum.shape).astype(np.float32)[..., None]
        mm = mask[Y0:Y1, X0:X1][..., None]
        out[Y0:Y1, X0:X1] = out[Y0:Y1, X0:X1] * (1 - mm) + fill * mm
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))


def main():
    src, dst = sys.argv[1], sys.argv[2]
    os.makedirs(dst, exist_ok=True)
    for f in sorted(glob.glob(os.path.join(src, "*.jpg"))):
        name = os.path.basename(f)
        img = Image.open(f).convert("RGB")
        n = name[:2]
        if n in SCRUB:
            img = scrub(img, SCRUB[n])
        img.save(os.path.join(dst, name), quality=93, subsampling=0)
        print(name, "scrubbed" if n in SCRUB else "copied")


if __name__ == "__main__":
    main()
