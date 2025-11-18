// next.config.mjs o next.config.js (ESM)
const basePath = '/administrativo';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  basePath,              // ✅ solo basePath
  assetPrefix: basePath,
  // ❌ QUITAMOS assetPrefix para evitar rutas raras

  async headers() {
    return [
      {
        // Archivos estáticos de Next.js (JS, CSS)
        source: `${basePath}/_next/static/(.*)`,
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=3600, stale-while-revalidate=86400",
          },
        ],
      },
      {
        // Chunks de JavaScript específicos
        source: `${basePath}/_next/static/chunks/(.*)`,
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=3600, must-revalidate",
          },
        ],
      },
      {
        // Páginas compiladas
        source: `${basePath}/_next/static/chunks/pages/(.*)`,
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=3600, must-revalidate",
          },
        ],
      },
      {
        // Archivos JavaScript en general
        source: `${basePath}/(.*).js`,
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=3600, must-revalidate",
          },
        ],
      },
      {
        // API routes - sin cache
        source: `${basePath}/api/(.*)`,
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
        ],
      },
    ];
  },

  generateBuildId: async () => {
    const now = new Date();
    const hour = Math.floor(now.getTime() / (1000 * 60 * 60));
    return `build-${hour}`;
  },

  compiler: {
    removeConsole: false,
  },
};

export default nextConfig;