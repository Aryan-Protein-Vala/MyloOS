import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site-status'

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  return ['', '/contact', '/privacy', '/terms'].map(path => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency: path === '' ? 'weekly' : 'monthly',
    priority: path === '' ? 1 : 0.6,
  }))
}
