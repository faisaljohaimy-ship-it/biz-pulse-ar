/**
 * قرار المالك ٢٠٢٦/٠٨/١٢ — نقل نافذة الحوكمة إلى شريط الأمن الصناعي.
 * النقل نقل **عنوان** لا نسخ شاشة: المكوّن يبقى في governance.tsx وفق
 * سياسة الإخفاء القائمة (الملفات تُبقى)، وهذا المسار يستورده ويقدّمه
 * على /sec/governance، والعنوان القديم /governance يحوّل إلى هنا.
 */
import { RouteError, RouteNotFound } from "@/components/route-boundaries";
import { createFileRoute } from "@tanstack/react-router";
import { GovernancePage } from "./governance";

export const Route = createFileRoute("/_authenticated/sec/governance")({
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  component: GovernancePage,
});
