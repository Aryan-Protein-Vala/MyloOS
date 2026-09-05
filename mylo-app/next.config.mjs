/** @type {import('next').NextConfig} */
const nextConfig = {
  // Tauri loads the app from the filesystem, so everything must be static.
  output: 'export',

  // Type errors must fail the build. `ignoreBuildErrors: true` meant a broken
  // IPC signature or a renamed field shipped silently into a release.
  typescript: {
    ignoreBuildErrors: false,
  },

  // No image optimisation server exists in a static export.
  images: {
    unoptimized: true,
  },

  // Emit `overlay/index.html` rather than `overlay.html` so Tauri's asset
  // protocol resolves the /overlay route the same way in dev and in release.
  trailingSlash: true,

  productionBrowserSourceMaps: false,
}

export default nextConfig
