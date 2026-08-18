import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { siteConfig } from "@/config/site";

export const SOCIAL_IMAGE_SIZE = { width: 1200, height: 630 };

/** Compartido por opengraph-image.tsx y twitter-image.tsx — ambos son
 * archivos especiales de Next.js con su propio `export default`, así que
 * esto no puede vivir en ninguno de los dos sin duplicarse; aquí solo el
 * JSX en sí. */
export async function renderSocialImage() {
  const iconData = await readFile(
    join(process.cwd(), "public/icons/icon-512x512.png"),
  );
  const iconSrc = `data:image/png;base64,${iconData.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 32,
          backgroundColor: siteConfig.themeColor,
        }}
      >
        {/* JSX de ImageResponse (Satori) — no es HTML de verdad, así que
            next/image no aplica aquí. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={iconSrc} alt="" width={160} height={160} style={{ borderRadius: 32 }} />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 72, fontWeight: 700, color: "#ffffff" }}>{siteConfig.name}</div>
          <div style={{ fontSize: 28, color: "#a1a1aa", maxWidth: 760, textAlign: "center" }}>
            {siteConfig.description}
          </div>
        </div>
      </div>
    ),
    { ...SOCIAL_IMAGE_SIZE },
  );
}
