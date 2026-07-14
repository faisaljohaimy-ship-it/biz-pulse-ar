import type { ElementType } from "react";

import { template as demoConfirmation } from "./demo-confirmation";
import { template as demoInternal } from "./demo-internal";

export interface TemplateEntry {
  component: ElementType;
  subject: string | ((data: Readonly<Record<string, unknown>>) => string);
  displayName?: string;
  previewData?: Readonly<Record<string, unknown>>;
  /** Fixed recipient — overrides caller-provided recipientEmail when set. */
  to?: string;
}

/**
 * Template registry — maps template names to their React Email components.
 * Import and register new templates here after creating them in this directory.
 */
export const TEMPLATES: Record<string, TemplateEntry> = {
  "demo-confirmation": demoConfirmation,
  "demo-internal": demoInternal,
};
