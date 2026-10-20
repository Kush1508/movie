/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // Avoid double-mounting WebRTC peer connections in development
  images: {
    domains: ['images.unsplash.com', 'api.dicebear.com'],
  },
};

export default nextConfig;
