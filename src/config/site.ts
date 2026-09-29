export const siteConfig = {
  name: "Fermança",
  shortName: "Fermança",
  description:
    "Organiza tus sesiones de práctica en bloques temporizados que se encadenan automáticamente, para que solo tengas que concentrarte en practicar.",
  // Dominio público: lo leen metadataBase/OG en layout.tsx, robots.ts,
  // sitemap.ts y los avisos por correo, en vez de tener la URL repetida.
  // fermanca.vercel.app sigue funcionando (mismo proyecto de Vercel).
  url: "https://fermanca.com",
  themeColor: "#0a0a0a",
  backgroundColor: "#ffffff",
  locale: "es-ES",
} as const;
