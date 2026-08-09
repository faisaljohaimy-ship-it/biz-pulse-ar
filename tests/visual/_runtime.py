"""
تشغيل الفحوص البصرية — عنوان الخادم ومسار المتصفّح.

سببان لوجود هذا الملف:

  ١. **العنوان لم يعد ثابتًا.** كانت الثلاثة تكتب `http://localhost:8080`
     حرفيًّا، فإذا وقف خادم المعاينة على منفذ آخر ماتت كلها بخطأ اتصال —
     وهو فشل *تشغيل* يُقرأ في التقرير فشلًا *بصريًّا*. صار `VISUAL_BASE_URL`
     يقرّر، و8080 يبقى الافتراضي.

  ٢. **رقم بناء كروميوم يزحف.** حزمة playwright تطلب البناء الذي بُنيت عليه
     بالضبط (`chromium-1234`)، وما على القرص في هذه الحاوية `chromium-1194`
     و`chromium-1228`. فينفجر `launch()` بـ«Executable doesn't exist» قبل أن
     تُفتح صفحة واحدة. القاعدة نفسها المطبَّقة في `scripts/ui-audit.mjs`:
     سلّم أحدث كروميوم **موجود فعلًا** بدل أن تتوقّف البوابة بصمت.
"""

from __future__ import annotations

import os
from pathlib import Path

BASE_URL = os.environ.get("VISUAL_BASE_URL", "http://localhost:8080").rstrip("/")


def resolve_chromium() -> str | None:
    """أحدث كروميوم موجود على القرص، أو `None` فيحاول playwright بمساره."""
    override = os.environ.get("CHROMIUM_PATH")
    if override:
        return override

    roots = [os.environ.get("PLAYWRIGHT_BROWSERS_PATH"), "/opt/pw-browsers"]
    for root in filter(None, roots):
        base = Path(root)
        if not base.is_dir():
            continue
        # الأحدث أولًا: 1228 يسبق 1194 بالترتيب العددي لا النصّي.
        dirs = sorted(
            (d for d in base.iterdir() if d.is_dir() and d.name.startswith("chromium-")),
            key=lambda d: int(d.name.split("-")[1]) if d.name.split("-")[1].isdigit() else 0,
            reverse=True,
        )
        for d in dirs:
            for rel in ("chrome-linux/chrome", "chrome-linux/headless_shell"):
                candidate = d / rel
                if candidate.exists():
                    return str(candidate)
    return None
