/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['recharts', 'lucide-react'],
  images: {
    domains: ["images.unsplash.com"],
  },
};

module.exports = nextConfig;
