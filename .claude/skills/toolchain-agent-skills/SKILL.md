---
name: toolchain-agent-skills
description: حزمة Agent Skills (addyosmani/agent-skills) — مهارات دورة التطوير senior (مواصفة→خطة→بناء→اختبار→مراجعة→شحن). تُستدعى عند طلب عمل منهجي متعدّد الخطوات على ميزة أو إصلاح، أو عند الرغبة بسلاش-كوماند للتخطيط والمراجعة. تعليمات فقط، بلا مفاتيح.
---

# Agent Skills — دورة تطوير senior

- **المصدر:** `github.com/addyosmani/agent-skills` (مفتوح المصدر).
- **التفعيل:** `npx skills add addyosmani/agent-skills` (يُثبِّت المهارات تحت
  `.claude/skills/`). تعمل مع Claude Code وأدوات أخرى.
- **المفاتيح/الشبكة:** لا شيء. تعليمات محضة، بلا خروج شبكي وقت التشغيل.
- **ما تضيفه:** أوامر دورة الحياة (نحو `/spec` `/plan` `/build` `/test` `/review`
  `/ship`) مع جداول «أعذار تخطّي الخطوة» وردودها.

## متى تستعملها

ميزة أو تغيير معماري متعدّد الخطوات تريد فيه انضباط مواصفة‑أولًا وتجزئة ومراجعة.
داخليًّا لدينا `nexios-architect` للتخطيط و`tdd-workflow` و`coding-standards`؛
استعمل هذه الحزمة مكمّلًا لا بديلًا، وابقَ على بوابة `nexios-qa-guardian`.

## الحوكمة

الدستور (`CLAUDE.md` / `SADEED_CONSTITUTION.md`) يسود. لا دفع قبل تصريح
`nexios-qa-guardian`. أداة زمن تطوير لا تُستدعى من الإنتاج.
