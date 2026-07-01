/**
 * ARIA Executive Intelligence Layer — public entry point.
 *
 * Import from `@/lib/aria` in any page/component to plug into ARIA's
 * global awareness. Zero UI. Purely additive.
 *
 * Usage:
 *
 *   import { useRegisterPage, useRegisterWidget } from "@/lib/aria";
 *
 *   function IncidentsPage() {
 *     useRegisterPage({ section: "security.incidents", title: "Incidents" });
 *     useRegisterWidget({
 *       id: "kpi.open-incidents",
 *       kind: "kpi",
 *       label: "Open Incidents",
 *       value: open,
 *       hint: "critical + high severity, not resolved",
 *     });
 *     ...
 *   }
 *
 * ARIA will then see this page, its filters, and its KPIs when the
 * executive asks a question — no extra wiring required.
 */
export {
  AriaContextProvider,
  useAriaContext,
  useAriaSnapshot,
  useRegisterPage,
  useRegisterWidget,
  type AriaContextSnapshot,
  type AriaPageSnapshot,
  type AriaWidgetSnapshot,
  type AriaWidgetKind,
} from "./context-engine";

export { ariaSessionMemory, type AriaTurn, type AriaAnchor } from "./session-memory";
