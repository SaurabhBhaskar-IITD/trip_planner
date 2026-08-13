/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Mongoose ships optional native-ish deps that Next tries to bundle for RSC.
  // Keep it external to the server bundle so it runs as a normal Node dependency.
  serverExternalPackages: ["mongoose", "bcryptjs"],
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
