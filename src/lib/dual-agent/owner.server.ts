import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/** Server configuration only. Revalidate the account; never authorize with editable metadata. */
export async function isFnnOwner(context: {
  userId: string | null;
  supabase: SupabaseClient<Database>;
}): Promise<boolean> {
  if (!context.userId) return false;
  const ownerId = process.env.FNN_OWNER_USER_ID?.trim();
  const ownerEmail = process.env.FNN_OWNER_EMAIL?.trim().toLowerCase();
  if (!ownerId && !ownerEmail) return false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const result = await Promise.race([
      context.supabase.auth.getUser(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("owner verification timeout")), 3000);
      }),
    ]);
    const user = result.data.user;
    if (result.error || !user || user.id !== context.userId || user.is_anonymous) return false;
    // An ID, when configured, is authoritative. Email bootstrap is confirmed and freshly read.
    return ownerId
      ? user.id === ownerId
      : Boolean(user.email_confirmed_at && user.email?.toLowerCase() === ownerEmail);
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export async function requireFnnOwner(context: Parameters<typeof isFnnOwner>[0]) {
  if (!(await isFnnOwner(context))) throw new Error("مساحة FNN مخصصة لمالك النظام فقط.");
}
