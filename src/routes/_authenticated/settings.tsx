import { createFileRoute } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/settings")({
  component: Settings,
});

function Settings() {
  const { t, locale, setLocale } = useI18n();
  const { user, signOut } = useAuth();
  return (
    <div className="space-y-6 p-4 md:p-8">
      <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{t("nav.settings")}</h1>
      <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
        <div>
          <div className="text-xs text-muted-foreground">{t("auth.email")}</div>
          <div className="text-sm font-medium">{user?.email}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">{t("lang.label")}</div>
          <div className="mt-2 flex gap-2">
            <Button size="sm" variant={locale === "ar" ? "default" : "outline"} onClick={() => setLocale("ar")}>
              العربية
            </Button>
            <Button size="sm" variant={locale === "en" ? "default" : "outline"} onClick={() => setLocale("en")}>
              English
            </Button>
          </div>
        </div>
        <Button variant="destructive" onClick={() => signOut()}>
          {t("auth.signout")}
        </Button>
      </div>
    </div>
  );
}
