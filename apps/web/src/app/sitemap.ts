import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE.url, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${SITE.url}/dieu-khoan`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE.url}/chinh-sach-bao-mat`, changeFrequency: "yearly", priority: 0.2 },
  ];
}
