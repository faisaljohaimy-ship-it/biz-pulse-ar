/**
 * درع العلامات الخارجية — إزالة أي شارة منصّة بناء تُحقن فوق المنتج.
 *
 * ── لماذا وُجد (أمر المالك ٢٠٢٦/٠٨/٢٠) ──
 * ظهرت حبّة «Edit with Lovable» على صفحات النظام. لا مصدر لها في هذا
 * الريبو إطلاقًا (فُحص المصدر والمخرج المبني): تُحقن من طبقة الاستضافة
 * وقت التقديم، فلا يكفي «حذفها من الكود» — لا كود لها هنا أصلًا. الدرع
 * يزيلها لحظة ظهورها، ويبقى فعّالًا ضد أي علامة مشابهة تُحقن مستقبلًا
 * («Made with …» / «Built with …» من أي منصّة بناء).
 *
 * ── لماذا هذا ليس غشًّا ──
 * المنتج ملك المالك، وإخفاء شارة المنصّة خيارٌ تتيحه المنصّات نفسها في
 * إعداداتها. الدرع لا يمسّ أي محتوى من المنتج ذاته — انظر قواعد الأمان.
 *
 * ── قواعد الأمان (صفر إصابات خاطئة) ──
 * يُزال العنصر فقط إذا طابق أحد توقيعين:
 * ① هوية صريحة: id/class يحمل lovable أو gpteng(ineer) — لا عنصر شرعي
 *    عندنا يحمل هذه الهوية (صفحة موافقة OAuth تذكر Lovable نصًّا لكنها
 *    لا تحمل id/class بهذه الأسماء ولا تطفو فوق الصفحة).
 * ② طافية + انتماء: عنصر position:fixed/absolute بطبقة عالية (شارة
 *    عائمة) **و** يحوي رابطًا إلى نطاق منصّة بناء أو نصًّا بصيغة
 *    «Edit/Made/Built with …». الشرطان معًا — الطفو وحده لا يكفي
 *    (نوافذنا وأزرارنا العائمة طافية لكنها لا تحمل الانتماء)، والنصّ
 *    وحده لا يكفي (محتوى داخل الصفحة قد يذكر منصّةً ذكرًا مشروعًا).
 *
 * التركيب من جذر التطبيق بنفس عائلة المثبّتات الذاتية (watchdog وأخواته):
 * استيراد ديناميكي، عميل فقط، ولا يكسر التطبيق مهما حدث.
 */

/** نطاقات منصّات البناء المعروفة بحقن شاراتها. تُوسَّع عند الحاجة. */
const BUILDER_HOSTS = [
  "lovable.dev",
  "lovable.app",
  "gptengineer.app",
  "cdn.gpteng.co",
  "bolt.new",
  "v0.dev",
];

/** صيغ نصوص الشارات — «Edit with …» وأخواتها، بالحالتين. */
const BADGE_TEXT_RE = /\b(edit|made|built)\s+with\b/i;

/** هوية صريحة في id/class. */
const BADGE_IDENT_RE = /lovable|gpteng/i;

function hasBuilderLink(el: Element): boolean {
  if (el instanceof HTMLAnchorElement && BUILDER_HOSTS.some((h) => el.href.includes(h))) {
    return true;
  }
  if (el instanceof HTMLIFrameElement && BUILDER_HOSTS.some((h) => el.src.includes(h))) {
    return true;
  }
  for (const a of el.querySelectorAll<HTMLAnchorElement>("a[href]")) {
    if (BUILDER_HOSTS.some((h) => a.href.includes(h))) return true;
  }
  for (const f of el.querySelectorAll<HTMLIFrameElement>("iframe[src]")) {
    if (BUILDER_HOSTS.some((h) => f.src.includes(h))) return true;
  }
  return false;
}

function isFloatingOverlay(el: Element): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const cs = window.getComputedStyle(el);
  if (cs.position !== "fixed" && cs.position !== "absolute") return false;
  const z = Number.parseInt(cs.zIndex, 10);
  return Number.isFinite(z) ? z >= 100 : true;
}

/** هل هذا العنصر شارة منصّة تستحق الإزالة؟ */
function isExternalBadge(el: Element): boolean {
  const ident = `${el.id} ${el.className && typeof el.className === "string" ? el.className : ""}`;
  if (BADGE_IDENT_RE.test(ident)) return true;
  if (!isFloatingOverlay(el)) return false;
  if (hasBuilderLink(el)) return true;
  const text = (el.textContent ?? "").trim();
  // نصّ شارة قصير — الشارات جمل من كلمات معدودة، لا محتوى صفحات.
  return text.length > 0 && text.length <= 80 && BADGE_TEXT_RE.test(text);
}

/** سكربتات إعادة الحقن تُزال أيضًا كي لا تعيد بناء ما أزلناه. */
function isBuilderScript(el: Element): boolean {
  return el instanceof HTMLScriptElement && BUILDER_HOSTS.some((h) => el.src.includes(h));
}

function sweep(root: ParentNode): number {
  let removed = 0;
  // الشارات تُحقن أبناءً مباشرين لـbody (أو داخل حاوية حقنٍ خاصة بها)،
  // والمسح يفحص المرشّحين المحتملين فقط لا شجرة التطبيق كاملة.
  const candidates = new Set<Element>();
  if (root instanceof Element && (isExternalBadge(root) || isBuilderScript(root))) {
    candidates.add(root);
  }
  for (const el of root.querySelectorAll(
    'a[href], iframe[src], script[src], [id*="lovable" i], [class*="lovable" i], [id*="gpteng" i]',
  )) {
    // نصعد إلى أعلى حاوية شارةٍ متصلة بالعنصر المرشّح لإزالتها كاملة.
    let target: Element | null = null;
    let cur: Element | null = el;
    while (cur && cur !== document.body && cur !== document.documentElement) {
      if (isExternalBadge(cur) || isBuilderScript(cur)) target = cur;
      cur = cur.parentElement;
    }
    if (target) candidates.add(target);
  }
  for (const el of candidates) {
    try {
      el.remove();
      removed += 1;
    } catch {
      /* عنصر زال قبلنا — لا شيء يُفعل */
    }
  }
  return removed;
}

/**
 * يثبّت الدرع: مسح فوري + مراقبة دائمة لأي حقن لاحق.
 * يعيد دالة تنظيف (نمط المثبّتات في الجذر).
 */
export function installExternalBadgeShield(): () => void {
  try {
    sweep(document.body);
  } catch {
    /* الدرع لا يكسر التطبيق أبدًا */
  }
  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (node instanceof Element) {
          try {
            sweep(node);
          } catch {
            /* تجاهُل — الحقنة التالية يلتقطها المسح التالي */
          }
        }
      }
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  return () => observer.disconnect();
}
