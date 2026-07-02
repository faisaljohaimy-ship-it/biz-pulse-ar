import { useEffect, useState } from "react";

/**
 * Developer-only brain preference toggle.
 * Hidden unless: URL contains ?dev=1  OR  localStorage.nexios_dev_mode === '1'.
 * Stores choice in localStorage.nexios_brain_pref and window.__nexios_brain_pref.
 * Executive users never see this; ARIA UI never exposes model names.
 */
export type BrainPref = "auto" | "gpt" | "claude";

export function getBrainPref(): BrainPref {
  if (typeof window === "undefined") return "auto";
  const v = window.localStorage.getItem("nexios_brain_pref");
  return v === "gpt" || v === "claude" ? v : "auto";
}

export function DeveloperBrainToggle() {
  const [visible, setVisible] = useState(false);
  const [pref, setPref] = useState<BrainPref>("auto");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("dev") === "1") {
      window.localStorage.setItem("nexios_dev_mode", "1");
    }
    setVisible(window.localStorage.getItem("nexios_dev_mode") === "1");
    setPref(getBrainPref());
    (window as unknown as { __nexios_brain_pref?: BrainPref }).__nexios_brain_pref = getBrainPref();
  }, []);

  if (!visible) return null;

  const choose = (v: BrainPref) => {
    setPref(v);
    window.localStorage.setItem("nexios_brain_pref", v);
    (window as unknown as { __nexios_brain_pref?: BrainPref }).__nexios_brain_pref = v;
  };

  return (
    <div
      dir="ltr"
      className="fixed bottom-2 left-2 z-[9999] flex items-center gap-1 rounded-md border border-cyan-400/30 bg-[#061A2E]/90 px-2 py-1 text-[10px] font-mono text-cyan-200/80 backdrop-blur"
      style={{ pointerEvents: "auto" }}
      aria-label="Developer brain selector"
    >
      <span className="opacity-60">brain:</span>
      {(["auto", "gpt", "claude"] as BrainPref[]).map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => choose(v)}
          className={`rounded px-1.5 py-0.5 transition ${
            pref === v ? "bg-cyan-400/20 text-cyan-100" : "hover:bg-white/5"
          }`}
        >
          {v}
        </button>
      ))}
    </div>
  );
}
