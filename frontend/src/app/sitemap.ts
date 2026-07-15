import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001';

  return [
    { url: siteUrl, changeFrequency: 'daily', priority: 1 },
    { url: `${siteUrl}/products`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${siteUrl}/favoritos`, changeFrequency: 'weekly', priority: 0.3 },
    { url: `${siteUrl}/pedidos/buscar`, changeFrequency: 'monthly', priority: 0.3 },
  ];
}
