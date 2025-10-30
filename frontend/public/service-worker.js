/* eslint-disable no-restricted-globals */
// Service Worker for Zephyra PWA - Enterprise Grade
// Robust, scalable caching strategy with proper lifecycle management

const CACHE_VERSION = '1.0.1';
const CACHE_NAME = `zephyra-v${CACHE_VERSION}`;
const STATIC_CACHE = `${CACHE_NAME}-static`;
const DYNAMIC_CACHE = `${CACHE_NAME}-dynamic`;
const IMAGE_CACHE = `${CACHE_NAME}-images`;

// Maximum cache sizes to prevent memory bloat
const MAX_DYNAMIC_CACHE_SIZE = 50;
const MAX_IMAGE_CACHE_SIZE = 100;

// Critical assets to cache immediately on install
const CRITICAL_ASSETS = [
  '/',
  '/index.html',
  '/logo.png',
  '/Google_Gemini_logo.png',
  '/manifest.json'
];

// Cache size management utility
const limitCacheSize = (cacheName, maxItems) => {
  caches.open(cacheName).then(cache => {
    cache.keys().then(keys => {
      if (keys.length > maxItems) {
        // Remove oldest entries (FIFO)
        cache.delete(keys[0]).then(() => {
          limitCacheSize(cacheName, maxItems);
        });
      }
    });
  });
};

// Install event - cache critical assets with retry logic
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker version:', CACHE_VERSION);
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        // Cache critical assets with force reload to get latest versions
        const cachePromises = CRITICAL_ASSETS.map(url => {
          return fetch(new Request(url, { cache: 'reload' }))
            .then(response => {
              if (response.ok) {
                return cache.put(url, response);
              }
              console.warn(`[SW] Failed to cache: ${url}`);
            })
            .catch(err => {
              console.warn(`[SW] Network error caching ${url}:`, err);
            });
        });
        
        return Promise.all(cachePromises);
      })
      .then(() => {
        console.log('[SW] Critical assets cached successfully');
        // Activate immediately, don't wait for old SW to finish
        return self.skipWaiting();
      })
      .catch(err => {
        console.error('[SW] Install failed:', err);
        // Still skip waiting even if caching failed
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches and take control
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker version:', CACHE_VERSION);
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        const validCacheNames = [STATIC_CACHE, DYNAMIC_CACHE, IMAGE_CACHE];
        
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Delete any cache that doesn't match current version
            if (!validCacheNames.includes(cacheName)) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Take control of all pages immediately
      self.clients.claim()
    ])
    .then(() => {
      console.log('[SW] Activation complete, now controlling all pages');
      
      // Notify all clients about the update
      return self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'SW_UPDATED',
            version: CACHE_VERSION
          });
        });
      });
    })
    .catch(err => {
      console.error('[SW] Activation error:', err);
    })
  );
});

// Fetch event - enterprise-grade caching strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // CRITICAL: Skip non-http(s) requests (chrome-extension, file, etc.)
  if (!url.protocol.startsWith('http')) {
    return; // Don't cache chrome-extension://, file://, data:, etc.
  }

  // Skip non-GET requests (POST, PUT, DELETE, etc.)
  if (request.method !== 'GET') {
    return;
  }

  // CRITICAL: Let Socket.io connections pass through completely
  if (url.pathname.includes('/socket.io/') || url.pathname.includes('websocket')) {
    return; // Don't cache, don't intercept real-time connections
  }

  // CRITICAL: API calls - Network-first with timeout and error handling
  if (url.pathname.includes('/api/')) {
    event.respondWith(
      Promise.race([
        fetch(request),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), 8000)
        )
      ])
      .then(response => {
        // Cache successful API responses for brief offline fallback
        if (response.ok && request.method === 'GET') {
          const responseClone = response.clone();
          caches.open(DYNAMIC_CACHE).then(cache => {
            cache.put(request, responseClone);
            limitCacheSize(DYNAMIC_CACHE, MAX_DYNAMIC_CACHE_SIZE);
          });
        }
        return response;
      })
      .catch(async () => {
        // Try to serve from cache if network fails
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
          console.log('[SW] Serving cached API response (offline):', url.pathname);
          return cachedResponse;
        }
        // Return structured error response
        return new Response(
          JSON.stringify({ 
            error: 'Network unavailable',
            message: 'Please check your connection and try again',
            offline: true
          }),
          { 
            status: 503,
            headers: { 
              'Content-Type': 'application/json',
              'X-Offline': 'true'
            }
          }
        );
      })
    );
    return;
  }

  // Images - Cache-first with smart caching
  if (request.destination === 'image') {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        
        return fetch(request).then((response) => {
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(IMAGE_CACHE).then((cache) => {
              cache.put(request, responseClone);
              limitCacheSize(IMAGE_CACHE, MAX_IMAGE_CACHE_SIZE);
            });
          }
          return response;
        }).catch(() => {
          // Return a placeholder or fallback
          console.log('[SW] Image fetch failed:', url.pathname);
          return new Response('', { status: 404 });
        });
      })
    );
    return;
  }

  // Static assets (JS, CSS, fonts) - Cache-first with update in background
  if (
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'font' ||
    url.pathname.includes('/static/')
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request).then((response) => {
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(STATIC_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        }).catch(err => {
          console.warn('[SW] Static asset fetch failed:', url.pathname, err);
          return cachedResponse; // Return cached version if available
        });

        // Return cached version immediately, update in background
        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // HTML/Navigation requests - Network-first with cache fallback
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(async () => {
          // Try to serve cached version
          const cachedResponse = await caches.match(request);
          if (cachedResponse) {
            console.log('[SW] Serving cached page (offline):', url.pathname);
            return cachedResponse;
          }
          
          // Fallback to cached index.html
          const indexResponse = await caches.match('/index.html');
          if (indexResponse) {
            return indexResponse;
          }
          
          // Final fallback: offline page
          return new Response(
            `<!DOCTYPE html>
            <html lang="en">
              <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Offline - Zephyra</title>
                <style>
                  body { 
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 100vh;
                    margin: 0;
                    background: linear-gradient(135deg, #E8F4FD 0%, #D1E7DD 50%, #A8DADC 100%);
                    color: #1E252B;
                    text-align: center;
                    padding: 20px;
                  }
                  .container {
                    max-width: 500px;
                  }
                  h1 { font-size: 3rem; margin: 0 0 1rem 0; }
                  p { font-size: 1.2rem; line-height: 1.6; }
                  button {
                    margin-top: 2rem;
                    padding: 12px 24px;
                    font-size: 1rem;
                    background: #3C91C5;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                  }
                  button:hover { background: #2C7BAF; }
                </style>
              </head>
              <body>
                <div class="container">
                  <h1>🌙</h1>
                  <h2>You're Offline</h2>
                  <p>Zephyra needs an internet connection to work. Please check your connection and try again.</p>
                  <button onclick="window.location.reload()">Try Again</button>
                </div>
              </body>
            </html>`,
            {
              status: 503,
              headers: { 'Content-Type': 'text/html' }
            }
          );
        })
    );
    return;
  }

  // Default: Network-first for everything else
  event.respondWith(
    fetch(request)
      .then(response => {
        if (response.ok) {
          const responseClone = response.clone();
          caches.open(DYNAMIC_CACHE).then(cache => {
            cache.put(request, responseClone);
            limitCacheSize(DYNAMIC_CACHE, MAX_DYNAMIC_CACHE_SIZE);
          });
        }
        return response;
      })
      .catch(async () => {
        const cachedResponse = await caches.match(request);
        return cachedResponse || new Response('Offline', { status: 503 });
      })
  );
});

// Handle messages from clients (e.g., manual cache clearing)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
      }).then(() => {
        console.log('[SW] All caches cleared');
        event.ports[0].postMessage({ success: true });
      })
    );
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_VERSION });
  }
});

