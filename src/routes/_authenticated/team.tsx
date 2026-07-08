import { RouteError, RouteNotFound } from "@/components/route-boundaries";
import { createFileRoute } from "@tanstack/react-router";
import { Users, Mail } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { PageHeader, Section } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/team")({
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  component: TeamPage,
});

function TeamPage() {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  return (
    <Section>
      <PageHeader
        icon={Users}
        title={t("nav.team")}
        subtitle={
          locale === "ar"
            ? "تعاون مع فريقك ومشاركة المعرفة والمحادثات."
            : "Collaborate with your team and share knowledge."
        }
        badge={t("common.coming_soon")}
      />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card/60 p-5">
          <h3 className="text-sm font-semibold">
            {locale === "ar" ? "دعوة عضو" : "Invite a member"}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {locale === "ar"
              ? "أرسل دعوة بريد إلكتروني للانضمام إلى مساحة العمل."
              : "Send an email invite to join your workspace."}
          </p>
          <div className="mt-3 flex gap-2">
            <Input type="email" placeholder="email@company.com" />
            <Button>
              <Mail className="h-4 w-4" />
              {locale === "ar" ? "دعوة" : "Invite"}
            </Button>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card/60 p-5">
          <h3 className="text-sm font-semibold">
            {locale === "ar" ? "الأعضاء الحاليون" : "Current members"}
          </h3>
          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-2 rounded-lg border border-border bg-background/40 p-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-xs font-bold">
                {user?.email?.[0]?.toUpperCase()}
              </div>
              <div className="min-w-0 flex-1 truncate text-xs">{user?.email}</div>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                Owner
              </span>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}
