import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/lib/auth-context";
import { getFnnOwnerAccess } from "./owner.functions";

export function useFnnOwner() {
  const { user, loading } = useAuth();
  const check = useServerFn(getFnnOwnerAccess);
  const access = useQuery({
    queryKey: ["fnn-owner-access", user?.id ?? "guest"],
    queryFn: async () => {
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        return await Promise.race([
          check(),
          new Promise<never>((_, reject) => {
            timer = setTimeout(() => reject(new Error("تعذّر التحقق من صلاحية المالك")), 6000);
          }),
        ]);
      } finally {
        clearTimeout(timer);
      }
    },
    enabled: !loading && Boolean(user),
    retry: false,
    staleTime: 0,
    refetchInterval: 60_000,
  });
  return {
    allowed: Boolean(user && !loading && !access.isError && access.data?.allowed),
    userId: user?.id,
    access,
  };
}
