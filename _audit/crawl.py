"""
زاحف المسارات الآلي — الموجة ٠ (تحقق A7) من خطة البوابة ١.

لكل مسار في `_audit/routes.txt`:
  • مسار مخفي (HIDDEN_ROUTES) ⇐ يجب أن يهبط على وجهة إعادة التوجيه
    الصحيحة (/sec لأبناء sec، / لسواها).
  • مسار حي ⇐ يجب أن يعرض محتوى فعليًا (نصّ ظاهر غير فارغ، لا تحميل أبدي).
  • REQ-021 ⇐ عبارة «محاكاة مرجعية» يجب ألا تظهر في النصّ المرئي لأي صفحة.

المخرج: `_audit/crawl-results.json` — صفّ لكل مسار بالحكم والدليل.
"""

from __future__ import annotations

import asyncio
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "tests" / "visual"))
from _runtime import resolve_chromium  # noqa: E402

from playwright.async_api import async_playwright  # noqa: E402

BASE = "http://127.0.0.1:8099"
ROOT = Path(__file__).parent
ROUTES = [r.strip() for r in (ROOT / "routes.txt").read_text().splitlines() if r.strip()]

# المسارات المخفية — تُقرأ من المصدر نفسه لا من نسخة يدوية.
HIDDEN_SRC = (ROOT.parent / "src/lib/nav/hidden-routes.ts").read_text()
HIDDEN = set(re.findall(r'"(/[^"]+)"', HIDDEN_SRC.split("new Set([")[1].split("])")[0]))

# نقاط خادم لا صفحات — تُستثنى من الزحف (ليست شاشات مستخدم).
SKIP_PREFIXES = (
    "/.mcp/", "/.well-known/", "/.lovable/", "/lovable/", "/mcp",
    "/sitemap.xml", "/health", "/tts",
    # مسار خادم (route .ts بلا صفحة) — صفحة إلغاء الاشتراك المرئية /unsubscribe
    "/email/unsubscribe",
)
# مسارات مُعلمَنة — تُزار بقيمة عينة.
PARAM_SAMPLE = {
    "/assistant/$threadId": None,  # يتطلب معرف محادثة — يُتخطى بملاحظة
    "/learn/$slug": None,
    "/verify/permit/$permitId": "/verify/permit/PTW-2026-0001",
    "/.mcp/invoke-tool/$tool": None,
}

SIM_PHRASE = "محاكاة مرجعية"


# وجهتان مقصودتان خارج القاعدة العامة — مُتحقَّق منهما من ملفي المسارين:
# agents-flow يرتد إلى سطحه الأم /agents، وexecutive-reports دُمجت في
# /sec/reports (نصّ التعليق في hidden-routes.ts نفسه).
REDIRECT_OVERRIDES = {
    "/agents-flow": "/agents",
    "/executive-reports": "/sec/reports",
}


def expected_redirect(route: str) -> str:
    if route in REDIRECT_OVERRIDES:
        return REDIRECT_OVERRIDES[route]
    return "/sec" if route.startswith("/sec/") else "/"


async def crawl() -> None:
    results = []
    chromium = resolve_chromium()
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(
            executable_path=chromium, args=["--no-sandbox"]
        )
        ctx = await browser.new_context(
            viewport={"width": 1280, "height": 800}, locale="ar-SA"
        )
        page = await ctx.new_page()
        first = True
        for route in ROUTES:
            if any(route == p.rstrip("/") or route.startswith(p) for p in SKIP_PREFIXES):
                results.append({"route": route, "kind": "skip", "verdict": "SKIP",
                                "note": "نقطة خادم/ملف — ليست شاشة"})
                continue
            if "$" in route:
                sample = PARAM_SAMPLE.get(route)
                if not sample:
                    results.append({"route": route, "kind": "param", "verdict": "SKIP",
                                    "note": "مسار مُعلمَن بلا عينة صالحة"})
                    continue
                target = sample
            else:
                target = route
            kind = "hidden" if route in HIDDEN else "live"
            row = {"route": route, "kind": kind}
            try:
                timeout = 90_000 if first else 45_000
                first = False
                await page.goto(BASE + target, wait_until="load", timeout=timeout)
                # مهلة استقرار: التوجيهات في beforeLoad + المحاكاة ≤ 4 ثوانٍ.
                await page.wait_for_timeout(1_800)
                final_path = await page.evaluate("location.pathname")
                text = await page.evaluate("document.body.innerText")
                text_norm = re.sub(r"\s+", " ", text).strip()
                row["final_path"] = final_path
                row["text_len"] = len(text_norm)
                row["sim_phrase"] = SIM_PHRASE in text_norm
                if kind == "hidden":
                    exp = expected_redirect(route)
                    ok = final_path.rstrip("/") == exp.rstrip("/") or (
                        exp == "/" and final_path == "/"
                    )
                    row["expected"] = exp
                    row["verdict"] = "PASS" if ok else "FAIL"
                    if not ok:
                        row["note"] = f"هبط على {final_path} لا {exp}"
                else:
                    ok = len(text_norm) > 40
                    row["verdict"] = "PASS" if ok else "FAIL"
                    if not ok:
                        row["note"] = "نصّ مرئي شبه فارغ — تحميل أبدي أو شاشة بيضاء"
                if row.get("sim_phrase") and row["verdict"] == "PASS":
                    row["verdict"] = "FAIL"
                    row["note"] = f"عبارة «{SIM_PHRASE}» ظاهرة (REQ-021)"
            except Exception as exc:  # noqa: BLE001
                row["verdict"] = "ERROR"
                row["note"] = str(exc)[:200]
            results.append(row)
            print(f"{row['verdict']:5} {route} -> {row.get('final_path', '')}",
                  flush=True)
        await browser.close()

    out = ROOT / "crawl-results.json"
    summary = {
        "total": len(results),
        "pass": sum(1 for r in results if r["verdict"] == "PASS"),
        "fail": sum(1 for r in results if r["verdict"] == "FAIL"),
        "error": sum(1 for r in results if r["verdict"] == "ERROR"),
        "skip": sum(1 for r in results if r["verdict"] == "SKIP"),
        "sim_phrase_pages": [r["route"] for r in results if r.get("sim_phrase")],
    }
    out.write_text(json.dumps({"summary": summary, "results": results},
                              ensure_ascii=False, indent=1))
    print(json.dumps(summary, ensure_ascii=False))


asyncio.run(crawl())
