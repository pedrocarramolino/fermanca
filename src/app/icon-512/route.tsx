import { ImageResponse } from "next/og";
import { pwaIconMarkup } from "@/lib/pwa-icon";

export function GET() {
  return new ImageResponse(pwaIconMarkup(512), { width: 512, height: 512 });
}
