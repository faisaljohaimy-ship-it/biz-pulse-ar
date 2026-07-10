import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { RuntimeProvider } from "@/lib/runtime/RuntimeContext";
import { SimulationRibbon } from "@/components/SimulationRibbon";

// Public-access mode: the entire NEXIOS surface is browsable without a
// session so the executive tour, demos, and iframe embeds render for any
// visitor. Server functions that require auth still enforce it individually.
export const Route = createFileRoute("/_authenticated")({
  ssr: false,
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
