import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

const BASE_URL = "";

interface SitemapEntry {
  path: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries: SitemapEntry[] = [
          { path: "/", changefreq: "daily", priority: "1.0" },
          { path: "/onboarding", changefreq: "monthly", priority: "0.8" },
          { path: "/mandi", changefreq: "daily", priority: "0.8" },
          { path: "/weather", changefreq: "daily", priority: "0.7" },
          { path: "/scan", changefreq: "monthly", priority: "0.7" },
          { path: "/what-if", changefreq: "monthly", priority: "0.7" },
          { path: "/tasks", changefreq: "daily", priority: "0.7" },
          { path: "/schemes", changefreq: "weekly", priority: "0.6" },
          { path: "/assistant", changefreq: "monthly", priority: "0.6" },
          { path: "/profile", changefreq: "monthly", priority: "0.5" },
        ];
        const urls = entries.map(
          (e) =>
            `  <url><loc>${BASE_URL}${e.path}</loc>${e.changefreq ? `<changefreq>${e.changefreq}</changefreq>` : ""}${e.priority ? `<priority>${e.priority}</priority>` : ""}</url>`,
        );
        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");
        return new Response(xml, {
          headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" },
        });
      },
    },
  },
});
