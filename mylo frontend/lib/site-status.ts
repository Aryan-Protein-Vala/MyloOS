/**
 * Single source of truth for the per-platform status shown in the footer.
 *
 * This used to be hardcoded in five separate files, which is how the site ended
 * up advertising "Windows: LIVE" for a build that had never shipped. Change it
 * here and every footer follows.
 */
export type PlatformStatus = {
  name: string
  /** Short label rendered in the footer. */
  status: string
  /** `true` renders the filled/green dot. Reserve it for shipped installers. */
  shipped: boolean
}

export const PLATFORM_STATUS: PlatformStatus[] = [
  { name: 'Windows', status: 'PRE-RELEASE', shipped: false },
  { name: 'macOS', status: 'PRE-RELEASE', shipped: false },
]

/** Where the source lives. Used by every "get it" call to action. */
export const REPO_URL = 'https://github.com/Aryan-Protein-Vala/MyloOS'
export const RELEASES_URL = `${REPO_URL}/releases`
export const CONTACT_EMAIL = 'aryansharma24112003@gmail.com'

/** Canonical public origin. Used for metadata and as the pre-hydration fallback. */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ?? 'https://mylo-frontend.vercel.app'
