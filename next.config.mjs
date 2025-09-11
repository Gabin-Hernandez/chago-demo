/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Configuración de headers para cache
  async headers() {
    return [
      {
        // Aplicar headers de cache a archivos JavaScript
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600, stale-while-revalidate=3600',
          },
        ],
      },
      {
        // Aplicar headers de cache a archivos de la aplicación
        source: '/(.*).js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600, stale-while-revalidate=3600',
          },
        ],
      },
      {
        // Headers para la página principal
        source: '/',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600, stale-while-revalidate=3600',
          },
        ],
      },
    ];
  },
  // Configuración de build ID para forzar rebuilds
  generateBuildId: async () => {
    // Usar timestamp para generar un build ID único cada hora
    const now = new Date();
    const hour = Math.floor(now.getTime() / (1000 * 60 * 60));
    return `build-${hour}`;
  },
};

export default nextConfig;
