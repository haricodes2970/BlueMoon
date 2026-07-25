/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // Linting is a separate quality gate (`pnpm lint`, its own CI job) --
    // Next's internal build-time ESLint runner resolves our flat config
    // differently (parser mismatch on type-aware rules) and is redundant.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
