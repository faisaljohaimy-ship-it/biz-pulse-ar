import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { createThread, listThreads } from "@/lib/threads.functions";

export const Route = createFileRoute("/_authenticated/assistant/")({
  component: AssistantIndex,
});

function AssistantIndex() {
  const navigate = useNavigate();
  const list = useServerFn(listThreads);
  const create = useServerFn(createThread);

  useEffect(() => {
    (async () => {
      try {
        const threads = await list();
        if (threads.length > 0) {
          navigate({ to: "/assistant/$threadId", params: { threadId: threads[0].id }, replace: true });
        } else {
          const t = await create({ data: {} });
          navigate({ to: "/assistant/$threadId", params: { threadId: t.id }, replace: true });
        }
      } catch (e) {
        console.error(e);
      }
    })();
  }, [list, create, navigate]);

  return (
    <div className="flex h-full items-center justify-center p-10 text-sm text-muted-foreground">...</div>
  );
}
