#!/usr/bin/env python3
"""Prepare render plates from the owner's 20 AI-generated 16:9 photos (scratch output; NOT committed).
 - gentle teal-orange grade (very light: the photos are already graded)
 - privacy/legal patches: heavy feathered blur over any text/emblem/plate/brand mark found by inspection
   (vest-back lettering, SUV tailgate lettering, grille badge, shoulder patches, tiny screen headers)
 - 07: the palm-and-crossed-swords sleeve patch is painted over with the sleeve colour
 - bloom (screen-blend) layers at half resolution for the lit scenes"""
import numpy as np, glob, os
from PIL import Image, ImageFilter, ImageDraw
SRC = "/tmp/claude-0/wt-tw3/remotion/photos"
OUT = "/tmp/claude-0/brand-render/public-tw3/plates"
os.makedirs(OUT, exist_ok=True)
for f in glob.glob(OUT + "/*"): os.remove(f)

# (x0,y0,x1,y1) boxes to blur, per photo number
BLUR = {
 2:  [(840, 470, 900, 535), (888, 496, 924, 532), (1330, 585, 1672, 680), (1640, 560, 1672, 700)],
 4:  [(165, 610, 215, 660), (925, 625, 965, 680), (1500, 690, 1560, 745)],
 10: [(515, 490, 615, 520), (1195, 470, 1225, 510), (610, 640, 650, 690)],
 13: [(405, 465, 445, 525), (690, 470, 725, 520), (698, 500, 724, 548), (578, 478, 612, 512), (440, 470, 570, 500)],
 14: [(495, 530, 560, 585)],
 15: [(725, 385, 785, 430), (806, 400, 848, 442), (1540, 600, 1672, 720), (1330, 400, 1372, 440)],
 18: [(545, 455, 600, 500)],
 20: [(700, 395, 790, 430), (1555, 595, 1672, 700)],
}
def feather_mask(size, box, pad=10):
    m = Image.new("L", size, 0)
    d = ImageDraw.Draw(m)
    x0, y0, x1, y1 = box
    d.rounded_rectangle((x0, y0, x1, y1), radius=min(18, (x1-x0)//3, (y1-y0)//3), fill=255)
    return m.filter(ImageFilter.GaussianBlur(pad))
def blur_patch(im, box, rad=14):
    big = im.filter(ImageFilter.GaussianBlur(rad))
    return Image.composite(big, im, feather_mask(im.size, box))
def paint_patch(im, box):
    x0, y0, x1, y1 = box
    a = np.asarray(im).astype(np.float64)
    ring = np.concatenate([a[y0-14:y0-4, x0:x1].reshape(-1, 3), a[y1+4:y1+14, x0:x1].reshape(-1, 3),
                           a[y0:y1, x0-14:x0-4].reshape(-1, 3), a[y0:y1, x1+4:x1+14].reshape(-1, 3)])
    col = np.median(ring, axis=0)
    fill = Image.new("RGB", im.size, tuple(int(c) for c in col))
    # soft shading so it does not look like a flat sticker
    rng = np.random.default_rng(7)
    n = (rng.normal(0, 1, (im.height//8+2, im.width//8+2)) * 3)
    n = np.asarray(Image.fromarray(((n+128).clip(0,255)).astype(np.uint8)).resize(im.size, Image.BICUBIC)).astype(np.float64) - 128
    fa = np.asarray(fill).astype(np.float64) + n[..., None]
    fill = Image.fromarray(fa.clip(0, 255).astype(np.uint8))
    return Image.composite(fill, im, feather_mask(im.size, box, 6))
def grade(im):
    a = np.asarray(im).astype(np.float64) / 255.0
    L = (0.2126*a[...,0] + 0.7152*a[...,1] + 0.0722*a[...,2])[..., None]
    a = a + (1 - L) ** 2.4 * np.array([-0.006, 0.006, 0.014]) + L ** 2.2 * np.array([0.02, 0.006, -0.012])
    a = 0.5 + (a - 0.5) * 1.03
    return np.clip(a, 0, 1)
def bloom(a):
    L = 0.2126*a[...,0] + 0.7152*a[...,1] + 0.0722*a[...,2]
    m = np.clip((L - 0.55) / 0.45, 0, 1) ** 1.3
    im = Image.fromarray((a * m[..., None] * 255).astype(np.uint8)).resize((836, 470), Image.LANCZOS)
    b1 = np.asarray(im.filter(ImageFilter.GaussianBlur(3))).astype(np.float64) / 255
    b2 = np.asarray(im.filter(ImageFilter.GaussianBlur(11))).astype(np.float64) / 255
    g = np.clip(np.asarray(im).astype(np.float64)/255*0.45 + b1*0.9 + b2*1.5, 0, 1)
    return Image.fromarray((g * 255).astype(np.uint8))
for f in sorted(glob.glob(SRC + "/*.jpg")):
    n = int(os.path.basename(f)[:2])
    im = Image.open(f).convert("RGB")
    assert im.size == (1672, 941), (f, im.size)
    for b in BLUR.get(n, []): im = blur_patch(im, b, 8 if n in (13, 14, 18) else 14)
    if n == 7: im = paint_patch(im, (330, 560, 420, 670))
    a = grade(im)
    Image.fromarray((a * 255 + 0.5).astype(np.uint8)).save(f"{OUT}/p{n:02d}.jpg", quality=92, subsampling=0, optimize=True)
    if n in (1, 3, 6, 16, 17, 18, 19, 9, 12, 13, 14, 2, 20, 15, 7, 8): bloom(a).save(f"{OUT}/p{n:02d}-glow.jpg", quality=86)
    print(n, "ok")
