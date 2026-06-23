import { Outlet, createFileRoute } from "@tanstack/react-router";
import { SecSubNav } from "@/components/sec/sec-shell";

export const Route = createFileRoute("/_authenticated/sec")({
  component: SecLayout,
});

function SecLayout() {
  return (
    <div dir="rtl" className="px-4 py-4 md:px-6">
      <SecSubNav />
      <Outlet />
    </div>
  );
}
