import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/** Returns true only when there is NO Supabase session (public visitor). */
export function usePublicSession(): boolean {
  const [isPublic, setIsPublic] = useState<boolean>(true);
  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (alive) setIsPublic(!data.session);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setIsPublic(!s);
    });
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, []);
  return isPublic;
}
