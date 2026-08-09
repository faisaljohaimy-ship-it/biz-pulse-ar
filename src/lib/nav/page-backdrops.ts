/**
 * Route → glossy photographic backdrop map. Rendered once in the app shell so
 * authenticated pages get a themed, position-appropriate backdrop without each
 * page wiring it individually. Pages that own a full-bleed opaque layout
 * (mission-control, boardroom, integrations, fabric) set their own backdrop
 * and are intentionally NOT listed here.
 */
const PAGE_BACKDROPS: Record<string, string> = {
  // Operations & live rooms → night-city imagery.
  // `smart-city-bg.jpeg` و`command-wall-bg.jpeg` كانا **الملف نفسه** بايتًا
  // ببايت (md5 واحد)، فالتفريق بينهما كان اسمًا لا صورة. وُحِّدا في
  // `city-night-bg.webp` — الاسم يصف الصورة (مدينة ليلية) لا الشاشة، لأن
  // الشاشات أربع والصورة واحدة.
  "/situation-room": "/city-night-bg.webp",
  "/operations": "/city-night-bg.webp",
  "/crisis": "/city-night-bg.webp",
  "/sec/emergency": "/city-night-bg.webp",
  // OWNER DIRECTIVE (G5): "/sec" (الأمن الصناعي) and "/agents" (الوكلاء
  // الأذكياء) are UNLISTED — their photographic backdrops are removed. Both
  // pages keep the ambient gradient layers from __root, so nothing is left
  // visually bare; only the photo plate is gone.
  // Scope note: the owner named these two screens. The sec/* sub-screens were
  // asked only to unify card colours (G4), so "/sec/emergency", "/sec/kpi"
  // and "/sec/exec" keep theirs. [افتراض]
  // Intelligence · decisions · strategy · maps → صورة الأرض الليلية بأقواس
  // الشبكة. كانت موزَّعة على خمسة أسماء (`ai-analytics` · `decision-intel` ·
  // `integration-gateway` · `strategy-map` · `smart-city-map`) وستّ نسخ —
  // الثلاثة الأولى md5 واحد، والأخيرتان md5 واحد، والمجموعتان الصورة نفسها
  // بترميزين (فرق إدراكي 1.09/255 = فرق مُرمِّز لا فرق صورة). فالتنويع الذي
  // توحي به الأسماء لم يكن موجودًا على الشاشة أصلًا؛ التوحيد لا يغيّر بكسلًا
  // واحدًا مما يراه المستخدم.
  "/observability": "/earth-network-bg.webp",
  "/sec/kpi": "/earth-network-bg.webp",
  // «/analytics» أُزيل: المسار مخفي بأمر المالك ويُعيد التوجيه للرئيسية، فلا
  // خلفية تُرسم له أبدًا — الصفّ كان يعِد بشاشة لم تعد تُعرض.
  "/decisions": "/earth-network-bg.webp",
  "/risk": "/earth-network-bg.webp",
  "/executive": "/earth-network-bg.webp",
  "/governance": "/earth-network-bg.webp",
  "/sec/exec": "/earth-network-bg.webp",
  "/executive-map": "/earth-network-bg.webp",
  // Smart command center — a pure map plate (never a dashboard screenshot:
  // its text bleeds through as "ghost cards"). Registered here so the shell
  // renders ONE photo backdrop instead of the aurora + a page-level copy.
};

/** The backdrop image for a route (exact match), or undefined. */
export function pageBackdropFor(pathname: string): string | undefined {
  return PAGE_BACKDROPS[pathname];
}
