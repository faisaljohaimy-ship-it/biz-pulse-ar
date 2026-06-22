import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { authLog, installAuthDiagnostics } from "@/lib/auth-diagnostics";

type AuthCtx = {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx>({ user: null, loading: true, signOut: async () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    installAuthDiagnostics();
    let active = true;
    const startedAt = Date.now();
    authLog("provider:mount");

    const releaseLoading = (reason: string) => {
      if (!active) return;
      authLog("loading:release", { reason, elapsedMs: Date.now() - startedAt });
      setLoading(false);
    };

    // Mobile Safari and in-app browsers can leave auth storage/session reads
    // unresolved. Never let auth discovery block the public homepage forever.
    const authWatchdog = window.setTimeout(() => {
      authLog("watchdog:fire", { afterMs: 2500 });
      releaseLoading("watchdog");
    }, 2500);

    // Demo capture bypass: ?demo=1 → synthetic user so /_authenticated renders
    // for product-tour screen recording. No real session is created.
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      if (sp.get("demo") === "1" || window.localStorage.getItem("nx_demo") === "1") {
        window.localStorage.setItem("nx_demo", "1");
        authLog("demo:bypass");
        setUser({ id: "demo-user", email: "demo@neexios.com" } as unknown as User);
        window.clearTimeout(authWatchdog);
        releaseLoading("demo");
        return;
      }
    }
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      authLog("auth:event", {
        event,
        hasSession: !!session,
        userId: session?.user?.id ?? null,
      });
      if (!active) return;
      setUser(session?.user ?? null);
      window.clearTimeout(authWatchdog);
      releaseLoading(`event:${event}`);
    });
    authLog("getSession:start");
    supabase.auth.getSession()
      .then(({ data, error }) => {
        if (!active) return;
        authLog("getSession:done", {
          hasSession: !!data.session,
          userId: data.session?.user?.id ?? null,
          error: error?.message ?? null,
        });
        setUser(data.session?.user ?? null);
      })
      .catch((error) => {
        authLog("getSession:error", { message: String(error?.message ?? error) });
        console.warn("Auth session lookup failed; continuing as visitor.", error);
      })
      .finally(() => {
        window.clearTimeout(authWatchdog);
        releaseLoading("getSession");
      });
    return () => {
      active = false;
      window.clearTimeout(authWatchdog);
      subscription.unsubscribe();
      authLog("provider:unmount");
    };
  }, []);

  return (
    <Ctx.Provider
      value={{
        user,
        loading,
        signOut: async () => {
          await supabase.auth.signOut();
        },
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
