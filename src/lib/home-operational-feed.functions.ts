import { createServerFn } from "@tanstack/react-start";
import { optionalSupabaseAuth } from "@/integrations/supabase/optional-auth-middleware";

export const getHomeOperationalFeed = createServerFn({ method: "GET" })
  .middleware([optionalSupabaseAuth])
  .handler(async ({ context }) => {
    const { readHomeOperationalFeed } = await import("./home-operational-feed.server");
    return readHomeOperationalFeed(context.supabase);
  });
