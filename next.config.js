/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '30mb', // for audio uploads
    },
  },
};

module.exports = nextConfig;
