import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { RuntimeProvider } from "@/lib/runtime/RuntimeContext";
import { SimulationRibbon } from "@/components/SimulationRibbon";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session) {
      throw redirect({
        to: "/auth",
        search: { redirect: location.href },
        replace: true,
      });
    }
  },
  component: AuthLayout,
});

function AuthLayout() {
  return (
    <RuntimeProvider>
      <SimulationRibbon />
      <AppShell>
        <Outlet />
      </AppShell>
    </RuntimeProvider>
  );
}
