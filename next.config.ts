import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// Content-Security-Policy queda fuera a propósito: hacerla bien con App
// Router requiere pasar un nonce por cada layout/página (tenemos un <style>
// con dangerouslySetInnerHTML en el layout raíz que necesitaría cubrir) —
// mejor una tarea dedicada que una cabecera añadida con prisa y a medias.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

// Id de esta compilación, para que una pestaña abierta desde antes de un
// despliegue sepa que se ha quedado atrás (ver src/lib/app-version.ts). Se
// incrusta en el cliente y en el servidor a la vez, así que los dos lados de
// un mismo despliegue siempre coinciden. En local queda vacío y no se
// comprueba nada.
const buildToken = process.env.VERCEL_DEPLOYMENT_ID ?? process.env.VERCEL_GIT_COMMIT_SHA ?? "";

const nextConfig: NextConfig = {
  env: { NEXT_PUBLIC_BUILD_TOKEN: buildToken },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withNextIntl(nextConfig);
