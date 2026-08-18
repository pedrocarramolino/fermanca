export const siteConfig = {
  name: "Fermança",
  shortName: "Fermança",
  description:
    "Organiza tus sesiones de práctica en bloques temporizados que se encadenan automáticamente, para que solo tengas que concentrarte en practicar.",
  // Sin dominio propio todavía — cuando se configure uno, solo hay que
  // cambiar esto (ver metadataBase/OG en layout.tsx, robots.ts y sitemap.ts,
  // que ya lo leen de aquí en vez de tener la URL repetida en varios sitios).
  url: "https://fermanca.vercel.app",
  themeColor: "#0a0a0a",
  backgroundColor: "#ffffff",
  locale: "es-ES",
} as const;
