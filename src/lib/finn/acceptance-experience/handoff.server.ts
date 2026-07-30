// Handoff engine — clean transitions between voice/text/operator/demo.
import type { HandoffKind } from "./types";

export interface HandoffRequest {
  readonly kind: HandoffKind;
  readonly reason?: string;
  readonly lang: "ar" | "en";
}

export interface HandoffOutcome {
  readonly ok: boolean;
  readonly kind: HandoffKind;
  readonly message_ar: string;
  readonly message_en: string;
}

export function performHandoff(req: HandoffRequest): HandoffOutcome {
  switch (req.kind) {
    case "voice_to_text":
      return {
        ok: true,
        kind: req.kind,
        message_ar: "سنكمل كتابياً.",
        message_en: "We'll continue by text.",
      };
    case "text_to_voice":
      return {
        ok: true,
        kind: req.kind,
        message_ar: "الصوت جاهز.",
        message_en: "Voice is ready.",
      };
    case "aria_to_operator":
      return {
        ok: true,
        kind: req.kind,
        message_ar: "أُحوّل الجلسة إلى المشغّل.",
        message_en: "Handing over to the operator.",
      };
    case "demo_to_free":
      return {
        ok: true,
        kind: req.kind,
        message_ar: "انتهى العرض؛ أنت الآن في الوضع الحر.",
        message_en: "Demo complete; you're in free mode.",
      };
  }
}
