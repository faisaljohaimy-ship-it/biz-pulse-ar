---
name: nexios-deploy-safety
description: أمان النشر لمشروع NEXIOS — يُستدعى قبل أي commit/push أو عمل على CI أو أسئلة «لماذا لا يظهر التغيير على neexios.com». يغطي خط النشر الفعلي (Lovable أساسي + GitHub Actions/Cloudflare اختياري)، انضباط الالتزام الواحد، والمحظورات وفحوصها.
---

# NEXIOS Deploy Safety — أمان النشر

## خط النشر الفعلي (لا تفترض غيره)
- **GitHub هو مصدر الحقيقة**؛ الناشر الأساسي لإنتاج neexios.com هو
  **خط Lovable** (زر Publish).
- GitHub Actions: workflow «CI Verification» — job `verify`
  (install → typecheck → lint → deadcode → tests → audit → build →
  budget → smoke) ثم job `deploy` (Cloudflare) ثم E2E.
- **خطوات deploy تتخطى بصمت** إذا غاب السرّان
  `CLOUDFLARE_API_TOKEN` و`CLOUDFLARE_ACCOUNT_ID` من أسرار الريبو —
  هذا مقصود. إضافتهما تفعّل النشر التلقائي الدائم.
- Vercel معطّل (لا تُعِد تفعيله ولا تلمس `vercel.json`).
- **فشل lint يجمّد الإنتاج**: verify أحمر ← deploy لا يعمل ← الموقع
  يبقى على آخر نسخة خضراء. لذلك Lint كامل الريبو محليًا قبل كل دفع.

## انضباط الالتزام
- **commit واحد لكل جلسة** — تُجمع كل التغييرات وتُدفع دفعة واحدة بعد
  اكتمال البوابة كاملة؛ رسالة واضحة بنمط
  `feat(scope): …` / `fix(scope): …` / `chore(scope): …`.
- **`npm run build` ينجح قبل أي push — بلا استثناء.**
- قبل الدفع: `git fetch origin main && git rebase origin/main` —
  Lovable يدفع دفعات متكررة وغير منسقة؛ عالج التعارضات لصالح العقيدة
  ثم `npx eslint --fix .` (دفعات Lovable كثيرًا ما تكسر prettier).

## المحرمات الثابتة (أي diff يمسها = نقض)
- `vite.config.ts` (`manualChunks`، `sourcemap: false`).
- `src/lib/regions.ts` (المرجع الجغرافي الوحيد).
- إدخال iframe/proxy لمنصة نُسك أو كشف رابطها الخام كنص للمستخدم.
- أي secret في المصدر — المفاتيح بيئية على الخادم حصرًا.

## فحوصات ما قبل الدفع (كلها صفر نتائج)
```bash
grep -rn "speechSynthesis" src/                 # browser TTS محظور
grep -rnE "sk-[a-zA-Z0-9]{20}|eleven_[a-z]" src/ # لا مفاتيح في الكود
grep -rn "lovable.app" src/ --include="*.tsx" \
  | grep -v platforms                            # لا روابط خام ظاهرة
```
- الإجراءات الإنتاجية الحساسة (حذف بيانات، تغيير RLS، تغيير أسرار،
  DNS، تفعيل نشر) تُجهَّز كمقترح وتنتظر اعتمادًا بشريًا صريحًا.

## التراجع (Rollback)
- الطريقة: `git revert <sha>` (لا force-push على main) ثم بوابة التحقق
  كاملة ثم الدفع، وإعادة النشر من Lovable.
- ملاحظة: لا يوجد ملف ROLLBACK.md في الجذر حاليًا — إن لزم توثيق حادثة
  تراجع، أنشئه عبر وكيل nexios-docs-keeper.
