import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

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
    let active = true;
    const releaseLoading = () => {
      if (active) setLoading(false);
    };

    // Mobile Safari and in-app browsers can leave auth storage/session reads
    // unresolved. Never let auth discovery block the public homepage forever.
    const authWatchdog = window.setTimeout(releaseLoading, 2500);

    // Demo capture bypass: ?demo=1 → synthetic user so /_authenticated renders
    // for product-tour screen recording. No real session is created.
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      if (sp.get("demo") === "1" || window.localStorage.getItem("nx_demo") === "1") {
        window.localStorage.setItem("nx_demo", "1");
        setUser({ id: "demo-user", email: "demo@neexios.com" } as unknown as User);
        window.clearTimeout(authWatchdog);
        releaseLoading();
        return;
      }
    }
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!active) return;
      setUser(session?.user ?? null);
      window.clearTimeout(authWatchdog);
      releaseLoading();
    });
    supabase.auth.getSession()
      .then(({ data }) => {
        if (!active) return;
        setUser(data.session?.user ?? null);
      })
      .catch((error) => {
        console.warn("Auth session lookup failed; continuing as visitor.", error);
      })
      .finally(() => {
        window.clearTimeout(authWatchdog);
        releaseLoading();
      });
    return () => {
      active = false;
      window.clearTimeout(authWatchdog);
      subscription.unsubscribe();
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
