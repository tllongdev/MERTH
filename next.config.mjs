/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Playwright is only used server-side in the live Home Depot adapter. Keep it
  // out of the client/runtime bundle so demo mode never tries to bundle it.
  serverExternalPackages: ["playwright"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.thdstatic.com" },
      { protocol: "https", hostname: "images.homedepot-static.com" },
    ],
  },
};

export default nextConfig;
