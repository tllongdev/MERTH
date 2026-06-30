/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.thdstatic.com" },
      { protocol: "https", hostname: "images.homedepot-static.com" },
    ],
  },
};

export default nextConfig;
