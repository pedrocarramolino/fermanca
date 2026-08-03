import { siteConfig } from "@/config/site";

/**
 * Placeholder monogram used for every PWA/favicon size until the real
 * brand identity is designed (see Design System phase). Generated at
 * request time via next/og so no binary assets are needed yet.
 */
export function pwaIconMarkup(size: number, opts?: { maskableSafePadding?: number }) {
  const padding = opts?.maskableSafePadding ?? 0;
  const fontSize = Math.round((size - padding * 2) * 0.42);

  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: siteConfig.themeColor,
      }}
    >
      <div
        style={{
          display: "flex",
          width: size - padding * 2,
          height: size - padding * 2,
          alignItems: "center",
          justifyContent: "center",
          fontSize,
          fontWeight: 700,
          color: siteConfig.backgroundColor,
          fontFamily: "sans-serif",
        }}
      >
        PF
      </div>
    </div>
  );
}
