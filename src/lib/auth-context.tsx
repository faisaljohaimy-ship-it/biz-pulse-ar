import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { authLog, installAuthDiagnostics } from "@/lib/auth-diagnostics";
import { isRecoveryUrl } from "@/lib/auth/recovery-url";

/**
 * هل هبط المستخدم من رسالة استعادة كلمة المرور؟ يُقرأ عند تحميل الوحدة، أي قبل أن ينشئ أي أثرٍ
 * عميلَ الهوية: العميل يستهلك الجزء بعد `#` ويزيله من الرابط بعد أول طلب، فمن يقرأ الرابط
 * لاحقًا (مكوّن صفحة الدخول) قد يجده فارغًا. قِيس: على شبكة سريعة سبق التوجيه الحدثَ فهبط
 * المستخدم على الرئيسية مسجَّلًا دون خطوة كلمة المرور. تُصفَّر عند إغلاق نموذج الاستعادة.
 */
let recoveryLanding = typeof window !== "undefined" && isRecoveryUrl(window.location.href);
export const recoveryLandingPending = () => recoveryLanding;
export const clearRecoveryLanding = () => {
  recoveryLanding = false;
};

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
    if (import.meta.env.DEV) {
      installAuthDiagnostics();
      void import("@/lib/auth-test-harness").then(({ installAuthTestHarness }) => {
        installAuthTestHarness();
      });
    }
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

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      authLog("auth:event", {
        event,
        hasSession: !!session,
        userId: session?.user?.id ?? null,
      });
      if (!active) return;
      // رابط الاستعادة قد يهبط على غير /auth (مثلًا تحويل الخدمة إلى الرابط الأساسي): الجلسة حُفظت
      // قبل هذا الحدث، فالانتقال الكامل إلى نموذج كلمة المرور الجديدة لا يفقد شيئًا.
      if (event === "PASSWORD_RECOVERY" && window.location.pathname !== "/auth") {
        window.location.replace("/auth?mode=reset");
        return;
      }
      setUser(session?.user ?? null);
      window.clearTimeout(authWatchdog);
      releaseLoading(`event:${event}`);
    });
    authLog("getSession:start");
    supabase.auth
      .getSession()
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
