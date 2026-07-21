/**
 * PowerBIEmbed — honest embed-readiness gate (constitution art. 21: no
 * screen implies an integration that isn't live).
 *
 * When the deployment provides VITE_POWERBI_EMBED_URL (a tenant-licensed
 * Power BI "Embed for your organization" / publish-to-web URL configured
 * per facility), the real dashboard is embedded. When absent — the
 * default — the INTERNAL analytics board renders (children) under a
 * truthful badge: embedding is wired and waiting for the facility's
 * license, nothing more is claimed. No keys or secrets live in code.
 */
import type { ReactNode } from "react";

const EMBED_URL = (import.meta.env.VITE_POWERBI_EMBED_URL as string | undefined)?.trim();

export function PowerBIEmbed({ children }: { children: ReactNode }) {
  if (EMBED_URL && /^https:\/\/app\.powerbi\.com\//.test(EMBED_URL)) {
    return (
      <div className="holo-card overflow-hidden rounded-2xl">
        <iframe
          src={EMBED_URL}
          title="Power BI"
          className="h-[70vh] w-full border-0"
          allowFullScreen
        />
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <div
        dir="rtl"
        className="inline-flex items-center gap-2 rounded-full border border-cyan-400/40 bg-cyan-400/10 px-3 py-1.5 text-[11px] text-cyan-200"
      >
        تضمين Power BI جاهز — يتطلب ترخيص المنشأة
      </div>
      {children}
    </div>
  );
}

export default PowerBIEmbed;
