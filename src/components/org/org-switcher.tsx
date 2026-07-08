// Wave 1 — Multi-tenancy: header org switcher.
// Bilingual AR/EN. Persists choice via switchOrg server fn, then forces a
// session refresh so the new app_metadata.current_org claim is picked up.
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Building2, Check, ChevronDown, Loader2 } from "lucide-react";
import { listMyOrgs, switchOrg } from "@/lib/org/org.functions";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

export function OrgSwitcher({ compact = false }: { compact?: boolean }) {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const fetchOrgs = useServerFn(listMyOrgs);
  const doSwitch = useServerFn(switchOrg);

  const { data: orgs, isLoading } = useQuery({
    queryKey: ["my-orgs"],
    queryFn: () => fetchOrgs(),
    staleTime: 60_000,
  });

  const switchMutation = useMutation({
    mutationFn: (org_id: string) => doSwitch({ data: { org_id } }),
    onSuccess: async () => {
      // Refresh the JWT so the new app_metadata.current_org claim is loaded.
      await supabase.auth.refreshSession();
      await queryClient.invalidateQueries();
      toast.success(ar ? "تم تبديل المؤسسة" : "Organization switched");
      setOpen(false);
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(ar ? "تعذر التبديل" : "Switch failed", { description: message });
    },
  });

  const current = orgs?.find((o) => o.is_current) ?? orgs?.[0];

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        {!compact && <span>{ar ? "جارٍ التحميل…" : "Loading…"}</span>}
      </div>
    );
  }

  if (!orgs || orgs.length === 0 || !current) {
    return null;
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-9 gap-2 text-xs font-semibold"
          aria-label={ar ? "تبديل المؤسسة" : "Switch organization"}
        >
          <Building2 className="h-3.5 w-3.5 text-primary" />
          <span className="max-w-[180px] truncate">{current.name}</span>
          <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">
            {current.role}
          </span>
          <ChevronDown className="h-3.5 w-3.5 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>{ar ? "مؤسساتك" : "Your organizations"}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {orgs.map((o) => (
          <DropdownMenuItem
            key={o.id}
            disabled={switchMutation.isPending}
            onClick={() => {
              if (o.is_current) return;
              switchMutation.mutate(o.id);
            }}
            className="flex items-center justify-between gap-3"
          >
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">{o.name}</div>
              <div className="flex items-center gap-2 text-[10px] uppercase text-muted-foreground">
                <span>{o.plan}</span>
                <span>·</span>
                <span>{o.role}</span>
                <span>·</span>
                <span className={o.status === "active" ? "text-emerald-500" : "text-amber-500"}>
                  {o.status}
                </span>
              </div>
            </div>
            {o.is_current && <Check className="h-4 w-4 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
