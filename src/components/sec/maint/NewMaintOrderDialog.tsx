/**
 * «أمر عمل جديد» — أقلّ ما يكفي الفني ليبدأ: النظام (أزرار بأيقونات)، المكوّن
 * (اقتراحات من مكوّنات السجل الأكثر تكرارًا)، الموقع والمدينة، الوصف، الأولوية،
 * والاستحقاق. **الرقم الوظيفي والاسم لا يُكتبان**: يُقرآن من حساب المُنشئ ويُعرضان
 * قبل الإرسال، والقاعدة تكتب `created_by` بنفسها (`maint_create_order`).
 */
import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Plus, UserRound } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArabicDateField } from "@/components/ui/arabic-date-field";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { createMaintOrder } from "@/lib/maint.functions";
import { SYSTEM_AR, type SystemCode } from "@/lib/maintenance/cm-log-rules";
import { REGIONS, type RegionId } from "@/lib/regions";
import { useRegion } from "@/lib/region-context";
import { SYSTEM_ICON } from "@/components/sec/maint/maint-ui";
import { cn } from "@/lib/utils";

/** مكوّنات السجل الأكثر تكرارًا لكل نظام — اقتراحٌ لا قيد. */
const COMPONENTS: Record<SystemCode, string[]> = {
  CCTV: [
    "Outdoor Fixed Camera",
    "PTZ Camera",
    "Indoor Fixed Camera",
    "Media Converter",
    "Computer Unit - workstation",
    "Fiber Optic Cable",
    "Network Video Recorder",
  ],
  GATE: [
    "Arm Barrier",
    "Sliding Gate",
    "Road Blocker",
    "swing Gate",
    "Photocell",
    "retractable bollards",
  ],
  ACS: [
    "Card Reader",
    "Long Range Reader",
    "Elecatric Door Lock",
    "Turnstile / speed lane",
    "Push Button Switch",
  ],
  VISIT: ["Site Visit"],
  CONTROL: ["Screen Monitor", "Workstation", "UPS", "Power Supply", "Network Video Recorder"],
  PIDS: ["Microwave Sensor", "Fence Sensor", "Radar"],
};
const PRIORITY: Array<["low" | "medium" | "high" | "critical", string]> = [
  ["low", "منخفضة"],
  ["medium", "متوسطة"],
  ["high", "عالية"],
  ["critical", "حرجة"],
];
const FIELD =
  "nx-focus-ring h-11 w-full rounded-lg border border-[color:var(--hairline)] bg-[color:var(--surface)] px-3 text-sm text-[color:var(--ink)]";

function useMyIdentity(userId: string | null) {
  const [me, setMe] = useState<{ name: string | null; staff: string | null } | null>(null);
  useEffect(() => {
    if (!userId) return setMe(null);
    let live = true;
    void Promise.all([
      supabase.from("profiles").select("display_name").eq("user_id", userId).maybeSingle(),
      (supabase as unknown as { from: (t: string) => ReturnType<typeof supabase.from> })
        .from("staff_accounts")
        .select("staff_number")
        .eq("user_id", userId)
        .maybeSingle(),
    ]).then(([p, s]) => {
      if (!live) return;
      setMe({
        name: (p.data as { display_name?: string | null } | null)?.display_name ?? null,
        staff: (s.data as { staff_number?: string | null } | null)?.staff_number ?? null,
      });
    });
    return () => {
      live = false;
    };
  }, [userId]);
  return me;
}

export function NewMaintOrderDialog() {
  const { user } = useAuth();
  const me = useMyIdentity(user?.id ?? null);
  const qc = useQueryClient();
  const create = useServerFn(createMaintOrder);
  const [open, setOpen] = useState(false);
  const [system, setSystem] = useState<SystemCode>("CCTV");
  const [component, setComponent] = useState("");
  const [site, setSite] = useState("");
  const { regionId } = useRegion();
  const [region, setRegion] = useState<RegionId>(regionId);
  const [kind, setKind] = useState<"corrective" | "preventive">("corrective");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<(typeof PRIORITY)[number][0]>("medium");
  const [dueAt, setDueAt] = useState("");

  const m = useMutation({
    mutationFn: () =>
      create({
        data: {
          system,
          component: component || undefined,
          site,
          region,
          kind,
          description,
          priority,
          dueAt: dueAt || undefined,
        },
      }),
    onSuccess: async ({ ref }) => {
      toast.success(`أُنشئ أمر العمل ${ref} — مسجَّل ١٠٪`);
      setOpen(false);
      setComponent("");
      setSite("");
      setDescription("");
      setDueAt("");
      await qc.invalidateQueries({ queryKey: ["maint"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "تعذّر إنشاء أمر العمل الآن."),
  });

  const valid = site.trim().length >= 2 && description.trim().length >= 5;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="h-11 gap-1.5 font-bold">
          <Plus className="size-4" /> أمر عمل جديد
        </Button>
      </DialogTrigger>
      <DialogContent dir="rtl" className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader className="text-start">
          <DialogTitle>أمر عمل صيانة جديد</DialogTitle>
          <DialogDescription>يبدأ «مسجَّلًا ١٠٪»، ويُسنده مدير الصيانة لفني.</DialogDescription>
        </DialogHeader>

        {!user ? (
          <p role="note" className="rounded-lg border p-3 text-[13px]">
            إنشاء أمر العمل يتطلّب حسابًا —{" "}
            <a href="/auth" className="nx-focus-ring font-semibold text-primary underline">
              سجّل الدخول
            </a>{" "}
            أو{" "}
            <a
              href="/auth?mode=signup"
              className="nx-focus-ring font-semibold text-primary underline"
            >
              أنشئ حسابًا جديدًا
            </a>{" "}
            بالرقم الوظيفي والبريد.
          </p>
        ) : (
          <div className="flex items-center gap-2 rounded-lg bg-[color:var(--chip)] p-2.5 text-[13px]">
            <UserRound aria-hidden className="size-4 shrink-0 text-[color:var(--ink-3)]" />
            <span className="text-[color:var(--ink-2)]">يُسجَّل باسمك:</span>
            <span className="min-w-0 truncate font-bold text-[color:var(--ink)]">
              {me?.name ?? user.email ?? "—"}
              {me?.staff ? <bdi className="ms-1 font-mono">#{me.staff}</bdi> : " · بلا رقم وظيفي"}
            </span>
          </div>
        )}

        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (valid && user) m.mutate();
          }}
        >
          <fieldset>
            <legend className="mb-1.5 text-sm font-medium">النظام</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {(Object.keys(SYSTEM_AR) as SystemCode[]).map((s) => {
                const Icon = SYSTEM_ICON[s];
                return (
                  <button
                    key={s}
                    type="button"
                    aria-pressed={system === s}
                    onClick={() => {
                      setSystem(s);
                      setComponent("");
                    }}
                    className={cn(
                      "nx-focus-ring flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl border p-2 text-[12px] font-bold",
                      system === s
                        ? "border-[color:var(--tone-blue)] bg-[color:var(--tone-blue)] text-[color:var(--surface)]"
                        : "border-[color:var(--hairline)] text-[color:var(--ink)]",
                    )}
                  >
                    <Icon aria-hidden className="size-5" />
                    {SYSTEM_AR[s]}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div>
            <Label htmlFor="mo-component">المكوّن المعطّل</Label>
            <Input
              id="mo-component"
              list="mo-component-list"
              value={component}
              maxLength={120}
              onChange={(e) => setComponent(e.target.value)}
              placeholder="اختر من القائمة أو اكتب"
              className="nx-focus-ring mt-1.5 h-11"
            />
            <datalist id="mo-component-list">
              {COMPONENTS[system].map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>

          <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
            <div>
              <Label htmlFor="mo-site">الموقع</Label>
              <Input
                id="mo-site"
                value={site}
                maxLength={200}
                required
                onChange={(e) => setSite(e.target.value)}
                placeholder="اسم الموقع كما في السجل"
                className="nx-focus-ring mt-1.5 h-11"
              />
            </div>
            <div>
              <Label htmlFor="mo-region">المنطقة</Label>
              <select
                id="mo-region"
                value={region}
                onChange={(e) => setRegion(e.target.value as RegionId)}
                className={cn(FIELD, "mt-1.5")}
              >
                {REGIONS.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.shortAr}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <Label htmlFor="mo-desc">وصف العطل</Label>
            <Textarea
              id="mo-desc"
              value={description}
              maxLength={2000}
              required
              onChange={(e) => setDescription(e.target.value)}
              placeholder="ماذا لا يعمل؟ منذ متى؟ هل جُرّب شيء؟"
              className="nx-focus-ring mt-1.5 min-h-24"
            />
          </div>

          <fieldset>
            <legend className="mb-1.5 text-sm font-medium">نوع الصيانة</legend>
            <div className="grid grid-cols-2 gap-1.5">
              {(["corrective", "preventive"] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  aria-pressed={kind === k}
                  onClick={() => setKind(k)}
                  className={cn(
                    "nx-focus-ring min-h-11 rounded-lg border text-[13px] font-bold",
                    kind === k
                      ? "border-[color:var(--tone-blue)] bg-[color:var(--tone-blue)] text-[color:var(--surface)]"
                      : "border-[color:var(--hairline)] text-[color:var(--ink)]",
                  )}
                >
                  {k === "corrective" ? "تصحيحية — عطلٌ قائم" : "وقائية — فحصٌ دوري"}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-1.5 text-sm font-medium">الأولوية</legend>
            <div className="grid grid-cols-4 gap-1.5">
              {PRIORITY.map(([v, label]) => (
                <button
                  key={v}
                  type="button"
                  aria-pressed={priority === v}
                  onClick={() => setPriority(v)}
                  className={cn(
                    "nx-focus-ring min-h-11 rounded-lg border text-[13px] font-bold",
                    priority === v
                      ? "border-[color:var(--tone-blue)] bg-[color:var(--tone-blue)] text-[color:var(--surface)]"
                      : "border-[color:var(--hairline)] text-[color:var(--ink)]",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </fieldset>

          <div>
            <Label htmlFor="mo-due">الإنجاز المتفق عليه (اختياري)</Label>
            <ArabicDateField id="mo-due" value={dueAt} onChange={setDueAt} className="mt-1.5" />
          </div>

          <Button
            type="submit"
            disabled={!user || !valid || m.isPending}
            className="h-12 text-base font-bold"
          >
            {m.isPending && <Loader2 className="size-4 animate-spin" />}
            إنشاء أمر العمل
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
