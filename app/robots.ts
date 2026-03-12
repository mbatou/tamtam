import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/admin/", "/superadmin/", "/dashboard/", "/auth/"],
      },
    ],
    sitemap: "https://tamma.me/sitemap.xml",
  };
}
