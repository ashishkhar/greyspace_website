/** @type {import('next').NextConfig} */
const nextConfig = {
  // Lets the server build into a side folder and swap it in with no downtime.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  images: {
    unoptimized: true,
  },
  turbopack: {
    root: __dirname,
  },
};

module.exports = nextConfig;
