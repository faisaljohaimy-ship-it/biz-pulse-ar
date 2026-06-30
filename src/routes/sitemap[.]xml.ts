import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { DOMAIN_URL } from "@/lib/domain";

interface Entry {
  path: string;
  changefreq?: "weekly" | "monthly" | "daily" | "yearly";
  priority?: string;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries: Entry[] = [
          { path: "/", changefreq: "weekly", priority: "1.0" },
          { path: "/pricing", changefreq: "monthly", priority: "0.9" },
          { path: "/demo", changefreq: "weekly", priority: "0.9" },
          { path: "/request-demo", changefreq: "monthly", priority: "0.8" },
          { path: "/contact", changefreq: "monthly", priority: "0.8" },
          { path: "/book", changefreq: "monthly", priority: "0.8" },
          { path: "/executive-briefing", changefreq: "monthly", priority: "0.9" },
          { path: "/government-brief", changefreq: "monthly", priority: "0.9" },
          { path: "/trust", changefreq: "monthly", priority: "0.8" },
          { path: "/security", changefreq: "monthly", priority: "0.8" },
          { path: "/dpa", changefreq: "yearly", priority: "0.5" },
          { path: "/subprocessors", changefreq: "monthly", priority: "0.5" },
          { path: "/sla", changefreq: "yearly", priority: "0.5" },
          { path: "/customers", changefreq: "monthly", priority: "0.8" },
          { path: "/roi", changefreq: "monthly", priority: "0.8" },
          { path: "/demo-videos", changefreq: "monthly", priority: "0.7" },
          { path: "/executive-booking", changefreq: "monthly", priority: "0.8" },
          { path: "/data-room", changefreq: "monthly", priority: "0.7" },
          { path: "/privacy", changefreq: "yearly", priority: "0.3" },
          { path: "/terms", changefreq: "yearly", priority: "0.3" },
          { path: "/cookie-policy", changefreq: "yearly", priority: "0.3" },
          { path: "/aup", changefreq: "yearly", priority: "0.3" },
          { path: "/responsible-ai", changefreq: "yearly", priority: "0.4" },
          { path: "/login", changefreq: "monthly", priority: "0.4" },
        ];
        const urls = entries
          .map(
            (e) =>
              `  <url>\n    <loc>${DOMAIN_URL}${e.path}</loc>\n    <changefreq>${e.changefreq}</changefreq>\n    <priority>${e.priority}</priority>\n  </url>`,
          )
          .join("\n");
        const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
