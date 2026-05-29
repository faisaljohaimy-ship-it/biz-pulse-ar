import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Enterprise Pulse — single source of truth for executive KPIs.
 * Deterministic synthetic series keyed off the current minute, so numbers
 * move organically but stay coherent across every page during a session.
 * Live counts (open tasks, conversations, knowledge docs) are read from
 * Supabase and merged in. Realtime subscriptions on `tasks` and `messages`
 * trigger a re-tick so "LIVE" pills are truthful.
 */

export type PulseStatus = "healthy" | "warning" | "critical";

export type PulseKpi = {
  id: string;
  label_ar: string;
  label_en: string;
  value: string;
  delta: string;
  trend: "up" | "down" | "flat";
  tone: "cyan" | "emerald" | "amber" | "rose" | "violet";
  why_ar: string;
  why_en: string;
};

export type PulseAlert = {
  id: string;
  severity: "critical" | "high" | "medium" | "low";
  title_ar: string;
  title_en: string;
  owner: string;
  route: string;
};

export type PulseIntel = {
  id: string;
  text_ar: string;
  text_en: string;
  confidence: number;
  tone: "cyan" | "violet" | "emerald" | "amber" | "rose";
};

export type EnterprisePulse = {
  status: PulseStatus;
  health: number; // 0-100
  lastRefreshed: Date;
  kpis: PulseKpi[];
  alerts: PulseAlert[];
  intel: PulseIntel[];
  counts: {
    openTasks: number;
    conversations: number;
    docs: number;
  };
};

// Deterministic helpers
function jitter(seed: number, base: number, amp: number) {
  const s = Math.sin(seed * 9301.0 + 49297.0) * 233280.0;
  return base + (s - Math.floor(s)) * amp - amp / 2;
}

function buildPulse(counts: EnterprisePulse["counts"]): EnterprisePulse {
  const minuteSeed = Math.floor(Date.now() / 60_000);
  const revenue = 1.42 + jitter(minuteSeed, 0, 0.04);
  const margin = 24.8 + jitter(minuteSeed + 1, 0, 1.2);
  const adoption = 62 + jitter(minuteSeed + 2, 0, 4);
  const uptime = 99.7 + jitter(minuteSeed + 3, 0, 0.18);
  const incidents = Math.max(0, Math.round(3 + jitter(minuteSeed + 4, 0, 2)));
  const health = Math.max(82, Math.min(98, 92 + jitter(minuteSeed + 5, 0, 4)));

  const status: PulseStatus =
    incidents >= 4 || uptime < 99.5 ? "critical" : incidents >= 2 ? "warning" : "healthy";

  return {
    status,
    health: Math.round(health * 10) / 10,
    lastRefreshed: new Date(),
    counts,
    kpis: [
      {
        id: "revenue",
        label_ar: "الإيراد YTD",
        label_en: "Revenue YTD",
        value: `SAR ${revenue.toFixed(2)}B`,
        delta: "+12.4%",
        trend: "up",
        tone: "emerald",
        why_ar: "نمو مدفوع بقطاعَي الطاقة والخدمات المصرفية الرقمية.",
        why_en: "Growth driven by Energy and Digital Banking verticals.",
      },
      {
        id: "margin",
        label_ar: "هامش EBITDA",
        label_en: "EBITDA margin",
        value: `${margin.toFixed(1)}%`,
        delta: margin > 24.8 ? "+1.2pp" : "-0.4pp",
        trend: margin > 24.8 ? "up" : "down",
        tone: "cyan",
        why_ar: "تحسّن نتيجة أتمتة العمليات وخفض تكلفة السحابة.",
        why_en: "Improved via process automation and cloud cost reduction.",
      },
      {
        id: "adoption",
        label_ar: "تبني الذكاء الاصطناعي الداخلي",
        label_en: "Internal AI adoption",
        value: `${adoption.toFixed(0)}%`,
        delta: "+14pp",
        trend: "up",
        tone: "violet",
        why_ar: "إطلاق ARIA ساهم في تسريع التبني عبر الإدارات.",
        why_en: "ARIA rollout accelerated adoption across departments.",
      },
      {
        id: "uptime",
        label_ar: "توفر الأنظمة",
        label_en: "Systems uptime",
        value: `${uptime.toFixed(2)}%`,
        delta: uptime > 99.7 ? "+0.06pp" : "-0.08pp",
        trend: uptime > 99.7 ? "up" : "down",
        tone: uptime < 99.5 ? "rose" : "emerald",
        why_ar: "زمن استجابة SharePoint مرتفع — مرشّح للمعالجة.",
        why_en: "SharePoint latency elevated — flagged for remediation.",
      },
      {
        id: "incidents",
        label_ar: "حوادث P1",
        label_en: "P1 incidents",
        value: String(incidents),
        delta: incidents > 3 ? "+1" : "-2",
        trend: incidents > 3 ? "up" : "down",
        tone: incidents > 3 ? "rose" : "emerald",
        why_ar: "تشغيل سير عمل الاستجابة التلقائية للحوادث.",
        why_en: "Auto-remediation workflows engaged.",
      },
      {
        id: "tasks",
        label_ar: "مهام تنفيذية مفتوحة",
        label_en: "Open executive tasks",
        value: String(counts.openTasks),
        delta: counts.openTasks > 10 ? "+3" : "-2",
        trend: counts.openTasks > 10 ? "up" : "down",
        tone: "amber",
        why_ar: "تتضمن قرارات تنتظر مراجعة مجلس الإدارة.",
        why_en: "Includes decisions awaiting board review.",
      },
    ],
    alerts: [
      {
        id: "sp-latency",
        severity: "critical",
        title_ar: "زمن استجابة SharePoint مرتفع 412ms",
        title_en: "SharePoint latency elevated 412ms",
        owner: "CIO",
        route: "/integrations",
      },
      {
        id: "funnel-drop",
        severity: "high",
        title_ar: "هبوط مفاجئ في معدل تحويل قمع البيع",
        title_en: "Sales funnel conversion dropped sharply",
        owner: "CEO",
        route: "/analytics",
      },
      {
        id: "fx-vol",
        severity: "medium",
        title_ar: "تذبذب سعر العملة قد يكلف SAR 1.8M",
        title_en: "FX volatility may cost SAR 1.8M",
        owner: "CFO",
        route: "/risk",
      },
    ],
    intel: [
      {
        id: "q4-beat",
        text_ar: "إيرادات Q4 قد تتجاوز الخطة بـ 6.2٪",
        text_en: "Q4 revenue may beat plan by 6.2%",
        confidence: 91,
        tone: "emerald",
      },
      {
        id: "ai-accel",
        text_ar: "تبني AI الداخلي يتسارع 2.3x",
        text_en: "Internal AI adoption accelerating 2.3x",
        confidence: 94,
        tone: "violet",
      },
      {
        id: "competitor",
        text_ar: "Acme أطلقت منتجاً مماثلاً — مراجعة موصى بها",
        text_en: "Acme launched rival product — review advised",
        confidence: 82,
        tone: "amber",
      },
    ],
  };
}

/**
 * useEnterprisePulse — hook consumed by every executive page so KPIs/alerts
 * stay coherent. Re-ticks every 30s and on Supabase realtime events.
 */
export function useEnterprisePulse(): EnterprisePulse {
  const [counts, setCounts] = useState<EnterprisePulse["counts"]>({
    openTasks: 12,
    conversations: 0,
    docs: 0,
  });
  const [pulse, setPulse] = useState<EnterprisePulse>(() => buildPulse(counts));

  // Refresh counts from Supabase (best-effort; gracefully degrades).
  useEffect(() => {
    let cancelled = false;
    async function refreshCounts() {
      try {
        const [tasks, threads, docs] = await Promise.all([
          supabase.from("tasks").select("id", { count: "exact", head: true }).neq("status", "done"),
          supabase.from("threads").select("id", { count: "exact", head: true }),
          supabase.from("knowledge_docs").select("id", { count: "exact", head: true }),
        ]);
        if (cancelled) return;
        setCounts({
          openTasks: tasks.count ?? 12,
          conversations: threads.count ?? 0,
          docs: docs.count ?? 0,
        });
      } catch {
        /* offline / unauthenticated — keep defaults */
      }
    }
    refreshCounts();

    const tick = setInterval(refreshCounts, 30_000);

    // Realtime — re-tick when tasks or messages change.
    const channel = supabase
      .channel("enterprise-pulse")
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, refreshCounts)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, refreshCounts)
      .subscribe();

    return () => {
      cancelled = true;
      clearInterval(tick);
      supabase.removeChannel(channel);
    };
  }, []);

  // Re-derive pulse whenever counts change or the minute rolls over.
  useEffect(() => {
    setPulse(buildPulse(counts));
    const tick = setInterval(() => setPulse(buildPulse(counts)), 30_000);
    return () => clearInterval(tick);
  }, [counts]);

  return pulse;
}

export function formatRelativeTime(date: Date, locale: "ar" | "en"): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 5) return locale === "ar" ? "الآن" : "just now";
  if (diff < 60) return locale === "ar" ? `قبل ${diff} ثانية` : `${diff}s ago`;
  const m = Math.floor(diff / 60);
  if (m < 60) return locale === "ar" ? `قبل ${m} دقيقة` : `${m}m ago`;
  const h = Math.floor(m / 60);
  return locale === "ar" ? `قبل ${h} ساعة` : `${h}h ago`;
}
