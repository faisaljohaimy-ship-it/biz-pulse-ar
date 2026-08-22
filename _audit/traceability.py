"""
مولّد مصفوفة التتبّع — الموجة ٠، المخرج الوحيد: `_audit/TRACEABILITY.md`.

يصهر ثلاثة مصادر: سجل المتطلبات (128 بندًا) + نتائج زاحف المسارات +
بطارية الفحوص الجماعية، في صفّ لكل بند: من فقرة المستند إلى الدليل
المُعاد إنتاجه آليًا الآن — لا نقل ادعاء قديم.
"""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).parent
items = json.loads((ROOT / "REQUIREMENTS.json").read_text())["items"]
crawl = json.loads((ROOT / "crawl-results.json").read_text())
checks = json.loads((ROOT / "checks-results.json").read_text())

# وجهتا الحجب المقصودتان خارج القاعدة العامة (مُتحقَّق منهما من ملفي المسار)
REDIRECT_OVERRIDES = {"/agents-flow": "/agents", "/executive-reports": "/sec/reports"}
# مسار خادم `.ts` بلا صفحة — صُنّف حيًّا خطأً في أول زحف؛ صفحته المرئية /unsubscribe
SERVER_ROUTES = {"/email/unsubscribe"}

by_route: dict[str, dict] = {}
for r in crawl["results"]:
    row = dict(r)
    ov = REDIRECT_OVERRIDES.get(row["route"])
    if ov and row.get("final_path", "").rstrip("/") == ov.rstrip("/"):
        row["verdict"] = "PASS"
        row["note"] = f"وجهة مقصودة {ov} (موثّقة في ملف المسار)"
    if row["route"] in SERVER_ROUTES:
        row["verdict"] = "SKIP"
        row["note"] = "مسار خادم (route .ts) — ليس شاشة"
    by_route[row["route"]] = row

SIM_PAGES = [
    r["route"] for r in crawl["results"]
    if r.get("sim_phrase") and by_route[r["route"]]["verdict"] != "SKIP"
]

# ربط البنود بالفحوص الجماعية حسب المسار/الشاشة
ROUTE_CHECKS: dict[str, list[str]] = {
    "/": ["C-HOME-SAUDI"],
    "shell": ["C-BACKHOME", "C-SIDEBAR-5", "C-GUARDS"],
    "sidebar": ["C-SIDEBAR-5"],
    "*": ["C-SIM-ALLOWLIST", "C-SIM-PAGES-CLEAN"],
    "/sec/exec": ["C-EXEC-DRILL"],
    "/sec/access": ["C-SEC-STRIP"],
    "/sec/governance": ["C-SEC-STRIP"],
    "/mission-control": ["C-PRESENTATION"],
    "/sec/facilities·timeline": ["C-LIVE-FT"],
    "": ["C-COMMITS"],
}
HIDDEN_LIKE = {"/risk", "/mission-control", "/nx-cockpit", "/cockpit", "/boardroom",
               "/sec/circles", "/sec/sections", "/sec/knowledge", "/sec/integrations",
               "/sec/assets", "/sec/safety", "/sec/kpi"}


def split_routes(route: str) -> list[str]:
    if route in ("", "*", "shell", "sidebar"):
        return []
    parts = route.split("·")
    out = []
    base = parts[0]
    for p in parts:
        if not p.startswith("/"):
            prefix = base.rsplit("/", 1)[0]
            p = f"{prefix}/{p}"
        out.append(p)
    return out


def esc(s: str) -> str:
    return s.replace("|", "؍").replace("\n", " ").strip()


lines = [
    "# مصفوفة التتبّع — «تعديلات على النظام v3»",
    "",
    "**الموجة ٠ (تحقق A7) · أُنتجت آليًا " + "٢٠٢٦/٠٨/٢٢**",
    "",
    "كل دليل أدناه **أُعيد إنتاجه الآن** من الشيفرة الحالية — زاحف مسارات",
    f"({crawl['summary']['total']} مسارًا) + بطارية {len(checks)} فحصًا جماعيًّا"
    " + حرّاس العقود.",
    "",
    "## خلاصة الزاحف",
    "",
    f"- مسارات مفحوصة: {crawl['summary']['total']} "
    f"(نجح {sum(1 for r in by_route.values() if r['verdict'] == 'PASS')}"
    f" · فشل {sum(1 for r in by_route.values() if r['verdict'] == 'FAIL')}"
    f" · خطأ {sum(1 for r in by_route.values() if r['verdict'] == 'ERROR')}"
    f" · مُستثنى {sum(1 for r in by_route.values() if r['verdict'] == 'SKIP')})",
    f"- صفحات تُظهر «محاكاة مرجعية» في نصّها المرئي: "
    + (("، ".join(SIM_PAGES)) if SIM_PAGES else "**صفر** (REQ-021 مُثبَت آليًا)"),
    "",
    "## الفحوص الجماعية",
    "",
    "| الفحص | الغرض | النتيجة |",
    "| --- | --- | --- |",
]
for cid, c in checks.items():
    lines.append(f"| `{cid}` | {esc(c['desc'])} | {c['verdict']} |")

lines += [
    "",
    "## صفوف البنود (128)",
    "",
    "| البند | فقرة | الشاشة/المسار | الحالة | الدليل المُعاد إنتاجه | النتيجة |",
    "| --- | --- | --- | --- | --- | --- |",
]

overall_fail = []
for it in items:
    route = it.get("route", "")
    routes = split_routes(route)
    ev_parts: list[str] = []
    verdicts: list[str] = []
    for r in routes:
        cr = by_route.get(r)
        if cr:
            v = cr["verdict"]
            verdicts.append(v)
            if cr["kind"] == "hidden" or r in HIDDEN_LIKE:
                ev_parts.append(f"زاحف: `{r}` ← `{cr.get('final_path', '؟')}` ({v})")
            else:
                ev_parts.append(f"زاحف: `{r}` حيّة، نصّ {cr.get('text_len', 0)} حرفًا ({v})")
    for cid in ROUTE_CHECKS.get(route, []):
        c = checks.get(cid)
        if c:
            verdicts.append(c["verdict"])
            ev_parts.append(f"`{cid}` ({c['verdict']})")
    if it["id"] == "REQ-021":
        ok = not SIM_PAGES
        verdicts.append("PASS" if ok else "FAIL")
        ev_parts.append(
            "مسح الزاحف: العبارة غائبة عن النصّ المرئي لكل المسارات" if ok
            else f"العبارة ظاهرة في: {SIM_PAGES}")
    if it.get("commit"):
        ev_parts.append(f"كوميت `{esc(it['commit'])}` (C-COMMITS)")
    if not ev_parts:
        ev_parts.append("بند وثائقي — الدليل: C-COMMITS على كوميتات السجل")
        verdicts.append(checks["C-COMMITS"]["verdict"])

    if it["status"] == "NEEDS-OWNER-DECISION":
        result = "⏸ بانتظار المالك"
    elif "FAIL" in verdicts or "ERROR" in verdicts:
        result = "✗"
        overall_fail.append(it["id"])
    else:
        result = "✓"
    lines.append(
        f"| {it['id']} | {it['source_paragraph']} | {esc(route) or '—'} "
        f"| {it['status']} | {esc('؛ '.join(ev_parts))} | {result} |")

lines += [
    "",
    "## الحكم",
    "",
    ("**كل البنود القابلة للتحقق خضراء.** بندان بانتظار قرار المالك "
     "(REQ-020 الهولوغرام، REQ-022 سهم سجل المخاطر) — لا يُخمَّنان."
     if not overall_fail else
     f"**بنود فاشلة تحتاج معالجة: {overall_fail}**"),
    "",
]

(ROOT / "TRACEABILITY.md").write_text("\n".join(lines))
print(f"TRACEABILITY.md: {len(items)} صفًّا | فشل: {overall_fail or 'لا شيء'}")
