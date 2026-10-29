import { createFileRoute } from "@tanstack/react-router";
import { FnnWorkspace } from "@/components/finn/FnnWorkspace";

/** Public entrance; the private chat still requires the existing server owner gate. */
export const Route = createFileRoute("/fnn")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "FNN | مساحة المالك المستقلة" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: FnnWorkspace,
});
