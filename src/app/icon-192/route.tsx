import { ImageResponse } from "next/og";
import { pwaIconMarkup } from "@/lib/pwa-icon";

export function GET() {
  return new ImageResponse(pwaIconMarkup(192), { width: 192, height: 192 });
}
