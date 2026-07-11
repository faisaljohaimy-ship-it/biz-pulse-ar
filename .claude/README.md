# مجموعة أدوات NEXIOS — السكِلز والإيجنتات (‏`.claude/`)

هذه المجموعة المُنتقاة من السكِلز (skills) والإيجنتات (subagents) المثبّتة
داخل النظام لدعم العمل على NEXIOS. مصدرها مشروع **Everything Claude Code
(ECC)** بترخيص MIT — © 2026 Affaan Mustafa
(<https://github.com/affaan-m/ecc>). أُدرِجت هنا نسخةٌ منتقاة تخصّ حزمة
NEXIOS التقنية (React + TanStack Start + TypeScript + Vite + Tailwind +
Supabase + عربي RTL + صوت آريا + أمن + نشر Cloudflare + vitest) لتكون
متوفّرة لكل جلسة عمل ولكل مساهم، ومحفوظة في التتبّع (git) بخلاف التثبيت
على مستوى الحساب (`~/.claude/`) الذي لا يدوم في البيئة البعيدة سريعة
الزوال.

> المجموعة الكاملة (‏278 سكِل + 67 إيجنت) مثبّتة على مستوى الحساب في
> `~/.claude/`. ما هنا هو المجموعة الأساسية المرتبطة مباشرة بـ NEXIOS.

## الإيجنتات (‏`.claude/agents/`)

| الإيجنت | الاستخدام في NEXIOS |
|---|---|
| `code-reviewer` | مراجعة عامة للجودة والأمن قبل الدفع |
| `typescript-reviewer` | صرامة الأنواع، `no-explicit-any` |
| `react-reviewer` | انضباط الهوكس وحدود المكوّنات |
| `react-build-resolver` / `build-error-resolver` | حلّ أخطاء البناء/tsc |
| `security-reviewer` | تدقيق أمني (أسرار، XSS، مدخلات) — المادة 15 |
| `database-reviewer` | مراجعة الاستعلامات/الأنماط (لا يمسّ RLS دون إذن — المادة 2) |
| `refactor-cleaner` / `code-simplifier` | تنظيف الكود الميت — المادة 14 |
| `silent-failure-hunter` | كشف الإخفاقات الصامتة |
| `performance-optimizer` | أداء الجوال واللابتوب — المادة 5 |
| `a11y-architect` | الوصولية وأهداف اللمس ≥44px — المادة 5 |
| `type-design-analyzer` | تصميم الأنواع |
| `tdd-guide` | قيادة الاختبارات (vitest) |
| `code-explorer` | استكشاف المستودع |
| `planner` / `architect` | تخطيط المهام الكبيرة |
| `doc-updater` | تحديث الوثائق وCLAUDE.md |
| `e2e-runner` / `pr-test-analyzer` | اختبارات end-to-end وتحليل PR |

## السكِلز (‏`.claude/skills/`)

واجهة/تصميم: `react-patterns` · `react-performance` · `react-testing` ·
`frontend-a11y` · `accessibility` · `frontend-design-direction` ·
`frontend-patterns` · `design-system` · `motion-ui` ·
`make-interfaces-feel-better` · `taste`

أساس/جودة: `coding-standards` · `error-handling` · `click-path-audit`
(أعطال حالة الأزرار — المادة 6) · `production-audit` · `tdd-workflow` ·
`codebase-onboarding` · `context-budget` · `config-gc`

بنية/نشر/بيانات: `vite-patterns` · `postgres-patterns` (Supabase) ·
`deployment-patterns` · `canary-watch` (تحقّق ما بعد النشر — Cloudflare) ·
`git-workflow` · `e2e-testing` · `browser-qa`

أمن: `security-scan` · `security-bounty-hunter` (المادة 15).
