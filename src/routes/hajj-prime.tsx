import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Radio } from "lucide-react";

// Internal-only route surface. No external lovable.app URL is printed or
// linked anywhere on this page — the embedded module is treated as an
// internal iframe target and the URL is never exposed to the user.
const EMBED_URL = "https://hajj-nexus-prime.lovable.app/?theme=dark&forceDark=1#dark";

function HajjPrimeWindow() {
  return (
    <div
      dir="ltr"
      className="dark fixed inset-0 z-[60] flex flex-col bg-[#04111f] text-white"
      style={{ colorScheme: "dark" }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-gradient-to-r from-[#061A2E] via-[#0a2740] to-[#061A2E] px-4 py-2.5 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>رجوع · Back</span>
          </Link>
          <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-black/40 px-3 py-1 text-[11px] text-white/70 sm:flex">
            <Radio className="h-3 w-3 animate-pulse text-[#3AE8FF]" />
            <Link to="/hajj-prime" className="hover:text-white">منصة نُسك الحج · Hajj Nexus Platform</Link>
            <span className="ml-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-300">
              LIVE
            </span>
          </div>
        </div>
      </div>

      {/* Iframe fills the rest */}
      <div className="relative flex-1 overflow-hidden bg-[#04111f]" style={{ colorScheme: "dark" }}>
        <iframe
          src={EMBED_URL}
          title="Hajj Nexus Prime · Live System"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
          allow="clipboard-read; clipboard-write; fullscreen"
          className="h-full w-full border-0"
          style={{ colorScheme: "dark", backgroundColor: "#04111f" }}
        />
      </div>
    </div>
  );
}

export const Route = createFileRoute("/hajj-prime")({
  component: HajjPrimeWindow,
  head: () => ({
    meta: [
      { title: "Hajj Nexus Prime · Neexios" },
      { name: "description", content: "نافذة Hajj Nexus Prime المدمجة داخل منصة Neexios بوضع داكن دائم." },
      { name: "color-scheme", content: "dark" },
      { name: "theme-color", content: "#061A2E" },
    ],
  }),
});
