"""
بطارية إعادة إنتاج الأدلة — الموجة ٠ (تحقق A7).

فحوص جماعية مسماة، كل فحص يغطي مجموعة بنود من سجل المتطلبات (الربط في
مولّد TRACEABILITY.md). المخرج: `_audit/checks-results.json`.

القاعدة: كل دليل يُعاد إنتاجه آليًا من المصدر الحالي — لا نقل ادعاء.
"""

from __future__ import annotations

import json
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).parent.parent


def read(p: str) -> str:
    return (ROOT / p).read_text()


def sh(cmd: str) -> tuple[int, str]:
    r = subprocess.run(cmd, shell=True, cwd=ROOT, capture_output=True, text=True)
    return r.returncode, (r.stdout + r.stderr)[-2000:]


RESULTS: dict[str, dict] = {}


def check(cid: str, desc: str, ok: bool, evidence: str) -> None:
    RESULTS[cid] = {"desc": desc, "verdict": "PASS" if ok else "FAIL",
                    "evidence": evidence[:500]}
    print(f"{'PASS' if ok else 'FAIL'} {cid} — {desc}")


# ── C-HIDDEN-SET: المسارات المحجوبة كلها مسجّلة في المصدر ──
hidden_src = read("src/lib/nav/hidden-routes.ts")
expected_hidden = [
    "/analytics", "/bi", "/learn", "/ptw", "/executive-reports", "/agents-flow",
    "/executive-showcase", "/cinematic-demo", "/films", "/theater",
    "/risk", "/mission-control", "/nx-cockpit", "/cockpit", "/boardroom",
    "/sec/circles", "/sec/sections", "/sec/knowledge", "/sec/integrations",
    "/sec/assets", "/sec/safety", "/sec/kpi",
]
missing = [r for r in expected_hidden if f'"{r}"' not in hidden_src]
check("C-HIDDEN-SET", "قائمة الحجب تضم كل الشاشات المحذوفة بأمر المالك",
      not missing, f"مفقود: {missing}" if missing else f"{len(expected_hidden)} مسارًا كلها مسجّلة")

# ── C-SIDEBAR-5: الشريط الجانبي خمسة أزرار بالمسميات المعتمدة ──
shell = read("src/components/app-shell.tsx")
labels5 = ["الخريطة التنفيذية", "متابعة الأعمال العاجلة", "التقارير",
           "تحليل الملفات باستخدام الذكاء الاصطناعي"]
have = [l for l in labels5 if l in shell]
sr = 'screenNameAr("/situation-room")' in shell
banned = [b for b in ["خريطة النظام", "SignOutIcon", "LogIn", "LogOut"] if b in shell]
check("C-SIDEBAR-5", "الشريط الجانبي: ٥ أزرار معتمدة، لا دخول/خروج ولا مدخلات محذوفة",
      len(have) == 4 and sr and not banned,
      f"موجود {len(have)}/4 + غرفة العمليات={sr} | محظور باقٍ: {banned}")

# ── C-SEC-STRIP: شريط الأمن الصناعي مشذّب والحوكمة منقولة إليه ──
strip = read("src/components/sec/sec-shell.tsx")
strip_banned = [b for b in ["/sec/circles", "/sec/sections", "/sec/safety",
                            "/sec/kpi", "/sec/knowledge", "/sec/integrations",
                            "/sec/assets"] if f'"{b}"' in strip]
gov = '"/sec/governance"' in strip
access_lbl = "صلاحيات دخول اليوم" in strip
check("C-SEC-STRIP", "شريط sec: بلا مدخلات محذوفة + الحوكمة فيه + «صلاحيات دخول اليوم»",
      not strip_banned and gov and access_lbl,
      f"محذوف باقٍ: {strip_banned} | حوكمة={gov} | صلاحيات={access_lbl}")

# ── C-SIM-ALLOWLIST: «محاكاة مرجعية» محصورة في سطح مسموح ──
rc_out = subprocess.run(["grep", "-rl", "محاكاة مرجعية", "src/"],
                        cwd=ROOT, capture_output=True, text=True)
files = set(rc_out.stdout.split())
ALLOW = {
    # حرّاس المادة ٢٧ — تذييلات تصدير محروسة باختبار عقد
    "src/lib/sadeed/output/finalize.ts", "src/lib/reports/bi-pdf.ts",
    "src/lib/reports/daily-ops-pdf.ts", "src/lib/reports/pdf-rich.ts",
    "src/lib/enterprise-domains.ts",
    # صدق أفعال الكتابة (لا صفحات عرض)
    "src/routes/_authenticated/urgent-ops.tsx",
    "src/routes/_authenticated/sec.access.tsx",
    # سطح الطباعة/التصدير + نموذج التقرير
    "src/components/reports/viewer/ReportViewer.tsx",
    "src/components/reports/viewer/report-document.types.ts",
    "src/components/reports/viewer/report-viewer.contract.test.tsx",
    "src/lib/reports/report-document.types.ts", "src/lib/reports/report-model.ts",
    "src/lib/reports/rich-report.functions.ts", "src/lib/reports/rich-report.test.ts",
    # صفحات محجوبة (تُعاد توجيهها) أو وصف head-meta لا يظهر في الصفحة
    "src/components/cockpit/overlays.tsx", "src/components/cockpit/repository.ts",
    "src/routes/_authenticated/bi.tsx", "src/routes/nx-cockpit.tsx",
    "src/routes/blueprint.tsx", "src/routes/-blueprint-page.tsx",
    "src/routes/nx-agents.tsx", "src/routes/nx-flow.tsx", "src/routes/nx-ops.tsx",
    "src/test/nx-cockpit.test.tsx",
    # سرد العرض التنفيذي (شفافية أمام العميل) + عقد إفصاح سَدِيد النصي
    "src/components/demo/ExecutivePresentationPlayer.tsx",
    "src/routes/api/chat.ts", "src/lib/sadeed/response-contract.ts",
    # داخليات خادم المحاكاة وتعليقات كود (لا نصّ عرض)
    "src/lib/exec/showcase-simulation.server.ts",
    "src/lib/exec/measured-counters.contract.test.ts",
    "src/lib/sadeed/reference-simulation-context.server.ts",
    "src/lib/sadeed/reference-simulation-context.server.test.ts",
    "src/lib/sadeed/output/finalize.test.ts", "src/lib/sadeed/output/pipeline.test.ts",
    "src/lib/access.functions.ts", "src/lib/sec-exec-kpis.functions.ts",
    "src/components/sec/ExecDrilldownDialog.tsx",  # تعليق توثيقي لقرار REQ-021
}
outside = sorted(files - ALLOW)
check("C-SIM-ALLOWLIST", "العبارة محصورة في التصدير/الصدق/المحجوب/التعليقات — صفر صفحات عرض",
      not outside, f"خارج القائمة: {outside}" if outside else f"{len(files)} ملفًا كلها ضمن النطاق المبرَّر")

# ── C-SIM-PAGES-CLEAN: صفحات العرض الحية التي مُسحت في REQ-021 ──
clean_ok = True
notes = []
for f, banned_pat in [
    ("src/routes/_authenticated/sec.cctv.tsx", r"محاكاة مرجعية"),
    ("src/routes/_authenticated/sec.patrols.tsx", r"محاكاة مرجعية"),
    ("src/routes/_authenticated/sec.index.tsx", r"محاكاة مرجعية"),
    ("src/routes/_authenticated/agents.tsx", r"محاكاة مرجعية"),
]:
    hits = re.findall(banned_pat, read(f))
    if hits:
        clean_ok = False
        notes.append(f)
drill = read("src/components/sec/ExecDrilldownDialog.tsx")
if re.search(r"is_simulation\s*&&|شارة.*محاكاة.*Badge|<Badge[^>]*>محاكاة", drill):
    clean_ok = False
    notes.append("ExecDrilldownDialog renders sim chip")
check("C-SIM-PAGES-CLEAN", "REQ-021: الصفحات الخمس المسحوبة منها الشارة نظيفة",
      clean_ok, f"بقايا في: {notes}" if notes else "cctv/patrols/index/agents/drill-dialog نظيفة")

# ── C-LIVE-FT: facilities/timeline بلا شارة LIVE (REQ-121) ──
ft_hits = []
for f in ["src/routes/_authenticated/sec.facilities.tsx",
          "src/routes/_authenticated/sec.timeline.tsx"]:
    if "SecLiveBadge" in read(f):
        ft_hits.append(f)
check("C-LIVE-FT", "حالة المواقع والخط الزمني بلا LIVE",
      not ft_hits, f"LIVE باقٍ في: {ft_hits}" if ft_hits else "صفر ورود")

# ── C-EXEC-DRILL: بطاقات اللوحة التنفيذية تفتح على صفوفها ──
exec_src = read("src/routes/_authenticated/sec.exec.tsx")
kpis_src = read("src/lib/sec-exec-kpis.functions.ts")
ok = ("ExecDrilldownDialog" in exec_src and "getExecDrilldown" in kpis_src
      and "cctv_alerts_new" in kpis_src)
check("C-EXEC-DRILL", "اللوحة التنفيذية: حوار التفصيل مركّب وخادمه موجود + مؤشر CCTV",
      ok, "ExecDrilldownDialog+getExecDrilldown+cctv_alerts_new حاضرة")

# ── C-BACKHOME: زوج الرجوع/الهوم النظامي ──
gb = read("src/components/layout/GlobalBackButton.tsx")
ok = "PREV_PATH" in gb and "invisible pointer-events-none" in gb
check("C-BACKHOME", "زوج الرجوع/الهوم: متتبّع المسار + خانة محجوزة (الهوم لا يقفز)",
      ok, "PREV_PATH + الخانة المحجوزة حاضران")

# ── C-BADGE-MOUNT: درع العلامات مركّب من الجذر وطبقة CSS حاضرة ──
root_src = read("src/routes/__root.tsx")
css = read("src/styles.css")
ok = ("badge-shield" in root_src and "installExternalBadgeShield" in root_src
      and "#lovable-badge" in css)
check("C-BADGE-MOUNT", "درع العلامات الخارجية: استيراد الجذر + طبقة CSS القاتلة",
      ok, "الاستيراد والطبقة حاضران")

# ── C-HOME-SAUDI: تعريف سَدِيد في الرئيسية يقول «جميع المناطق السعودية» ──
bp = read("src/routes/-blueprint-page.tsx")
# تعليق يقتبس أمر المالك حرفيًّا لا يُحسب — العبرة بنصوص العرض وحدها.
bp_display = "\n".join(
    l for l in bp.splitlines() if not l.lstrip().startswith(("//", "*", "/*", "(«"))
)
old_list = re.search(r"الوسطى[^\n]{0,40}الغربية[^\n]{0,40}الشرقية", bp_display)
check("C-HOME-SAUDI", "تعريف سَدِيد بالرئيسية: «جميع المناطق السعودية» بدل سرد المناطق",
      "جميع المناطق السعودية" in bp and not old_list,
      "العبارة حاضرة وسرد المناطق غائب" if not old_list else "سرد المناطق ما زال حاضرًا")

# ── C-GUARDS: حرّاس العقود تعمل خضراء ──
code, out = sh(
    "npx vitest run src/lib/exec/measured-counters.contract.test.ts "
    "src/components/sec/stat-tone.contract.test.ts "
    "src/lib/brand/badge-shield.contract.test.ts "
    "src/components/layout/global-back-button.contract.test.ts "
    "src/lib/brand/product-brand.contract.test.ts 2>&1 | tail -12")
check("C-GUARDS", "حرّاس العقود الخمسة (عدّادات المادة ٢٧ + النغمات + الدرع + الرجوع + الهوية)",
      code == 0 and "failed" not in out.lower(), out[-400:])

# ── C-COMMITS: كل كوميت مُدّعى في السجل موجود فعلًا في التاريخ ──
items = json.loads((Path(__file__).parent / "REQUIREMENTS.json").read_text())["items"]
all_hashes = set()
for it in items:
    all_hashes.update(re.findall(r"\(([0-9a-f]{7,10})\)", it["raw_ar"]))
    if it.get("commit"):
        all_hashes.update(re.findall(r"[0-9a-f]{7,10}", it["commit"]))
bad = []
for h in sorted(all_hashes):
    c, _ = sh(f"git cat-file -e {h}^{{commit}}")
    if c != 0:
        bad.append(h)
check("C-COMMITS", "كل الكوميتات المذكورة في السجل موجودة في تاريخ git",
      not bad, f"مفقود: {bad}" if bad else f"{len(all_hashes)} كوميتًا كلها موجودة")

# ── C-PRESENTATION: وضع العرض انتقل إلى محادثة سديد ──
cop = read("src/components/sadeed-core/SadeedCopilot.tsx")
ok = "SadeedExecutivePresentation" in cop or "العرض التنفيذي" in cop
check("C-PRESENTATION", "زر وضع العرض التنفيذي داخل لوحة سَدِيد (بديل مركز القيادة)",
      ok, "الزر/المكوّن حاضر في SadeedCopilot")

out_path = Path(__file__).parent / "checks-results.json"
out_path.write_text(json.dumps(RESULTS, ensure_ascii=False, indent=1))
fails = [k for k, v in RESULTS.items() if v["verdict"] == "FAIL"]
print(f"\n{len(RESULTS)} فحصًا — فشل: {fails or 'لا شيء'}")
raise SystemExit(1 if fails else 0)
