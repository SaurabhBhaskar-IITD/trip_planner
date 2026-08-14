/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Keep these server-only native/heavy deps external to the RSC bundle so they
  // run as normal Node dependencies.
  serverExternalPackages: ["@prisma/client", "bcryptjs"],
  eslint: {
    // Linting runs as its own pipeline stage via `npm run lint` (ESLint CLI, flat
    // config). We skip Next's build-time lint pass to avoid its flat-config plugin
    // false positive — type-checking below still fails the build on real errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Type errors MUST fail the build.
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
