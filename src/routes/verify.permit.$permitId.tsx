/**
 * Public permit verification page — what a scanned PTW QR opens.
 * No auth. Fetches the safe subset from /api/public/permit-verify and shows a
 * large green (valid) or red (invalid/suspended/expired) verdict.
 */
import { createFileRoute, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, XCircle, ShieldQuestion } from "lucide-react";

export const Route = createFileRoute("/verify/permit/$permitId")({
  component: VerifyPermitPage,
});

type VerifyResult = {
  ok: boolean;
  valid?: boolean;
  permit?: {
    ref: string;
    type_key: string;
    region: string;
    location: string;
    contractor: string | null;
    worker_count: number;
    starts_at: string;
    ends_at: string;
    status: string;
    precautions: string[];
  };
};

const REGION_AR: Record<string, string> = {
  central: "الوسطى",
  western: "الغربية",
  eastern: "الشرقية",
  southern: "الجنوبية",
};
const STATUS_AR: Record<string, string> = {
  active: "ساري",
  expired: "منتهٍ",
  suspended: "معلّق",
  cancelled: "ملغى",
  pending_approval: "بانتظار موافقة",
  draft: "مسودة",
};

function VerifyPermitPage() {
  const { permitId } = useParams({ from: "/verify/permit/$permitId" });
  const { data, isLoading } = useQuery<VerifyResult>({
    queryKey: ["permit-verify", permitId],
    queryFn: async () => {
      const res = await fetch(`/api/public/permit-verify?id=${encodeURIComponent(permitId)}`, {
        headers: { accept: "application/json" },
      });
      return res.json();
    },
    retry: false,
  });

  const valid = data?.ok && data.valid;
  const found = data?.ok && data.permit;

  return (
    <div dir="rtl" className="grid min-h-dvh place-items-center bg-[#04070F] px-4 py-10 text-white">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#06101f]/80 p-6 backdrop-blur-xl">
        <div className="mb-4 flex items-center justify-between">
          <span className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-200">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-400" /> NEXIOS · PTW
          </span>
          <span className="text-xs text-white/40">تحقّق التصريح</span>
        </div>

        {isLoading ? (
          <p className="py-16 text-center text-white/50">جارٍ التحقق…</p>
        ) : !found ? (
          <div className="py-10 text-center">
            <ShieldQuestion className="mx-auto h-16 w-16 text-white/40" />
            <p className="mt-4 text-lg font-bold">تصريح غير موجود</p>
            <p className="mt-1 text-sm text-white/50">تعذّر العثور على تصريح بهذا الرمز.</p>
          </div>
        ) : (
          <>
            <div
              className={`rounded-2xl p-6 text-center ${valid ? "bg-emerald-500/15" : "bg-rose-500/15"}`}
            >
              {valid ? (
                <CheckCircle2 className="mx-auto h-20 w-20 text-emerald-400" />
              ) : (
                <XCircle className="mx-auto h-20 w-20 text-rose-400" />
              )}
              <p
                className={`mt-3 text-2xl font-extrabold ${valid ? "text-emerald-300" : "text-rose-300"}`}
              >
                {valid ? "تصريح ساري" : (STATUS_AR[data!.permit!.status] ?? "غير ساري")}
              </p>
              <p className="mt-1 font-mono text-sm text-white/60">{data!.permit!.ref}</p>
            </div>
            <dl className="mt-5 space-y-2.5 text-sm">
              <Row k="الموقع" v={data!.permit!.location} />
              <Row k="المنطقة" v={REGION_AR[data!.permit!.region] ?? data!.permit!.region} />
              <Row k="الجهة المنفّذة" v={data!.permit!.contractor ?? "—"} />
              <Row k="عدد العمال" v={String(data!.permit!.worker_count)} />
              <Row k="حتى" v={new Date(data!.permit!.ends_at).toLocaleString("ar-SA")} />
            </dl>
            {data!.permit!.precautions.length > 0 && (
              <div className="mt-4">
                <p className="mb-1.5 text-xs font-semibold text-white/60">الاحتياطات المطلوبة</p>
                <ul className="space-y-1">
                  {data!.permit!.precautions.map((p, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-white/80">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> {p}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between border-b border-white/5 pb-2">
      <dt className="text-white/50">{k}</dt>
      <dd className="font-medium text-white/90">{v}</dd>
    </div>
  );
}
