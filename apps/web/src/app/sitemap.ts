import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: 'https://www.jawwing.com', lastModified: new Date(), changeFrequency: 'always', priority: 1 },
    { url: 'https://www.jawwing.com/about', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: 'https://www.jawwing.com/constitution', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: 'https://www.jawwing.com/terms', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: 'https://www.jawwing.com/privacy', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: 'https://www.jawwing.com/transparency', lastModified: new Date(), changeFrequency: 'weekly', priority: 0.6 },
  ];
}
