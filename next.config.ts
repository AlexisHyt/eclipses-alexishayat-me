import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  cacheLife: {
    // OpenWeatherMap refreshes its own data roughly every ten minutes, and the
    // free plan is metered — twice over, since the tab calls two endpoints:
    // revalidating faster would only spend calls.
    weather: {
      stale: 60 * 5,
      revalidate: 60 * 10,
      expire: 60 * 60,
    },
  },
};

export default nextConfig;
