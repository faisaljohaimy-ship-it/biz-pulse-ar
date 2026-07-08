import { useRouter, Link } from "@tanstack/react-router";
import { AlertTriangle, Home, RotateCw } from "lucide-react";

export function RouteError({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="max-w-md rounded-2xl border border-destructive/30 bg-card/80 p-6 text-center shadow-lg">
        <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-destructive" />
        <h2 className="mb-2 text-lg font-semibold text-foreground">حدث خطأ غير متوقع</h2>
        <p className="mb-4 line-clamp-3 text-sm text-muted-foreground" dir="ltr">
          {error?.message ?? "Unknown error"}
        </p>
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => {
              reset();
              router.invalidate();
            }}
            className="inline-flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/20"
          >
            <RotateCw className="h-4 w-4" /> إعادة المحاولة
          </button>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted"
          >
            <Home className="h-4 w-4" /> اللوحة الرئيسية
          </Link>
        </div>
      </div>
    </div>
  );
}

export function RouteNotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="max-w-md rounded-2xl border border-border bg-card/80 p-6 text-center shadow-lg">
        <h2 className="mb-2 text-2xl font-bold text-foreground">404</h2>
        <p className="mb-4 text-sm text-muted-foreground">الصفحة المطلوبة غير موجودة</p>
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/20"
        >
          <Home className="h-4 w-4" /> العودة للوحة
        </Link>
      </div>
    </div>
  );
}
