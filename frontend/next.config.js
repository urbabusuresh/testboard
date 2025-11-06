// next.config.js
const createNextIntlPlugin = require('next-intl/plugin');
const withNextIntl = createNextIntlPlugin();

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',

  // ⚠️ skips ESLint errors during `next build`
  eslint: {
    ignoreDuringBuilds: true,
  },

  // ⚠️ skips TypeScript type-checking errors during `next build`
  typescript: {
    ignoreBuildErrors: true,
  },
};

module.exports = withNextIntl(nextConfig);
