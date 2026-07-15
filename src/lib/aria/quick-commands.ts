/**
 * ARIA quick commands — the single source of truth for the composer's
 * slash-commands and quick-action chips (Phase 2 §4).
 *
 * Each command is a well-formed Arabic (or English) prompt that is sent to
 * ARIA as a normal turn, so it works today with zero external keys: ARIA
 * answers from the system's own RAG/fixtures. `slash` is the Arabic trigger
 * typed after "/"; `needsInput` commands append the user's follow-up text.
 */
import {
  FileText,
  CalendarClock,
  Siren,
  LineChart,
  Mail,
  MessageSquareText,
  Search,
  type LucideIcon,
} from "lucide-react";

export interface QuickCommand {
  readonly id: string;
  /** Arabic slash trigger, e.g. "تقرير" → typed as "/تقرير". */
  readonly slash: string;
  readonly ar: string;
  readonly en: string;
  readonly icon: LucideIcon;
  /** The prompt sent to ARIA (Arabic). */
  readonly prompt: string;
  /** If true, the chip focuses the composer with a prefix instead of sending. */
  readonly needsInput?: boolean;
  /** Prefix inserted into the composer when needsInput is true. */
  readonly inputPrefix?: string;
}

export const QUICK_COMMANDS: readonly QuickCommand[] = [
  {
    id: "report",
    slash: "تقرير",
    ar: "تقرير",
    en: "Report",
    icon: FileText,
    prompt:
      "أنشئ تقريراً تنفيذياً موجزاً عن حالة الأمن الصناعي الآن: أبرز المؤشرات، الحوادث المفتوحة، ونسبة الامتثال، مع ٣ توصيات بالأولوية. بالعربية الفصحى.",
  },
  {
    id: "meeting",
    slash: "اجتماع",
    ar: "اجتماع",
    en: "Meeting",
    icon: CalendarClock,
    prompt:
      "جهّز لي اجتماعاً تنفيذياً: اقترح جدول أعمال مركّزاً (٥ بنود)، والنقاط الحرجة التي تستحق قراراً، ومدة مقترحة لكل بند.",
  },
  {
    id: "emergency",
    slash: "طوارئ",
    ar: "طوارئ",
    en: "Emergency",
    icon: Siren,
    prompt:
      "لخّص حالة الطوارئ والتنبيهات النشطة الآن حسب المنطقة وأولوياتها، وما الإجراء العاجل الموصى به لكلٍّ منها.",
  },
  {
    id: "analyze",
    slash: "تحليل",
    ar: "تحليل",
    en: "Analyze",
    icon: LineChart,
    prompt:
      "حلّل المؤشرات الحالية عبر المناطق الأربع واستخرج أبرز الاتجاهات والمخاطر الصاعدة، مع تفسير موجز لكل ملاحظة.",
  },
  {
    id: "search",
    slash: "بحث",
    ar: "بحث",
    en: "Search",
    icon: Search,
    prompt: "",
    needsInput: true,
    inputPrefix: "ابحث في المعرفة عن: ",
  },
  {
    id: "email",
    slash: "بريد",
    ar: "بريد",
    en: "Email",
    icon: Mail,
    prompt: "",
    needsInput: true,
    inputPrefix: "أرسل بريداً إلكترونياً إلى [البريد] بعنوان [الموضوع] ومحتواه: ",
  },
  {
    id: "sms",
    slash: "رسالة",
    ar: "SMS",
    en: "SMS",
    icon: MessageSquareText,
    prompt: "",
    needsInput: true,
    inputPrefix: "أرسل رسالة SMS إلى الرقم الدولي +966... نصها: ",
  },
];

/** Commands whose slash trigger starts with the given query (after "/"). */
export function matchQuickCommands(query: string): readonly QuickCommand[] {
  const q = query.trim();
  if (!q) return QUICK_COMMANDS;
  return QUICK_COMMANDS.filter((c) => c.slash.startsWith(q) || c.id.startsWith(q.toLowerCase()));
}
