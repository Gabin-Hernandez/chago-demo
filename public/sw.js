// Service Worker para gestión de cache con revalidación cada hora
const CACHE_NAME = 'chago-cache-v1';
const CACHE_DURATION = 60 * 60 * 1000; // 1 hora en milisegundos

self.addEventListener('install', function(event) {
  // Instalación silenciosa
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  // Activación silenciosa
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          // Limpiar caches antiguos silenciosamente
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function(event) {
  // Solo cachear requests GET
  if (event.request.method !== 'GET') {
    return;
  }

  // Solo cachear recursos estáticos y páginas de la app
  const url = new URL(event.request.url);
  const shouldCache = 
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname === '/' ||
    (url.origin === self.location.origin && !url.pathname.startsWith('/api/'));

  if (!shouldCache) {
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.match(event.request).then(function(cachedResponse) {
        if (cachedResponse) {
          // Verificar si el cache ha expirado
          const cachedTime = cachedResponse.headers.get('sw-cached-time');
          if (cachedTime) {
            const cacheAge = Date.now() - parseInt(cachedTime);
            if (cacheAge > CACHE_DURATION) {
              // Cache expirado, buscar nueva versión silenciosamente
              return fetchAndCache(event.request, cache);
            }
          }
          
          // Cache válido, pero verificar en background si hay actualizaciones
          // Esto asegura que la próxima visita tenga contenido fresco
          if (url.pathname.startsWith('/_next/static/')) {
            fetchAndCache(event.request, cache).catch(() => {
              // Silenciar errores de actualización en background
            });
          }
          
          // Retornar respuesta cacheada
          return cachedResponse;
        }
        
        // No hay cache, buscar y cachear
        return fetchAndCache(event.request, cache);
      });
    })
  );
});

function fetchAndCache(request, cache) {
  return fetch(request).then(function(response) {
    // Solo cachear respuestas exitosas
    if (response.status === 200) {
      const responseClone = response.clone();
      
      // Añadir timestamp al cache
      const modifiedResponse = new Response(responseClone.body, {
        status: responseClone.status,
        statusText: responseClone.statusText,
        headers: new Headers(responseClone.headers)
      });
      modifiedResponse.headers.set('sw-cached-time', Date.now().toString());
      
      cache.put(request, modifiedResponse);
    }
    return response;
  }).catch(function(error) {
    // Silenciar errores de red
    throw error;
  });
}

// Manejar mensajes para activación silenciosa
self.addEventListener('message', function(event) {
  if (event.data && event.data.action === 'skipWaiting') {
    // Activar inmediatamente el nuevo service worker
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CHECK_UPDATE') {
    // Verificar si hay actualizaciones silenciosamente
    caches.keys().then(function(cacheNames) {
      cacheNames.forEach(function(cacheName) {
        if (cacheName !== CACHE_NAME) {
          caches.delete(cacheName);
        }
      });
    });
  }
});