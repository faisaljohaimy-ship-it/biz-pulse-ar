import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Loader2,
  LogOut,
  Save,
  KeyRound,
  User,
  Palette,
  Bell,
  Shield,
  Plug,
  Database,
} from "lucide-react";
import { RouteError, RouteNotFound } from "@/components/route-boundaries";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { seedAriaCorpus } from "@/lib/aria/seed-corpus.functions";

export const Route = createFileRoute("/_authenticated/settings")({
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  component: SettingsPage,
});

function SettingsPage() {
  const { t, locale, setLocale } = useI18n();
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();

  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [updatingPassword, setUpdatingPassword] = useState(false);

  const [emailAlerts, setEmailAlerts] = useState(true);
  const [pushAlerts, setPushAlerts] = useState(false);
  const [criticalOnly, setCriticalOnly] = useState(false);

  const runSeedCorpus = useServerFn(seedAriaCorpus);
  const [seedingCorpus, setSeedingCorpus] = useState(false);

  async function handleSeedCorpus() {
    setSeedingCorpus(true);
    try {
      const res = await runSeedCorpus();
      toast.success(
        locale === "ar"
          ? `تم رفع ${res.inserted} وثيقة (تم تخطي ${res.skipped})`
          : `Indexed ${res.inserted} entries (skipped ${res.skipped})`,
      );
      if (res.failures?.length) {
        toast.warning(`${res.failures.length} ${locale === "ar" ? "إخفاقات" : "failures"}`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Seed failed");
    } finally {
      setSeedingCorpus(false);
    }
  }

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoadingProfile(true);
      const { data } = await supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setDisplayName(data.display_name ?? "");
        setAvatarUrl(data.avatar_url ?? "");
      }
      setLoadingProfile(false);
    })();
    const stored = typeof window !== "undefined" ? localStorage.getItem("notif_prefs") : null;
    if (stored) {
      try {
        const p = JSON.parse(stored);
        setEmailAlerts(p.email ?? true);
        setPushAlerts(p.push ?? false);
        setCriticalOnly(p.criticalOnly ?? false);
      } catch {
        /* ignore */
      }
    }
  }, [user]);

  async function saveProfile() {
    if (!user) return;
    setSavingProfile(true);
    const { error } = await supabase
      .from("profiles")
      .upsert(
        { user_id: user.id, display_name: displayName || null, avatar_url: avatarUrl || null },
        { onConflict: "user_id" },
      );
    setSavingProfile(false);
    if (error) toast.error(error.message);
    else toast.success(t("settings.profileSaved") ?? "Profile saved");
  }

  async function changePassword() {
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setUpdatingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setUpdatingPassword(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Password updated");
      setNewPassword("");
      setConfirmPassword("");
    }
  }

  function saveNotifications() {
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "notif_prefs",
        JSON.stringify({ email: emailAlerts, push: pushAlerts, criticalOnly }),
      );
    }
    toast.success("Notification preferences saved");
  }

  const initials = (displayName || user?.email || "?").slice(0, 2).toUpperCase();

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
          {t("nav.settings") ?? "System Settings"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {locale === "ar"
            ? "إدارة الملف الشخصي، المظهر، اللغة، الإشعارات والأمان."
            : "Manage profile, appearance, language, notifications and security."}
        </p>
      </header>

      <Link
        to="/settings/microsoft"
        className="flex items-center justify-between rounded-2xl border border-border bg-card p-4 hover:bg-muted/40 transition"
      >
        <div className="flex items-center gap-3">
          <div className="rounded-lg border border-border/60 bg-background p-2">
            <Plug className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-medium">
              {locale === "ar" ? "تكامل Microsoft Identity" : "Microsoft Identity Integration"}
            </div>
            <div className="text-xs text-muted-foreground">
              {locale === "ar"
                ? "Tenant، Client ID، عناوين إعادة التوجيه، واختبار Microsoft Graph"
                : "Tenant, client ID, redirect URIs, and Microsoft Graph test"}
            </div>
          </div>
        </div>
        <span className="text-xs text-muted-foreground">
          {locale === "ar" ? "للمسؤولين" : "Admin"}
        </span>
      </Link>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4" />
            {locale === "ar" ? "الملف" : "Profile"}
          </TabsTrigger>
          <TabsTrigger value="appearance" className="gap-2">
            <Palette className="h-4 w-4" />
            {locale === "ar" ? "المظهر" : "Appearance"}
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            {locale === "ar" ? "الإشعارات" : "Notifications"}
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="h-4 w-4" />
            {locale === "ar" ? "الأمان" : "Security"}
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="profile"
          className="mt-6 space-y-4 rounded-2xl border border-border bg-card p-5"
        >
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={avatarUrl || undefined} alt={displayName} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div>
              <div className="text-sm font-medium">{user?.email}</div>
              <div className="text-xs text-muted-foreground">ID: {user?.id?.slice(0, 8)}…</div>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="display_name">
                {locale === "ar" ? "الاسم الظاهر" : "Display name"}
              </Label>
              <Input
                id="display_name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                disabled={loadingProfile}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="avatar_url">{locale === "ar" ? "رابط الصورة" : "Avatar URL"}</Label>
              <Input
                id="avatar_url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                disabled={loadingProfile}
                placeholder="https://..."
              />
            </div>
          </div>
          <Button onClick={saveProfile} disabled={savingProfile} className="gap-2">
            {savingProfile ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {locale === "ar" ? "حفظ" : "Save profile"}
          </Button>
        </TabsContent>

        <TabsContent
          value="appearance"
          className="mt-6 space-y-5 rounded-2xl border border-border bg-card p-5"
        >
          <div>
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              {t("lang.label") ?? "Language"}
            </Label>
            <div className="mt-2 flex gap-2">
              <Button
                size="sm"
                variant={locale === "ar" ? "default" : "outline"}
                onClick={() => setLocale("ar")}
              >
                العربية
              </Button>
              <Button
                size="sm"
                variant={locale === "en" ? "default" : "outline"}
                onClick={() => setLocale("en")}
              >
                English
              </Button>
            </div>
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              {locale === "ar" ? "السمة" : "Theme"}
            </Label>
            <div className="mt-2 flex gap-2">
              <Button
                size="sm"
                variant={theme === "dark" ? "default" : "outline"}
                onClick={() => setTheme("dark")}
              >
                {locale === "ar" ? "داكن" : "Dark"}
              </Button>
              <Button
                size="sm"
                variant={theme === "light" ? "default" : "outline"}
                onClick={() => setTheme("light")}
              >
                {locale === "ar" ? "فاتح" : "Light"}
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent
          value="notifications"
          className="mt-6 space-y-4 rounded-2xl border border-border bg-card p-5"
        >
          <Row
            label={locale === "ar" ? "تنبيهات البريد" : "Email alerts"}
            checked={emailAlerts}
            onChange={setEmailAlerts}
          />
          <Row
            label={locale === "ar" ? "إشعارات الدفع" : "Push notifications"}
            checked={pushAlerts}
            onChange={setPushAlerts}
          />
          <Row
            label={locale === "ar" ? "الحرجة فقط" : "Critical only"}
            checked={criticalOnly}
            onChange={setCriticalOnly}
          />
          <Button onClick={saveNotifications} className="gap-2">
            <Save className="h-4 w-4" />
            {locale === "ar" ? "حفظ التفضيلات" : "Save preferences"}
          </Button>
        </TabsContent>

        <TabsContent
          value="security"
          className="mt-6 space-y-5 rounded-2xl border border-border bg-card p-5"
        >
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">
              {locale === "ar" ? "تغيير كلمة المرور" : "Change password"}
            </h3>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="new_password">
                  {locale === "ar" ? "كلمة مرور جديدة" : "New password"}
                </Label>
                <Input
                  id="new_password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm_password">{locale === "ar" ? "تأكيد" : "Confirm"}</Label>
                <Input
                  id="confirm_password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>
            <Button onClick={changePassword} disabled={updatingPassword} className="gap-2">
              {updatingPassword ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <KeyRound className="h-4 w-4" />
              )}
              {locale === "ar" ? "تحديث" : "Update password"}
            </Button>
          </div>
          <div className="border-t border-border pt-4 space-y-2">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Database className="h-4 w-4" />
              {locale === "ar" ? "قاعدة معرفة ARIA" : "ARIA Knowledge Corpus"}
            </h3>
            <p className="text-xs text-muted-foreground">
              {locale === "ar"
                ? "يرفع 30 وثيقة مرجعية مؤسسية (سياسات، إجراءات SOP، KPIs، مسارات العمل) ويفهرسها للذاكرة الدلالية لـ ARIA. يتطلب صلاحية مسؤول."
                : "Seed 30 enterprise reference entries (policies, SOPs, KPIs, workflows) and index them for ARIA's semantic memory. Admin only."}
            </p>
            <Button
              onClick={handleSeedCorpus}
              disabled={seedingCorpus}
              variant="outline"
              className="gap-2"
            >
              {seedingCorpus ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Database className="h-4 w-4" />
              )}
              {locale === "ar" ? "بدء الفهرسة" : "Seed corpus"}
            </Button>
          </div>
          <div className="border-t border-border pt-4">
            <Button variant="destructive" onClick={() => signOut()} className="gap-2">
              <LogOut className="h-4 w-4" />
              {t("auth.signout") ?? "Sign out"}
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Row({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border/60 bg-background/40 px-4 py-3">
      <span className="text-sm">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
