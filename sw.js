/* =====================================================================
   STEAM Day Cafam · Service worker
   - Guarda la app en el celular para que abra rápido y funcione con mala señal.
   - Recibe los avisos (Web Push) aunque la app esté cerrada.
   IMPORTANTE: cambia CACHE (steam-v1 → steam-v2 …) cada vez que subas cambios a GitHub.
   ===================================================================== */
const CACHE = 'steam-v1';
const SHELL = [
  './', 'index.html', 'manifest.json', 'css/app.css',
  'js/config.js', 'js/avatar.js', 'js/mapa.js', 'js/sonidos.js', 'js/importar-excel.js', 'js/app.js', 'js/admin.js',
  'img/icon-192.png', 'img/icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

// Archivos de la app: primero la red (para tener siempre la última versión), si no hay señal, la copia guardada.
// Datos de Supabase: nunca se guardan aquí (siempre en vivo).
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(
    fetch(e.request).then(r => {
      if (r.ok) { const copia = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copia)); }
      return r;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('index.html')))
  );
});

// Aviso recibido con la app cerrada
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) { d = { title: 'STEAM Day', body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || 'STEAM Day Cafam', {
    body: d.body || '',
    tag: d.tag || 'steam',
    renotify: true,
    requireInteraction: true,
    vibrate: [300, 150, 300, 150, 600],
    icon: 'img/icon-192.png',
    badge: 'img/icon-192.png',
    data: { url: d.url || './' }
  }));
});

// Al tocar el aviso se abre (o se enfoca) la app
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const destino = (e.notification.data && e.notification.data.url) || './';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
    for (const c of cs) { if ('focus' in c) return c.focus(); }
    return self.clients.openWindow(destino);
  }));
});
