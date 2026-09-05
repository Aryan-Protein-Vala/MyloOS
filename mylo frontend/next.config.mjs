/** @type {import('next').NextConfig} */
const nextConfig = {
  // Type errors are build errors. This site is deployed straight from the
  // repo, so silencing them just moves the failure into production.
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
