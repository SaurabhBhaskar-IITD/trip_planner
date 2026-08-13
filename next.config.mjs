/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Mongoose ships optional native-ish deps that Next tries to bundle for RSC.
  // Keep it external to the server bundle so it runs as a normal Node dependency.
  serverExternalPackages: ["mongoose", "bcryptjs"],
  eslint: {
    // Lint is run explicitly in CI via `npm run lint`; do not fail the build on it.
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
