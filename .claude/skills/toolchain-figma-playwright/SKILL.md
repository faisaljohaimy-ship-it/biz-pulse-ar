---
name: toolchain-figma-playwright
description: جسر التصميم↔الكود↔الاختبار — Figma MCP (قراءة سياق التصميم) + Playwright MCP (قيادة متصفّح حقيقي). يُستدعى عند تحويل تصميم Figma إلى كود، أو اختبار/تحقّق تفاعل واجهة في متصفّح. كلاهما مُهيّأ في .mcp.json.
---

# Figma MCP + Playwright MCP

- **Figma MCP:** مُعرَّف في `.mcp.json` باسم `figma` (نقل HTTP إلى
  `https://mcp.figma.com/mcp`). المصادقة OAuth من لوحة Figma؛ وضع Dev Mode
  يتطلّب خطّة Professional/Organization/Enterprise. يقرأ سياق التصميم (ورموزه
  ومتغيّراته)؛ الكتابة إلى اللوحة تجريبية.
- **Playwright MCP:** مُعرَّف باسم `playwright`
  (`npx -y @playwright/mcp@latest`). بلا مفتاح. البيئة هنا فيها Chromium مثبّت
  (`PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`) فلا تعيد تنزيله.

## القيد الحاكم

ترجمة التصميم إلى كود تمرّ بهوية سَدِيد (خطوط/ألوان/RTL/طبقة الرموز) والحالات
الإلزامية، لا نسخًا حرفيًّا للرموز اللاتينية. اختبارات المتصفّح تكمّل `e2e-testing`
و`browser-qa` وفحص الإنتاج (`production-check`/`production-smoke`) ولا تلغيها،
وتُشغَّل على المقاسين المرجعيّين (٣٩٠/١٢٨٠).

## الحوكمة

الدستور يسود. لا سرّ في الريبو؛ وصول Figma عبر OAuth المالك. لا دفع قبل تصريح
`nexios-qa-guardian`. أداة زمن تطوير لا تُستدعى من الإنتاج.
