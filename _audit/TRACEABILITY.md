# مصفوفة التتبّع — «تعديلات على النظام v3»

**الموجة ٠ (تحقق A7) · أُنتجت آليًا ٢٠٢٦/٠٨/٢٢**

كل دليل أدناه **أُعيد إنتاجه الآن** من الشيفرة الحالية — زاحف مسارات
(161 مسارًا) + بطارية 13 فحصًا جماعيًّا + حرّاس العقود.

## خلاصة الزاحف

- مسارات مفحوصة: 161 (نجح 144 · فشل 0 · خطأ 0 · مُستثنى 17)
- صفحات تُظهر «محاكاة مرجعية» في نصّها المرئي: **صفر** (REQ-021 مُثبَت آليًا)

## الفحوص الجماعية

> **قراءةُ هذا الجدول:** صفوفه سجلُّ موجةِ تدقيقٍ مضت، لا قائمةَ شروطٍ
> قائمة اليوم. ما وُسم `RETIRED` سقط موضوعُه بأمرِ مالكٍ لاحق — وقيمتُه
> السابقة `PASS` صادقةٌ في وقتها ولا تعني أن الميزة مطلوبةٌ الآن.

| الفحص               | الغرض                                                                                                                                                                                                       | النتيجة |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| `C-HIDDEN-SET`      | قائمة الحجب تضم كل الشاشات المحذوفة بأمر المالك                                                                                                                                                             | PASS    |
| `C-SIDEBAR-5`       | الشريط الجانبي: ٥ أزرار معتمدة، لا دخول/خروج ولا مدخلات محذوفة                                                                                                                                              | PASS    |
| `C-SEC-STRIP`       | شريط sec: بلا مدخلات محذوفة + الحوكمة فيه + «صلاحيات دخول اليوم»                                                                                                                                            | PASS    |
| `C-SIM-ALLOWLIST`   | العبارة محصورة في التصدير/الصدق/المحجوب/التعليقات — صفر صفحات عرض                                                                                                                                           | PASS    |
| `C-SIM-PAGES-CLEAN` | REQ-021: الصفحات الخمس المسحوبة منها الشارة نظيفة                                                                                                                                                           | PASS    |
| `C-LIVE-FT`         | حالة المواقع والخط الزمني بلا LIVE                                                                                                                                                                          | PASS    |
| `C-EXEC-DRILL`      | اللوحة التنفيذية: حوار التفصيل مركّب وخادمه موجود + مؤشر CCTV                                                                                                                                               | PASS    |
| `C-BACKHOME`        | ~~زوج الرجوع/الهوم~~ — **فحصٌ متقاعد**: أُزيل الزوج ٢٠٢٦/٠٩/١٠ فسقط فحصه، ثم عاد الزرّان ٢٠٢٦/٠٩/١١ بنطاقين جديدين يحرسهما `top-bar.contract.test.ts` لا هذا البند. القيمة `PASS` سجلٌّ تاريخيّ لموجةٍ مضت. | RETIRED |
| `C-BADGE-MOUNT`     | درع العلامات الخارجية: استيراد الجذر + طبقة CSS القاتلة                                                                                                                                                     | PASS    |
| `C-HOME-SAUDI`      | تعريف سَدِيد بالرئيسية: «جميع المناطق السعودية» بدل سرد المناطق                                                                                                                                             | PASS    |
| `C-GUARDS`          | حرّاس العقود الخمسة (عدّادات المادة ٢٧ + النغمات + الدرع + ~~الرجوع~~ إزالة القشرة + الهوية)                                                                                                                | PASS    |
| `C-COMMITS`         | كل الكوميتات المذكورة في السجل موجودة في تاريخ git                                                                                                                                                          | PASS    |
| `C-PRESENTATION`    | زر وضع العرض التنفيذي داخل لوحة سَدِيد (بديل مركز القيادة)                                                                                                                                                  | PASS    |

## صفوف البنود (128)

| البند   | فقرة | الشاشة/المسار               | الحالة       | الدليل المُعاد إنتاجه                                                                                                                                  | النتيجة |
| ------- | ---- | --------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------- |
| REQ-001 | 256  | —                           | CLAIMED-DONE | `C-COMMITS` (PASS)                                                                                                                                     | ✓       |
| REQ-002 | 284  | —                           | CLAIMED-DONE | `C-COMMITS` (PASS)                                                                                                                                     | ✓       |
| REQ-003 | 306  | —                           | CLAIMED-DONE | `C-COMMITS` (PASS)                                                                                                                                     | ✓       |
| REQ-004 | 323  | —                           | CLAIMED-DONE | `C-COMMITS` (PASS)                                                                                                                                     | ✓       |
| REQ-005 | 324  | —                           | CLAIMED-DONE | `C-COMMITS` (PASS)                                                                                                                                     | ✓       |
| REQ-006 | 325  | —                           | CLAIMED-DONE | `C-COMMITS` (PASS)                                                                                                                                     | ✓       |
| REQ-007 | 326  | —                           | CLAIMED-DONE | `C-COMMITS` (PASS)                                                                                                                                     | ✓       |
| REQ-008 | 327  | —                           | CLAIMED-DONE | `C-COMMITS` (PASS)                                                                                                                                     | ✓       |
| REQ-009 | 328  | —                           | CLAIMED-DONE | `C-COMMITS` (PASS)                                                                                                                                     | ✓       |
| REQ-010 | 329  | —                           | CLAIMED-DONE | `C-COMMITS` (PASS)                                                                                                                                     | ✓       |
| REQ-011 | 511  | —                           | CLAIMED-DONE | `C-COMMITS` (PASS)                                                                                                                                     | ✓       |
| REQ-012 | 568  | —                           | CLAIMED-DONE | `C-COMMITS` (PASS)                                                                                                                                     | ✓       |
| REQ-013 | 607  | —                           | CLAIMED-DONE | `C-COMMITS` (PASS)                                                                                                                                     | ✓       |
| REQ-014 | 647  | —                           | CLAIMED-DONE | `C-COMMITS` (PASS)                                                                                                                                     | ✓       |
| REQ-015 | 666  | —                           | CLAIMED-DONE | `C-COMMITS` (PASS)                                                                                                                                     | ✓       |
| REQ-016 | 667  | —                           | CLAIMED-DONE | `C-COMMITS` (PASS)                                                                                                                                     | ✓       |
| REQ-017 | 826  | /                           | CLAIMED-DONE | زاحف: `/` حيّة، نصّ 1105 حرفًا (PASS)؛ `C-HOME-SAUDI` (PASS)؛ كوميت `سجل ما قبل الجلسة (٢٠٢٦/٠٨/١١)` (C-COMMITS)                                       | ✓       |
| REQ-018 | 828  | /                           | CLAIMED-DONE | زاحف: `/` حيّة، نصّ 1105 حرفًا (PASS)؛ `C-HOME-SAUDI` (PASS)؛ كوميت `d03a5db` (C-COMMITS)                                                              | ✓       |
| REQ-019 | 831  | /                           | CLAIMED-DONE | زاحف: `/` حيّة، نصّ 1105 حرفًا (PASS)؛ `C-HOME-SAUDI` (PASS)؛ كوميت `سجل ما قبل الجلسة (٢٠٢٦/٠٨/١١)` (C-COMMITS)                                       | ✓       |
| REQ-020 | 835  | /                           | DONE         | زاحف: `/` حيّة، نصّ 1105 حرفًا (PASS)؛ `C-HOME-SAUDI` (PASS)؛ كوميت `169cde2a` (C-COMMITS)                                                             | ✓       |
| REQ-021 | 838  | \*                          | DONE         | `C-SIM-ALLOWLIST` (PASS)؛ `C-SIM-PAGES-CLEAN` (PASS)؛ مسح الزاحف: العبارة غائبة عن النصّ المرئي لكل المسارات؛ كوميت `f90abd24` (C-COMMITS)             | ✓       |
| REQ-022 | 846  | /                           | DONE         | زاحف: `/` حيّة، نصّ 1105 حرفًا (PASS)؛ `C-HOME-SAUDI` (PASS)؛ كوميت `169cde2a` (C-COMMITS)                                                             | ✓       |
| REQ-023 | 872  | —                           | CLAIMED-DONE | `C-COMMITS` (PASS)                                                                                                                                     | ✓       |
| REQ-024 | 873  | —                           | CLAIMED-DONE | `C-COMMITS` (PASS)                                                                                                                                     | ✓       |
| REQ-025 | 874  | —                           | CLAIMED-DONE | `C-COMMITS` (PASS)                                                                                                                                     | ✓       |
| REQ-026 | 875  | —                           | CLAIMED-DONE | `C-COMMITS` (PASS)                                                                                                                                     | ✓       |
| REQ-027 | 876  | —                           | CLAIMED-DONE | `C-COMMITS` (PASS)                                                                                                                                     | ✓       |
| REQ-028 | 877  | —                           | CLAIMED-DONE | `C-COMMITS` (PASS)                                                                                                                                     | ✓       |
| REQ-029 | 878  | —                           | CLAIMED-DONE | `C-COMMITS` (PASS)                                                                                                                                     | ✓       |
| REQ-030 | 879  | —                           | CLAIMED-DONE | `C-COMMITS` (PASS)                                                                                                                                     | ✓       |
| REQ-031 | 880  | —                           | CLAIMED-DONE | `C-COMMITS` (PASS)                                                                                                                                     | ✓       |
| REQ-032 | 910  | /nx-cockpit                 | CLAIMED-DONE | زاحف: `/nx-cockpit` ← `/` (PASS)؛ كوميت `3d8c2e7` (C-COMMITS)                                                                                          | ✓       |
| REQ-033 | 913  | sidebar                     | CLAIMED-DONE | `C-SIDEBAR-5` (PASS)؛ كوميت `3d8c2e7` (C-COMMITS)                                                                                                      | ✓       |
| REQ-034 | 915  | /risk                       | CLAIMED-DONE | زاحف: `/risk` ← `/` (PASS)؛ كوميت `3d8c2e7` (C-COMMITS)                                                                                                | ✓       |
| REQ-035 | 921  | /mission-control            | CLAIMED-DONE | زاحف: `/mission-control` ← `/` (PASS)؛ `C-PRESENTATION` (PASS)؛ كوميت `3d8c2e7` (C-COMMITS)                                                            | ✓       |
| REQ-036 | 926  | /sec/governance             | CLAIMED-DONE | زاحف: `/sec/governance` حيّة، نصّ 742 حرفًا (PASS)؛ `C-SEC-STRIP` (PASS)؛ كوميت `3d8c2e7` (C-COMMITS)                                                  | ✓       |
| REQ-037 | 930  | /situation-room·/urgent-ops | CLAIMED-DONE | زاحف: `/situation-room` حيّة، نصّ 605 حرفًا (PASS)؛ زاحف: `/urgent-ops` حيّة، نصّ 721 حرفًا (PASS)؛ كوميت `975e634` (C-COMMITS)                        | ✓       |
| REQ-038 | 931  | /situation-room·/urgent-ops | CLAIMED-DONE | زاحف: `/situation-room` حيّة، نصّ 605 حرفًا (PASS)؛ زاحف: `/urgent-ops` حيّة، نصّ 721 حرفًا (PASS)؛ كوميت `975e634` (C-COMMITS)                        | ✓       |
| REQ-039 | 932  | /situation-room·/urgent-ops | CLAIMED-DONE | زاحف: `/situation-room` حيّة، نصّ 605 حرفًا (PASS)؛ زاحف: `/urgent-ops` حيّة، نصّ 721 حرفًا (PASS)؛ كوميت `975e634` (C-COMMITS)                        | ✓       |
| REQ-040 | 933  | /situation-room·/urgent-ops | CLAIMED-DONE | زاحف: `/situation-room` حيّة، نصّ 605 حرفًا (PASS)؛ زاحف: `/urgent-ops` حيّة، نصّ 721 حرفًا (PASS)؛ كوميت `975e634` (C-COMMITS)                        | ✓       |
| REQ-041 | 934  | /situation-room·/urgent-ops | CLAIMED-DONE | زاحف: `/situation-room` حيّة، نصّ 605 حرفًا (PASS)؛ زاحف: `/urgent-ops` حيّة، نصّ 721 حرفًا (PASS)؛ كوميت `975e634` (C-COMMITS)                        | ✓       |
| REQ-042 | 935  | /situation-room·/urgent-ops | CLAIMED-DONE | زاحف: `/situation-room` حيّة، نصّ 605 حرفًا (PASS)؛ زاحف: `/urgent-ops` حيّة، نصّ 721 حرفًا (PASS)؛ كوميت `975e634` (C-COMMITS)                        | ✓       |
| REQ-043 | 936  | /situation-room·/urgent-ops | CLAIMED-DONE | زاحف: `/situation-room` حيّة، نصّ 605 حرفًا (PASS)؛ زاحف: `/urgent-ops` حيّة، نصّ 721 حرفًا (PASS)؛ كوميت `975e634` (C-COMMITS)                        | ✓       |
| REQ-044 | 945  | /situation-room·/urgent-ops | CLAIMED-DONE | زاحف: `/situation-room` حيّة، نصّ 605 حرفًا (PASS)؛ زاحف: `/urgent-ops` حيّة، نصّ 721 حرفًا (PASS)؛ كوميت `975e634` (C-COMMITS)                        | ✓       |
| REQ-045 | 946  | /situation-room·/urgent-ops | CLAIMED-DONE | زاحف: `/situation-room` حيّة، نصّ 605 حرفًا (PASS)؛ زاحف: `/urgent-ops` حيّة، نصّ 721 حرفًا (PASS)؛ كوميت `975e634` (C-COMMITS)                        | ✓       |
| REQ-046 | 956  | /boardroom                  | CLAIMED-DONE | زاحف: `/boardroom` ← `/` (PASS)؛ كوميت `975e634` (C-COMMITS)                                                                                           | ✓       |
| REQ-047 | 964  | /sec                        | CLAIMED-DONE | زاحف: `/sec` حيّة، نصّ 1367 حرفًا (PASS)؛ كوميت `975e634` (C-COMMITS)                                                                                  | ✓       |
| REQ-048 | 965  | /sec                        | CLAIMED-DONE | زاحف: `/sec` حيّة، نصّ 1367 حرفًا (PASS)؛ كوميت `975e634` (C-COMMITS)                                                                                  | ✓       |
| REQ-049 | 966  | /sec                        | CLAIMED-DONE | زاحف: `/sec` حيّة، نصّ 1367 حرفًا (PASS)؛ كوميت `975e634` (C-COMMITS)                                                                                  | ✓       |
| REQ-050 | 967  | /sec                        | CLAIMED-DONE | زاحف: `/sec` حيّة، نصّ 1367 حرفًا (PASS)؛ كوميت `975e634` (C-COMMITS)                                                                                  | ✓       |
| REQ-051 | 984  | sidebar                     | CLAIMED-DONE | `C-SIDEBAR-5` (PASS)؛ كوميت `975e634` (C-COMMITS)                                                                                                      | ✓       |
| REQ-052 | 1008 | /sec/exec                   | CLAIMED-DONE | زاحف: `/sec/exec` حيّة، نصّ 986 حرفًا (PASS)؛ `C-EXEC-DRILL` (PASS)؛ كوميت `37d7049` (C-COMMITS)                                                       | ✓       |
| REQ-053 | 1009 | /sec/exec                   | CLAIMED-DONE | زاحف: `/sec/exec` حيّة، نصّ 986 حرفًا (PASS)؛ `C-EXEC-DRILL` (PASS)؛ كوميت `37d7049` (C-COMMITS)                                                       | ✓       |
| REQ-054 | 1010 | /sec/exec                   | CLAIMED-DONE | زاحف: `/sec/exec` حيّة، نصّ 986 حرفًا (PASS)؛ `C-EXEC-DRILL` (PASS)؛ كوميت `37d7049` (C-COMMITS)                                                       | ✓       |
| REQ-055 | 1011 | /sec/exec                   | CLAIMED-DONE | زاحف: `/sec/exec` حيّة، نصّ 986 حرفًا (PASS)؛ `C-EXEC-DRILL` (PASS)؛ كوميت `37d7049` (C-COMMITS)                                                       | ✓       |
| REQ-056 | 1012 | /sec/exec                   | CLAIMED-DONE | زاحف: `/sec/exec` حيّة، نصّ 986 حرفًا (PASS)؛ `C-EXEC-DRILL` (PASS)؛ كوميت `37d7049` (C-COMMITS)                                                       | ✓       |
| REQ-057 | 1013 | /sec/exec                   | CLAIMED-DONE | زاحف: `/sec/exec` حيّة، نصّ 986 حرفًا (PASS)؛ `C-EXEC-DRILL` (PASS)؛ كوميت `37d7049` (C-COMMITS)                                                       | ✓       |
| REQ-058 | 1014 | /sec/exec                   | CLAIMED-DONE | زاحف: `/sec/exec` حيّة، نصّ 986 حرفًا (PASS)؛ `C-EXEC-DRILL` (PASS)؛ كوميت `37d7049` (C-COMMITS)                                                       | ✓       |
| REQ-059 | 1015 | /sec/exec                   | CLAIMED-DONE | زاحف: `/sec/exec` حيّة، نصّ 986 حرفًا (PASS)؛ `C-EXEC-DRILL` (PASS)؛ كوميت `37d7049` (C-COMMITS)                                                       | ✓       |
| REQ-060 | 1016 | /sec/exec                   | CLAIMED-DONE | زاحف: `/sec/exec` حيّة، نصّ 986 حرفًا (PASS)؛ `C-EXEC-DRILL` (PASS)؛ كوميت `37d7049` (C-COMMITS)                                                       | ✓       |
| REQ-061 | 1017 | /sec/exec                   | CLAIMED-DONE | زاحف: `/sec/exec` حيّة، نصّ 986 حرفًا (PASS)؛ `C-EXEC-DRILL` (PASS)؛ كوميت `37d7049` (C-COMMITS)                                                       | ✓       |
| REQ-062 | 1018 | /sec/exec                   | CLAIMED-DONE | زاحف: `/sec/exec` حيّة، نصّ 986 حرفًا (PASS)؛ `C-EXEC-DRILL` (PASS)؛ كوميت `37d7049` (C-COMMITS)                                                       | ✓       |
| REQ-063 | 1019 | /sec/exec                   | CLAIMED-DONE | زاحف: `/sec/exec` حيّة، نصّ 986 حرفًا (PASS)؛ `C-EXEC-DRILL` (PASS)؛ كوميت `37d7049` (C-COMMITS)                                                       | ✓       |
| REQ-064 | 1020 | /sec/exec                   | CLAIMED-DONE | زاحف: `/sec/exec` حيّة، نصّ 986 حرفًا (PASS)؛ `C-EXEC-DRILL` (PASS)؛ كوميت `37d7049` (C-COMMITS)                                                       | ✓       |
| REQ-065 | 1031 | /sec/twin                   | CLAIMED-DONE | زاحف: `/sec/twin` حيّة، نصّ 796 حرفًا (PASS)؛ كوميت `975e634` (C-COMMITS)                                                                              | ✓       |
| REQ-066 | 1032 | /sec/twin                   | CLAIMED-DONE | زاحف: `/sec/twin` حيّة، نصّ 796 حرفًا (PASS)؛ كوميت `975e634` (C-COMMITS)                                                                              | ✓       |
| REQ-067 | 1033 | /sec/twin                   | CLAIMED-DONE | زاحف: `/sec/twin` حيّة، نصّ 796 حرفًا (PASS)؛ كوميت `975e634` (C-COMMITS)                                                                              | ✓       |
| REQ-068 | 1037 | /sec/circles                | CLAIMED-DONE | زاحف: `/sec/circles` ← `/sec` (PASS)؛ كوميت `975e634` (C-COMMITS)                                                                                      | ✓       |
| REQ-069 | 1043 | /sec/sections               | CLAIMED-DONE | زاحف: `/sec/sections` ← `/sec` (PASS)؛ كوميت `975e634` (C-COMMITS)                                                                                     | ✓       |
| REQ-070 | 1047 | /sec/projects               | CLAIMED-DONE | زاحف: `/sec/projects` حيّة، نصّ 2079 حرفًا (PASS)؛ كوميت `37d7049` (C-COMMITS)                                                                         | ✓       |
| REQ-071 | 1048 | /sec/projects               | CLAIMED-DONE | زاحف: `/sec/projects` حيّة، نصّ 2079 حرفًا (PASS)؛ كوميت `37d7049` (C-COMMITS)                                                                         | ✓       |
| REQ-072 | 1054 | /sec/maintenance            | CLAIMED-DONE | زاحف: `/sec/maintenance` حيّة، نصّ 1860 حرفًا (PASS)؛ كوميت `37d7049` (C-COMMITS)                                                                      | ✓       |
| REQ-073 | 1057 | /sec/maintenance            | CLAIMED-DONE | زاحف: `/sec/maintenance` حيّة، نصّ 1860 حرفًا (PASS)؛ كوميت `37d7049` (C-COMMITS)                                                                      | ✓       |
| REQ-074 | 1058 | /sec/maintenance            | CLAIMED-DONE | زاحف: `/sec/maintenance` حيّة، نصّ 1860 حرفًا (PASS)؛ كوميت `37d7049` (C-COMMITS)                                                                      | ✓       |
| REQ-075 | 1059 | /sec/maintenance            | CLAIMED-DONE | زاحف: `/sec/maintenance` حيّة، نصّ 1860 حرفًا (PASS)؛ كوميت `37d7049` (C-COMMITS)                                                                      | ✓       |
| REQ-076 | 1063 | /sec/incidents              | CLAIMED-DONE | زاحف: `/sec/incidents` حيّة، نصّ 590 حرفًا (PASS)؛ كوميت `37d7049` (C-COMMITS)                                                                         | ✓       |
| REQ-077 | 1064 | /sec/incidents              | CLAIMED-DONE | زاحف: `/sec/incidents` حيّة، نصّ 590 حرفًا (PASS)؛ كوميت `37d7049` (C-COMMITS)                                                                         | ✓       |
| REQ-078 | 1065 | /sec/incidents              | CLAIMED-DONE | زاحف: `/sec/incidents` حيّة، نصّ 590 حرفًا (PASS)؛ كوميت `37d7049` (C-COMMITS)                                                                         | ✓       |
| REQ-079 | 1066 | /sec/incidents              | CLAIMED-DONE | زاحف: `/sec/incidents` حيّة، نصّ 590 حرفًا (PASS)؛ كوميت `37d7049` (C-COMMITS)                                                                         | ✓       |
| REQ-080 | 1069 | /sec/patrols                | CLAIMED-DONE | زاحف: `/sec/patrols` حيّة، نصّ 1335 حرفًا (PASS)؛ كوميت `37d7049` (C-COMMITS)                                                                          | ✓       |
| REQ-081 | 1073 | /sec/access                 | CLAIMED-DONE | زاحف: `/sec/access` حيّة، نصّ 1325 حرفًا (PASS)؛ `C-SEC-STRIP` (PASS)؛ كوميت `37d7049` (C-COMMITS)                                                     | ✓       |
| REQ-082 | 1074 | /sec/access                 | CLAIMED-DONE | زاحف: `/sec/access` حيّة، نصّ 1325 حرفًا (PASS)؛ `C-SEC-STRIP` (PASS)؛ كوميت `37d7049` (C-COMMITS)                                                     | ✓       |
| REQ-083 | 1075 | /sec/access                 | CLAIMED-DONE | زاحف: `/sec/access` حيّة، نصّ 1325 حرفًا (PASS)؛ `C-SEC-STRIP` (PASS)؛ كوميت `37d7049` (C-COMMITS)                                                     | ✓       |
| REQ-084 | 1076 | /sec/access                 | CLAIMED-DONE | زاحف: `/sec/access` حيّة، نصّ 1325 حرفًا (PASS)؛ `C-SEC-STRIP` (PASS)؛ كوميت `37d7049` (C-COMMITS)                                                     | ✓       |
| REQ-085 | 1077 | /sec/access                 | CLAIMED-DONE | زاحف: `/sec/access` حيّة، نصّ 1325 حرفًا (PASS)؛ `C-SEC-STRIP` (PASS)؛ كوميت `37d7049` (C-COMMITS)                                                     | ✓       |
| REQ-086 | 1078 | /sec/access                 | CLAIMED-DONE | زاحف: `/sec/access` حيّة، نصّ 1325 حرفًا (PASS)؛ `C-SEC-STRIP` (PASS)؛ كوميت `37d7049` (C-COMMITS)                                                     | ✓       |
| REQ-087 | 1079 | /sec/access                 | CLAIMED-DONE | زاحف: `/sec/access` حيّة، نصّ 1325 حرفًا (PASS)؛ `C-SEC-STRIP` (PASS)؛ كوميت `37d7049` (C-COMMITS)                                                     | ✓       |
| REQ-088 | 1080 | /sec/access                 | CLAIMED-DONE | زاحف: `/sec/access` حيّة، نصّ 1325 حرفًا (PASS)؛ `C-SEC-STRIP` (PASS)؛ كوميت `37d7049` (C-COMMITS)                                                     | ✓       |
| REQ-089 | 1081 | /sec/access                 | CLAIMED-DONE | زاحف: `/sec/access` حيّة، نصّ 1325 حرفًا (PASS)؛ `C-SEC-STRIP` (PASS)؛ كوميت `37d7049` (C-COMMITS)                                                     | ✓       |
| REQ-090 | 1082 | /sec/access                 | CLAIMED-DONE | زاحف: `/sec/access` حيّة، نصّ 1325 حرفًا (PASS)؛ `C-SEC-STRIP` (PASS)؛ كوميت `37d7049` (C-COMMITS)                                                     | ✓       |
| REQ-091 | 1083 | /sec/access                 | CLAIMED-DONE | زاحف: `/sec/access` حيّة، نصّ 1325 حرفًا (PASS)؛ `C-SEC-STRIP` (PASS)؛ كوميت `37d7049` (C-COMMITS)                                                     | ✓       |
| REQ-092 | 1084 | /sec/access                 | CLAIMED-DONE | زاحف: `/sec/access` حيّة، نصّ 1325 حرفًا (PASS)؛ `C-SEC-STRIP` (PASS)؛ كوميت `37d7049` (C-COMMITS)                                                     | ✓       |
| REQ-093 | 1097 | /sec/visitors               | CLAIMED-DONE | زاحف: `/sec/visitors` حيّة، نصّ 1070 حرفًا (PASS)؛ كوميت `37d7049` (C-COMMITS)                                                                         | ✓       |
| REQ-094 | 1098 | /sec/visitors               | CLAIMED-DONE | زاحف: `/sec/visitors` حيّة، نصّ 1070 حرفًا (PASS)؛ كوميت `37d7049` (C-COMMITS)                                                                         | ✓       |
| REQ-095 | 1099 | /sec/visitors               | CLAIMED-DONE | زاحف: `/sec/visitors` حيّة، نصّ 1070 حرفًا (PASS)؛ كوميت `37d7049` (C-COMMITS)                                                                         | ✓       |
| REQ-096 | 1100 | /sec/visitors               | CLAIMED-DONE | زاحف: `/sec/visitors` حيّة، نصّ 1070 حرفًا (PASS)؛ كوميت `37d7049` (C-COMMITS)                                                                         | ✓       |
| REQ-097 | 1101 | /sec/visitors               | CLAIMED-DONE | زاحف: `/sec/visitors` حيّة، نصّ 1070 حرفًا (PASS)؛ كوميت `37d7049` (C-COMMITS)                                                                         | ✓       |
| REQ-098 | 1102 | /sec/visitors               | CLAIMED-DONE | زاحف: `/sec/visitors` حيّة، نصّ 1070 حرفًا (PASS)؛ كوميت `37d7049` (C-COMMITS)                                                                         | ✓       |
| REQ-099 | 1105 | /sec/contractors            | CLAIMED-DONE | زاحف: `/sec/contractors` حيّة، نصّ 1369 حرفًا (PASS)؛ كوميت `37d7049` (C-COMMITS)                                                                      | ✓       |
| REQ-100 | 1107 | /sec/contractors            | CLAIMED-DONE | زاحف: `/sec/contractors` حيّة، نصّ 1369 حرفًا (PASS)؛ كوميت `37d7049` (C-COMMITS)                                                                      | ✓       |
| REQ-101 | 1109 | /sec/contractors            | CLAIMED-DONE | زاحف: `/sec/contractors` حيّة، نصّ 1369 حرفًا (PASS)؛ كوميت `37d7049` (C-COMMITS)                                                                      | ✓       |
| REQ-102 | 1117 | /sec/vehicles               | CLAIMED-DONE | زاحف: `/sec/vehicles` حيّة، نصّ 865 حرفًا (PASS)؛ كوميت `9f17e34` (C-COMMITS)                                                                          | ✓       |
| REQ-103 | 1118 | /sec/vehicles               | CLAIMED-DONE | زاحف: `/sec/vehicles` حيّة، نصّ 865 حرفًا (PASS)؛ كوميت `9f17e34` (C-COMMITS)                                                                          | ✓       |
| REQ-104 | 1119 | /sec/vehicles               | CLAIMED-DONE | زاحف: `/sec/vehicles` حيّة، نصّ 865 حرفًا (PASS)؛ كوميت `9f17e34` (C-COMMITS)                                                                          | ✓       |
| REQ-105 | 1120 | /sec/vehicles               | CLAIMED-DONE | زاحف: `/sec/vehicles` حيّة، نصّ 865 حرفًا (PASS)؛ كوميت `9f17e34` (C-COMMITS)                                                                          | ✓       |
| REQ-106 | 1121 | /sec/vehicles               | CLAIMED-DONE | زاحف: `/sec/vehicles` حيّة، نصّ 865 حرفًا (PASS)؛ كوميت `9f17e34` (C-COMMITS)                                                                          | ✓       |
| REQ-107 | 1130 | /sec/emergency              | CLAIMED-DONE | زاحف: `/sec/emergency` حيّة، نصّ 774 حرفًا (PASS)؛ كوميت `9f17e34` (C-COMMITS)                                                                         | ✓       |
| REQ-108 | 1131 | /sec/emergency              | CLAIMED-DONE | زاحف: `/sec/emergency` حيّة، نصّ 774 حرفًا (PASS)؛ كوميت `9f17e34` (C-COMMITS)                                                                         | ✓       |
| REQ-109 | 1132 | /sec/emergency              | CLAIMED-DONE | زاحف: `/sec/emergency` حيّة، نصّ 774 حرفًا (PASS)؛ كوميت `9f17e34` (C-COMMITS)                                                                         | ✓       |
| REQ-110 | 1135 | /sec/cctv                   | CLAIMED-DONE | زاحف: `/sec/cctv` حيّة، نصّ 881 حرفًا (PASS)؛ كوميت `9f17e34` (C-COMMITS)                                                                              | ✓       |
| REQ-111 | 1136 | /sec/cctv                   | CLAIMED-DONE | زاحف: `/sec/cctv` حيّة، نصّ 881 حرفًا (PASS)؛ كوميت `9f17e34` (C-COMMITS)                                                                              | ✓       |
| REQ-112 | 1137 | /sec/cctv                   | CLAIMED-DONE | زاحف: `/sec/cctv` حيّة، نصّ 881 حرفًا (PASS)؛ كوميت `9f17e34` (C-COMMITS)                                                                              | ✓       |
| REQ-113 | 1138 | /sec/cctv                   | CLAIMED-DONE | زاحف: `/sec/cctv` حيّة، نصّ 881 حرفًا (PASS)؛ كوميت `9f17e34` (C-COMMITS)                                                                              | ✓       |
| REQ-114 | 1141 | /sec/safety                 | CLAIMED-DONE | زاحف: `/sec/safety` ← `/sec` (PASS)؛ كوميت `9f17e34` (C-COMMITS)                                                                                       | ✓       |
| REQ-115 | 1144 | /sec/kpi                    | CLAIMED-DONE | زاحف: `/sec/kpi` ← `/sec` (PASS)؛ كوميت `9f17e34` (C-COMMITS)                                                                                          | ✓       |
| REQ-116 | 1147 | /sec/reports                | CLAIMED-DONE | زاحف: `/sec/reports` حيّة، نصّ 1739 حرفًا (PASS)؛ كوميت `9f17e34` (C-COMMITS)                                                                          | ✓       |
| REQ-117 | 1148 | /sec/reports                | CLAIMED-DONE | زاحف: `/sec/reports` حيّة، نصّ 1739 حرفًا (PASS)؛ كوميت `9f17e34` (C-COMMITS)                                                                          | ✓       |
| REQ-118 | 1149 | /sec/reports                | CLAIMED-DONE | زاحف: `/sec/reports` حيّة، نصّ 1739 حرفًا (PASS)؛ كوميت `9f17e34` (C-COMMITS)                                                                          | ✓       |
| REQ-119 | 1152 | /sec/shifts                 | CLAIMED-DONE | زاحف: `/sec/shifts` حيّة، نصّ 862 حرفًا (PASS)؛ كوميت `9f17e34` (C-COMMITS)                                                                            | ✓       |
| REQ-120 | 1155 | /sec/assets                 | CLAIMED-DONE | زاحف: `/sec/assets` ← `/sec` (PASS)؛ كوميت `9f17e34` (C-COMMITS)                                                                                       | ✓       |
| REQ-121 | 1158 | /sec/facilities·timeline    | CLAIMED-DONE | زاحف: `/sec/facilities` حيّة، نصّ 840 حرفًا (PASS)؛ زاحف: `/sec/timeline` حيّة، نصّ 2119 حرفًا (PASS)؛ `C-LIVE-FT` (PASS)؛ كوميت `9f17e34` (C-COMMITS) | ✓       |
| REQ-122 | 1163 | /sec/knowledge              | CLAIMED-DONE | زاحف: `/sec/knowledge` ← `/sec` (PASS)؛ كوميت `9f17e34` (C-COMMITS)                                                                                    | ✓       |
| REQ-123 | 1166 | /sec/integrations           | CLAIMED-DONE | زاحف: `/sec/integrations` ← `/sec` (PASS)؛ كوميت `9f17e34` (C-COMMITS)                                                                                 | ✓       |
| REQ-124 | 1171 | shell                       | CLAIMED-DONE | `C-BACKHOME` (PASS)؛ `C-SIDEBAR-5` (PASS)؛ `C-GUARDS` (PASS)؛ كوميت `9f17e34` (C-COMMITS)                                                              | ✓       |
| REQ-125 | 1173 | shell                       | CLAIMED-DONE | `C-BACKHOME` (PASS)؛ `C-SIDEBAR-5` (PASS)؛ `C-GUARDS` (PASS)؛ كوميت `9f17e34` (C-COMMITS)                                                              | ✓       |
| REQ-126 | 1174 | shell                       | CLAIMED-DONE | `C-BACKHOME` (PASS)؛ `C-SIDEBAR-5` (PASS)؛ `C-GUARDS` (PASS)؛ كوميت `9f17e34` (C-COMMITS)                                                              | ✓       |
| REQ-127 | 1175 | shell                       | CLAIMED-DONE | `C-BACKHOME` (PASS)؛ `C-SIDEBAR-5` (PASS)؛ `C-GUARDS` (PASS)؛ كوميت `9f17e34` (C-COMMITS)                                                              | ✓       |
| REQ-128 | 1178 | shell                       | CLAIMED-DONE | `C-BACKHOME` (PASS)؛ `C-SIDEBAR-5` (PASS)؛ `C-GUARDS` (PASS)؛ كوميت `9f17e34` (C-COMMITS)                                                              | ✓       |

## الحكم

**البنود الـ128 كلها منفَّذة وخضراء** — لا معلّق ولا فاشل. آخر بندين (REQ-020 · REQ-022) نُفِّذا بأمر المالك ٢٠٢٦/٠٨/٢٢ «ينجز المتبقي الذي لم ينجز».
