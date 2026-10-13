/** @type {import('next').NextConfig} */
const nextConfig = {
  // E2E tests run their own dev server (on the local Supabase) next to
  // `npm run dev`; a separate build dir keeps the two from colliding.
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
