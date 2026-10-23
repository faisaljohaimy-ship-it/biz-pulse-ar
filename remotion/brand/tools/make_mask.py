#!/usr/bin/env python3
"""
قناع رمز سَدِيد للصفحة (`public/home/brand/sadeed-emblem-mask.webp`) — مولّده.

أمر المالك ٢٠٢٦/١٠/١٨ (R4) بنصّه: «واجعل علامة سديد في النهاية تكون كالجوهرة المشعة باستمرار وذات توهج لولبي
مشع وبلمعان مستمر من الاسفل الى الاعلى». فاللمعان الصاعد في «الجوهرة» (`.nx-jewel-shine` في
`src/styles/home/home-brand.css`) مقصوصٌ على شكل الرمز بهذا القناع.

قناة الشفافية من `assets/sadeed-emblem.webp` (إطار `EMBLEM` نفسه: مربّع 483) مصغَّرةً إلى 256×256 بمتوسّط
المساحة (BOX: حافّةٌ مصقولة بلا هالات رنين)، فوق RGB أبيض، WebP بلا ضياع (`exact`).

الاستعمال (من `remotion/brand/tools/`):
  python3 make_mask.py ../assets/sadeed-emblem.webp ../../../public/home/brand/sadeed-emblem-mask.webp

حتميّ: أعاد الملفّ المنشور نفسه بايتًا ببايت (1,060 بايتًا، ٢٠٢٦/١٠/١٨) على Python 3.11.17 · numpy 2.4.6
· Pillow 13.0.0.
"""

import sys
import numpy as np
from PIL import Image

src, dst = sys.argv[1], sys.argv[2]
e = Image.open(src).convert("RGBA")
alpha = e.getchannel("A")
# area-average downscale: anti-aliased edge without ringing halos
a256 = alpha.resize((256, 256), Image.Resampling.BOX)
white = Image.new("L", (256, 256), 255)
out = Image.merge("RGBA", (white, white, white, a256))
out.save(dst, "WEBP", lossless=True, quality=100, method=6, exact=True)
chk = np.array(Image.open(dst).convert("RGBA"))
src_a = np.array(a256)
print("size", Image.open(dst).size, "mode", Image.open(dst).mode)
print("alpha max |diff| after roundtrip", int(np.abs(chk[..., 3].astype(int) - src_a.astype(int)).max()))
print("rgb min", int(chk[..., :3].min()), "alpha mean", round(float(chk[..., 3].mean()), 2))
