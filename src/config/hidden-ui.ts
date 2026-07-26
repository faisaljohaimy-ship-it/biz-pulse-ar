/**
 * NEXIOS — Central UI visibility switchboard.
 *
 * Owner directive (2026-07-26): hide the following surfaces from every
 * user-facing render (home, menus, cards, tabs, command palette, search,
 * shortcuts and mobile) WITHOUT deleting their components, data or routes.
 * Flip a flag here to bring an item back — nothing else needs to change.
 */
export const HIDDEN_UI_ITEMS = new Set<string>([
  "system-components", // مكوّنات النظام
  "leadership-tree", // شجرة القيادة / الشجرة القيادية
  "system-status", // حالة النظام / حالة المنظومة
  "leadership-unit", // وحدة القيادة / وحدات القيادة
  "home-hero", // NEXIOS Digital Transformation intro block
]);

export function isUiHidden(id: string): boolean {
  return HIDDEN_UI_ITEMS.has(id);
}
