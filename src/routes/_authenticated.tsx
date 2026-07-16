import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { RuntimeProvider } from "@/lib/runtime/RuntimeContext";
import { SimulationRibbon } from "@/components/SimulationRibbon";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  // Open / guest browsing: the system pages and their icons are reachable
  // WITHOUT the email + password page. There is no beforeLoad redirect to
  // "/auth" anymore.
  //
  // Security posture is unchanged: this only opens the client shell + navigation.
  // All real data stays protected server-side — Supabase RLS returns only
  // anon-visible rows for a session-less client, and every sensitive server
  // function still runs requireSupabaseAuth. So a guest browses the system in a
  // read-only demo state and can never read another tenant's data. Authenticated
  // users continue to get their real session and data automatically.
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
