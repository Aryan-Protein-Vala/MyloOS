import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { SITE_URL } from '@/lib/site-status'
import './globals.css'

const TITLE = 'MYLO : Motion. Your Live Operator.'
const DESCRIPTION =
  'An ambient, screen-aware AI desktop agent that answers, coaches, and acts on top of the app you are already in — without breaking your flow.'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: '%s · MYLO',
  },
  description: DESCRIPTION,
  applicationName: 'MYLO',
  keywords: [
    'AI desktop agent',
    'screen-aware AI',
    'desktop overlay',
    'Tauri',
    'bring your own key',
  ],
  authors: [{ name: 'MYLO' }],
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    url: SITE_URL,
    siteName: 'MYLO',
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: '/icon.svg', width: 512, height: 512, alt: 'MYLO' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: ['/icon.svg'],
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
        {/* Anonymous, aggregated page views only, and only in production.
            Disclosed in /privacy. Never bundled into the desktop app. */}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
