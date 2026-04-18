/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@ledger/ui", "@ledger/database"],
};

module.exports = nextConfig;
