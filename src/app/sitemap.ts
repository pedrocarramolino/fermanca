import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";
import { GUIDES } from "@/features/guides/guides";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes: Array<{ path: string; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"]; priority: number }> = [
    { path: "/", changeFrequency: "weekly", priority: 1 },
    { path: "/login", changeFrequency: "yearly", priority: 0.5 },
    { path: "/register", changeFrequency: "yearly", priority: 0.5 },
    { path: "/privacy", changeFrequency: "yearly", priority: 0.3 },
    { path: "/terms", changeFrequency: "yearly", priority: 0.3 },
    { path: "/delete-account", changeFrequency: "yearly", priority: 0.2 },
    { path: "/guias", changeFrequency: "weekly", priority: 0.8 },
  ];

  return [
    ...routes.map(({ path, changeFrequency, priority }) => ({
      url: `${siteConfig.url}${path}`,
      lastModified: new Date(),
      changeFrequency,
      priority,
    })),
    // Cada guía con su fecha real de última edición, no la de hoy: así
    // Google sabe cuándo merece la pena volver a leerla.
    ...GUIDES.map((guide) => ({
      url: `${siteConfig.url}/guias/${guide.slug}`,
      lastModified: new Date(`${guide.updatedAt}T00:00:00Z`),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
