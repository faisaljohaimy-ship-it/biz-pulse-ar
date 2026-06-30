import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { RuntimeProvider } from "@/lib/runtime/RuntimeContext";
import { AriaDock } from "@/components/digital-humans/AriaDock";

export const Route = createFileRoute("/_authenticated")({
  component: AuthLayout,
});

function AuthLayout() {
  // Open access mode — no login gate. Executive surfaces render directly.
  return (
    <RuntimeProvider>
      <AppShell>
        <Outlet />
      </AppShell>
      <AriaDock />
    </RuntimeProvider>
  );
}
