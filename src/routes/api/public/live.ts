/**
 * GET /api/public/live — حياة العامل لا جاهزية التبعيات.
 *
 * `/api/public/health` يعيد 503 حين تسقط تبعية (القاعدة، مخزن الحدّ)، فهو فحص
 * **جاهزية**. هذا الفحص يجيب 200 ما دام العامل يردّ، ومعه ختم البناء — فيُفرَّق
 * «الموقع لا يردّ» عن «الموقع يردّ وتبعيته ساقطة»، ويُعرف الـcommit المخدوم من
 * ردٍّ لا يلمس أي شبكة (كتيّب الحوادث §3).
 */
import { createFileRoute } from "@tanstack/react-router";
import { buildStamp } from "@/lib/build/build-info.server";

export const Route = createFileRoute("/api/public/live")({
  server: {
    handlers: {
      GET: async () =>
        Response.json(
          {
            ok: true,
            status: "live",
            build: buildStamp(),
            timestamp: new Date().toISOString(),
          },
          { status: 200, headers: { "Cache-Control": "no-store" } },
        ),
    },
  },
});
