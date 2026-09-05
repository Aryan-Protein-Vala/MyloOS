import type { Metadata } from 'next'
import './overlay.css'

export const metadata: Metadata = {
  title: 'MYLO Overlay',
}

/**
 * Root layout for the transparent overlay window.
 *
 * This is a **separate root layout** from the dashboard's, which is the whole
 * point: `globals.css` sets an opaque `background` on `html`, and the root
 * element is what paints a window's canvas. A transparent Tauri window whose
 * document root has a background renders as a solid sheet across the screen
 * no matter what `body` says — overriding `body` alone does not fix it.
 *
 * Keeping the two windows on separate root layouts means the overlay can never
 * accidentally inherit the dashboard's chrome again.
 */
export default function OverlayLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
