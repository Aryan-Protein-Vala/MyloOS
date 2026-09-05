import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site-status'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: '/contact/success' },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
