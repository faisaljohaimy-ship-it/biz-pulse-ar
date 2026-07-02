import { useEffect, useState } from "react";

/**
 * NEXIOS · OfflineBanner
 * Branded connectivity indicator. Additive, non-blocking.
 */
export function OfflineBanner() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  if (online) return null;
  return (
    <div className="nx-offline-banner" role="status" aria-live="polite">
      لا يوجد اتصال بالإنترنت — بعض ميزات NEXIOS معطلة مؤقتاً · Offline mode
    </div>
  );
}
