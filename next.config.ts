import type { NextConfig } from "next";

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

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
