import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Todo lo que hay detrás de estas rutas requiere sesión (redirige a
      // /login o solo muestra datos vacíos a un rastreador sin cookies) —
      // indexarlo no aporta nada y diluye qué páginas sí importan.
      disallow: [
        "/history",
        "/profile",
        "/settings",
        "/statistics",
        "/streaks",
        "/reminders",
        "/community",
        "/session/",
        "/api/",
      ],
    },
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
