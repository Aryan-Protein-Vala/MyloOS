import type { Metadata } from 'next'
import '../globals.css'

export const metadata: Metadata = {
  title: 'MYLO — Motion. Your Live Operator.',
  description:
    'Desktop control panel for MYLO: connect your model provider and review the global shortcuts.',
}

/**
 * Root layout for the dashboard window.
 *
 * This is one of two root layouts (see `app/(overlay)/layout.tsx`). Route
 * groups let the overlay render into a transparent window without inheriting
 * the opaque background this stylesheet sets on `html`.
 *
 * Fonts are the system stack declared in globals.css rather than
 * `next/font/google`, which fetches over the network at build time and makes
 * the build fail on any machine or CI runner without internet access.
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  )
}
