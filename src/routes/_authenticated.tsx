import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { RuntimeProvider } from "@/lib/runtime/RuntimeContext";
import { AriaDock } from "@/components/digital-humans/AriaDock";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  // Skip SSR so the client-side Supabase session (localStorage) is readable
  // before the auth gate runs. Without this the server has no session and
  // the gate would loop-redirect signed-in users.
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({
        to: "/auth",
        search: { redirect: location.href },
      });
    }
    return { user: data.user };
  },
  component: AuthLayout,
});

function AuthLayout() {
  return (
    <RuntimeProvider>
      <AppShell>
        <Outlet />
      </AppShell>
      <AriaDock />
    </RuntimeProvider>
  );
}
