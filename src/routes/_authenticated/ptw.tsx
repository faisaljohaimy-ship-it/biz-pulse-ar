/**
 * تصاريح العمل الرقمية — Digital Permit-to-Work (PTW).
 * Today board, permit cards, create form, QR verification, emergency suspend.
 * Data from the simulation-seeded permit_* tables (is_simulation=true).
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import QRCode from "react-qr-code";
import { Plus, QrCode, Siren, Clock3, ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";
import { RouteError, RouteNotFound } from "@/components/route-boundaries";
import { NexusPage, NexusCard, NexusStat, NexusPill } from "@/components/nexus-frame";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { useRegion } from "@/lib/region-context";
import { REGIONS, type RegionId } from "@/lib/regions";
import {
  getPtwOverview,
  createPermitFn,
  suspendRegionPermitsFn,
  type PtwOverview,
} from "@/lib/compliance/hcis-ptw.functions";

export const Route = createFileRoute("/_authenticated/ptw")({
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  component: PtwPage,
});

type CreatePermitInput = {
  type_key: string;
  region: RegionId;
  location: string;
  description?: string;
  contractor?: string;
  worker_count: number;
  starts_at: string;
  ends_at: string;
  precautions: string[];
};

function hoursTo(iso: string): number {
  return (new Date(iso).getTime() - Date.now()) / 3_600_000;
}

function PtwPage() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const { user, loading } = useAuth();
  const { regionId } = useRegion();
  const qc = useQueryClient();
  const fetchOverview = useServerFn(getPtwOverview);
  const createPermit = useServerFn(createPermitFn);
  const suspendRegion = useServerFn(suspendRegionPermitsFn);

  const { data, isLoading, isError, refetch } = useQuery<PtwOverview>({
    queryKey: ["ptw-overview", user?.id ?? "anon"],
    queryFn: () => fetchOverview(),
    // Guests fetch too — getPtwOverview is optional-auth; anon RLS decides.
    enabled: !loading,
    refetchInterval: 45_000,
  });

  // Guest with no anon-visible rows → sign-in card instead of all-zero stats.
  const guestEmpty = !user && !!data && data.permits.length === 0 && data.types.length === 0;

  const [showCreate, setShowCreate] = useState(false);
  const [qrPermit, setQrPermit] = useState<PtwOverview["permits"][number] | null>(null);
  const [suspendTarget, setSuspendTarget] = useState<RegionId | null>(null);

  const typeByKey = useMemo(() => new Map((data?.types ?? []).map((t) => [t.key, t])), [data]);

  const createMut = useMutation({
    mutationFn: (input: CreatePermitInput) => createPermit({ data: input }),
    onSuccess: (r) => {
      toast.success(ar ? `أُنشئ التصريح ${r.ref}` : `Created ${r.ref}`);
      setShowCreate(false);
      void qc.invalidateQueries({ queryKey: ["ptw-overview"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "error"),
  });

  const suspendMut = useMutation({
    mutationFn: (region: RegionId) => suspendRegion({ data: { region } }),
    onSuccess: (r) => {
      toast.success(
        ar ? `عُلّق ${r.suspended} تصريحًا في المنطقة` : `Suspended ${r.suspended} permits`,
      );
      setSuspendTarget(null);
      void qc.invalidateQueries({ queryKey: ["ptw-overview"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "error"),
  });

  const activePermits = (data?.permits ?? []).filter((p) => p.status === "active");

  return (
    <NexusPage
      eyebrow="DIGITAL PTW"
      title={ar ? "تصاريح العمل الرقمية" : "Digital Permit-to-Work"}
      subtitle={
        ar
          ? "من يعمل أين الآن — بترخيص وموافقات موثّقة ورمز تحقق QR لكل تصريح."
          : "Who is working where, right now — with documented approvals and a QR verification per permit."
      }
      actions={
        <div className="flex flex-wrap gap-2">
          {/* Governance: write actions render DISABLED for guests, with an
              explicit tooltip — never a dead click, never a hidden button. */}
          <button
            onClick={() => setShowCreate(true)}
            disabled={!user}
            title={!user ? (ar ? "يتطلب تسجيل الدخول" : "Sign-in required") : undefined}
            className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-cyan-400/40 bg-cyan-500/15 px-4 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/25 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-cyan-500/15"
          >
            <Plus className="h-4 w-4" /> {ar ? "تصريح جديد" : "New permit"}
          </button>
          <button
            onClick={() => setSuspendTarget(regionId)}
            disabled={!user}
            title={!user ? (ar ? "يتطلب تسجيل الدخول" : "Sign-in required") : undefined}
            className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-rose-400/40 bg-rose-500/15 px-4 text-sm font-semibold text-rose-200 transition hover:bg-rose-500/25 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-rose-500/15"
          >
            <Siren className="h-4 w-4" /> {ar ? "تعليق طوارئ" : "Emergency suspend"}
          </button>
        </div>
      }
    >
      {isError ? (
        <NexusCard className="border-rose-400/25">
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <p className="text-sm text-rose-300">
              {ar
                ? "تعذّر تحميل بيانات التصاريح — تحقّق من الاتصال ثم أعد المحاولة."
                : "Permit data failed to load — check your connection and retry."}
            </p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#3AE8FF]/40 bg-[#3AE8FF]/10 px-6 text-sm font-semibold text-[#BEEBFF] transition hover:bg-[#3AE8FF]/20 active:scale-[0.97]"
            >
              {ar ? "إعادة المحاولة" : "Retry"}
            </button>
          </div>
        </NexusCard>
      ) : isLoading || !data ? (
        <NexusCard>
          <p className="py-10 text-center text-white/50">{ar ? "جارٍ التحميل…" : "Loading…"}</p>
        </NexusCard>
      ) : guestEmpty ? (
        <NexusCard className="border-emerald-400/25">
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <p className="max-w-md text-sm leading-relaxed text-white/80">
              {ar
                ? "أنت تتصفّح كضيف. سجّل الدخول لعرض التصاريح الحيّة وإنشاء تصريح جديد."
                : "You are browsing as a guest. Sign in to view live permits and create new ones."}
            </p>
            <Link
              to="/auth"
              search={{ redirect: "/ptw" }}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-emerald-400/40 bg-emerald-500/15 px-6 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-500/25 active:scale-[0.97]"
            >
              {ar ? "تسجيل الدخول" : "Sign in"}
            </Link>
          </div>
        </NexusCard>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <NexusStat
              label={ar ? "ساري الآن" : "Active now"}
              value={String(data.counts.active)}
              tone="emerald"
            />
            <NexusStat
              label={ar ? "بانتظار موافقة" : "Pending approval"}
              value={String(data.counts.pending)}
              tone="amber"
            />
            <NexusStat
              label={ar ? "ينتهي خلال ساعتين" : "Ending ≤ 2h"}
              value={String(data.counts.endingSoon)}
              tone="rose"
            />
            <NexusStat
              label={ar ? "منتهٍ اليوم" : "Expired today"}
              value={String(data.counts.expiredToday)}
              tone="cyan"
            />
          </div>

          <NexusCard>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white/80">
              <ShieldCheck className="h-4 w-4 text-emerald-300" />{" "}
              {ar ? "التصاريح السارية" : "Active permits"}
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {activePermits.map((p) => {
                const t = typeByKey.get(p.type_key);
                const h = hoursTo(p.ends_at);
                const soon = h <= 2 && h >= 0;
                return (
                  <div
                    key={p.id}
                    className="rounded-2xl border p-4"
                    style={{
                      borderColor: `${t?.color ?? "#22D3EE"}55`,
                      background: `${t?.color ?? "#22D3EE"}0f`,
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span
                          className="inline-flex items-center gap-1.5 text-xs font-semibold"
                          style={{ color: t?.color ?? "#22D3EE" }}
                        >
                          <i
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ background: t?.color ?? "#22D3EE" }}
                          />
                          {ar ? (t?.name_ar ?? p.type_key) : (t?.name_en ?? p.type_key)}
                        </span>
                        <p className="mt-1 font-mono text-[11px] text-white/50">{p.ref}</p>
                      </div>
                      <button
                        onClick={() => setQrPermit(p)}
                        aria-label="QR"
                        className="rounded-lg border border-white/15 bg-white/5 p-1.5 text-white/70 hover:text-white"
                      >
                        <QrCode className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="mt-2 text-sm text-white/85">{p.location}</p>
                    <p className="text-[11px] text-white/50">
                      {p.contractor} · {p.worker_count} {ar ? "عامل" : "workers"}
                    </p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-[11px] text-white/50">
                        {REGIONS.find((r) => r.id === (p.region as RegionId))?.shortAr}
                      </span>
                      {soon && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-200">
                          <Clock3 className="h-3 w-3" /> {ar ? "ينتهي قريبًا" : "ending soon"}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
              {activePermits.length === 0 && (
                <p className="col-span-full py-6 text-center text-white/40">
                  {ar ? "لا تصاريح سارية" : "No active permits"}
                </p>
              )}
            </div>
          </NexusCard>
        </>
      )}

      {/* Create form */}
      {showCreate && (
        <CreatePermitModal
          ar={ar}
          types={data?.types ?? []}
          defaultRegion={regionId}
          pending={createMut.isPending}
          onClose={() => setShowCreate(false)}
          onSubmit={(v) => createMut.mutate(v)}
        />
      )}

      {/* QR modal */}
      {qrPermit && (
        <Modal onClose={() => setQrPermit(null)}>
          <div className="text-center">
            <h3 className="text-lg font-bold text-white">
              {ar ? "رمز التحقق" : "Verification QR"}
            </h3>
            <p className="mb-4 font-mono text-xs text-white/50">{qrPermit.ref}</p>
            <div className="mx-auto w-fit rounded-xl bg-white p-3">
              <QRCode
                value={`${typeof window !== "undefined" ? window.location.origin : ""}/verify/permit/${qrPermit.id}`}
                size={190}
              />
            </div>
            <p className="mt-4 text-xs text-white/60">
              {ar
                ? "امسح الرمز للتحقق الفوري من صلاحية التصريح"
                : "Scan to verify this permit instantly"}
            </p>
          </div>
        </Modal>
      )}

      {/* Emergency suspend — mandatory human confirmation */}
      {suspendTarget && (
        <Modal onClose={() => setSuspendTarget(null)}>
          <div className="text-center">
            <Siren className="mx-auto h-8 w-8 text-rose-400" />
            <h3 className="mt-2 text-lg font-bold text-white">
              {ar ? "تأكيد بشري إلزامي" : "Mandatory human confirmation"}
            </h3>
            <p className="mt-2 text-sm text-white/70">
              {ar
                ? `سيتم تعليق جميع التصاريح السارية في منطقة «${REGIONS.find((r) => r.id === suspendTarget)?.shortAr}» فورًا وإشعار أصحابها.`
                : `All active permits in the ${REGIONS.find((r) => r.id === suspendTarget)?.shortEn} region will be suspended immediately.`}
            </p>
            <div className="mt-5 flex justify-center gap-3">
              <button
                onClick={() => setSuspendTarget(null)}
                className="min-h-[44px] rounded-xl border border-white/20 px-5 text-sm text-white/80 hover:bg-white/5"
              >
                {ar ? "إلغاء" : "Cancel"}
              </button>
              <button
                onClick={() => suspendMut.mutate(suspendTarget)}
                disabled={suspendMut.isPending}
                className="min-h-[44px] rounded-xl bg-rose-500 px-5 text-sm font-bold text-white hover:bg-rose-600 disabled:opacity-50"
              >
                {ar ? "تأكيد التعليق" : "Confirm suspend"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </NexusPage>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-[80] grid place-items-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-3xl border border-white/15 bg-[#06101f]/95 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="close"
          className="absolute end-4 top-4 text-white/50 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>
        {children}
      </div>
    </div>
  );
}

function CreatePermitModal({
  ar,
  types,
  defaultRegion,
  pending,
  onClose,
  onSubmit,
}: {
  ar: boolean;
  types: PtwOverview["types"];
  defaultRegion: RegionId;
  pending: boolean;
  onClose: () => void;
  onSubmit: (v: {
    type_key: string;
    region: RegionId;
    location: string;
    description?: string;
    contractor?: string;
    worker_count: number;
    starts_at: string;
    ends_at: string;
    precautions: string[];
  }) => void;
}) {
  const [typeKey, setTypeKey] = useState(types[0]?.key ?? "hot_work");
  const [region, setRegion] = useState<RegionId>(defaultRegion);
  const [location, setLocation] = useState("");
  const [contractor, setContractor] = useState("");
  const [workers, setWorkers] = useState(2);
  const label = (n: number, ar2: string, en: string) => `${n}. ${ar ? ar2 : en}`;
  const inputCls =
    "w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/60";
  return (
    <Modal onClose={onClose}>
      <h3 className="mb-4 text-lg font-bold text-white">
        {ar ? "إنشاء تصريح عمل" : "Create work permit"}
      </h3>
      <div className="space-y-3">
        <label className="block text-xs text-white/60">
          {label(1, "نوع التصريح", "Permit type")}
          <select
            value={typeKey}
            onChange={(e) => setTypeKey(e.target.value)}
            className={`mt-1 ${inputCls}`}
          >
            {types.map((t) => (
              <option key={t.key} value={t.key}>
                {ar ? t.name_ar : t.name_en}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs text-white/60">
          {label(2, "المنطقة", "Region")}
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value as RegionId)}
            className={`mt-1 ${inputCls}`}
          >
            {REGIONS.map((r) => (
              <option key={r.id} value={r.id}>
                {ar ? r.shortAr : r.shortEn}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs text-white/60">
          {label(3, "الموقع التفصيلي", "Location")}
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className={`mt-1 ${inputCls}`}
            placeholder={ar ? "مثال: خزان الوقود ٣" : "e.g. Fuel tank 3"}
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-xs text-white/60">
            {ar ? "المقاول" : "Contractor"}
            <input
              value={contractor}
              onChange={(e) => setContractor(e.target.value)}
              className={`mt-1 ${inputCls}`}
            />
          </label>
          <label className="block text-xs text-white/60">
            {ar ? "عدد العمال" : "Workers"}
            <input
              type="number"
              min={1}
              max={200}
              value={workers}
              onChange={(e) => setWorkers(Number(e.target.value))}
              className={`mt-1 ${inputCls}`}
            />
          </label>
        </div>
      </div>
      <button
        onClick={() => {
          if (!location.trim()) return;
          const now = Date.now();
          onSubmit({
            type_key: typeKey,
            region,
            location: location.trim(),
            contractor: contractor.trim() || undefined,
            worker_count: workers,
            starts_at: new Date(now).toISOString(),
            ends_at: new Date(now + 8 * 3_600_000).toISOString(),
            precautions: [],
          });
        }}
        disabled={pending || !location.trim()}
        className="mt-5 w-full rounded-xl bg-cyan-500 py-2.5 text-sm font-bold text-[#04070F] hover:bg-cyan-400 disabled:opacity-50"
      >
        {ar ? "إرسال للموافقات" : "Submit for approval"}
      </button>
    </Modal>
  );
}
