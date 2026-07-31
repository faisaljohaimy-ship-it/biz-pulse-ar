"use client";

/**
 * InstallAppBar — "📱 حمّل FINN كتطبيق" (Phase 6).
 *
 * Android/Desktop: captures `beforeinstallprompt` and installs in one tap.
 * iOS/Safari (which never fires that event): shows the Add-to-Home-Screen
 * steps. Hidden when already installed (standalone) or after the user dismisses
 * it (remembered in localStorage). Fully RTL, ≥44px targets, self-contained.
 */
import { useEffect, useState } from "react";
import { Download, Share, Plus, X } from "lucide-react";
import { useFinnStore } from "@/lib/finn-core/state/finn-store";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "aria-install-dismissed";

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)")?.matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

const EXEC_ROUTE_PATTERNS = [
  "/executive-show",
  "/executive-showcase",
  "/executive-bridge",
  "/cinematic-demo",
  "/promo",
];

function isExecutiveRoute(): boolean {
  if (typeof window === "undefined") return false;
  return EXEC_ROUTE_PATTERNS.some((p) => window.location.pathname.startsWith(p));
}

export function InstallAppBar() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [iosHelp, setIosHelp] = useState(false);
  const ios = isIOS();
  const finnMode = useFinnStore((s) => s.mode);
  const finnOpen = finnMode !== "collapsed";

  useEffect(() => {
    if (isStandalone()) return;
    try {
      if (localStorage.getItem(DISMISS_KEY) === "1") return;
    } catch {
      /* ignore */
    }

    // Phase 3 rules: never appear on first paint. Show only after:
    //   • real beforeinstallprompt event (Android/desktop), OR
    //   • the user has already interacted with the page AND 30s elapsed
    //     (or on the second visit — tracked via localStorage).
    let interacted = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let iosTimer: ReturnType<typeof setTimeout> | undefined;

    const secondVisit = (() => {
      try {
        const seen = localStorage.getItem("nx-install-visits");
        const n = seen ? parseInt(seen, 10) : 0;
        localStorage.setItem("nx-install-visits", String(n + 1));
        return n >= 1;
      } catch {
        return false;
      }
    })();

    const maybeShow = () => {
      if (isExecutiveRoute()) return;
      if (deferred || ios) setVisible(true);
    };

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      if (secondVisit || interacted) maybeShow();
    };
    const onInteract = () => {
      interacted = true;
      timer = setTimeout(maybeShow, secondVisit ? 0 : 30_000);
      window.removeEventListener("pointerdown", onInteract);
      window.removeEventListener("keydown", onInteract);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("pointerdown", onInteract, { once: true });
    window.addEventListener("keydown", onInteract, { once: true });

    // iOS: after interaction + 30s (or immediately on second visit).
    if (ios && secondVisit) iosTimer = setTimeout(() => setVisible(true), 1500);

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("pointerdown", onInteract);
      window.removeEventListener("keydown", onInteract);
      if (timer) clearTimeout(timer);
      if (iosTimer) clearTimeout(iosTimer);
    };
  }, [ios, deferred]);

  const dismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice.catch(() => undefined);
    setDeferred(null);
    setVisible(false);
  };

  if (!visible || finnOpen || isExecutiveRoute()) return null;

  return (
    <div
      dir="rtl"
      role="region"
      aria-label="تثبيت التطبيق"
      className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-2xl ps-3 pe-[96px] pb-[calc(env(safe-area-inset-bottom,0)+12px)] sm:pe-3"
    >
      <div className="rounded-2xl border border-[#3AE8FF]/25 bg-[#06101F]/95 p-3 shadow-2xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#3AE8FF]/12 text-[#3AE8FF]">
            <Download className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold text-white">📱 حمّل FINN كتطبيق</div>
            <div className="truncate text-[12px] text-white/60">
              ثبّتها على جهازك واعمل بسرعة ودون اتصال.
            </div>
          </div>
          {ios ? (
            <button
              type="button"
              onClick={() => setIosHelp((v) => !v)}
              className="min-h-11 shrink-0 rounded-xl border border-[#3AE8FF]/40 bg-[#3AE8FF]/10 px-4 text-sm font-semibold text-[#BEEBFF]"
            >
              الطريقة
            </button>
          ) : (
            <button
              type="button"
              onClick={install}
              disabled={!deferred}
              className="min-h-11 shrink-0 rounded-xl border border-emerald-400/50 bg-emerald-400/15 px-4 text-sm font-semibold text-emerald-200 disabled:opacity-50"
            >
              تثبيت
            </button>
          )}
          <button
            type="button"
            onClick={dismiss}
            aria-label="إغلاق"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-white/50 hover:text-white"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
        {ios && iosHelp && (
          <ol className="mt-3 space-y-1.5 border-t border-white/10 pt-3 text-[12px] text-white/80">
            <li className="flex items-center gap-2">
              <Share className="h-4 w-4 text-[#3AE8FF]" aria-hidden />
              اضغط زر <span className="font-semibold">المشاركة</span> في سفاري.
            </li>
            <li className="flex items-center gap-2">
              <Plus className="h-4 w-4 text-[#3AE8FF]" aria-hidden />
              اختر <span className="font-semibold">«إضافة إلى الشاشة الرئيسية»</span>.
            </li>
            <li>
              ثم <span className="font-semibold">«إضافة»</span> — وتظهر FINN كتطبيق.
            </li>
          </ol>
        )}
      </div>
    </div>
  );
}

export default InstallAppBar;
