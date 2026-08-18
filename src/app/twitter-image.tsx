import { renderSocialImage, SOCIAL_IMAGE_SIZE } from "@/lib/social-image";
import { siteConfig } from "@/config/site";

export const runtime = "nodejs";
export const alt = siteConfig.name;
export const size = SOCIAL_IMAGE_SIZE;
export const contentType = "image/png";

export default async function Image() {
  return renderSocialImage();
}
