/* =====================================================================
   STEM Day Cafam · Service worker
   - Guarda la app en el celular para que abra rápido y funcione con mala señal.
   - Recibe los avisos (Web Push) aunque la app esté cerrada.
   IMPORTANTE: cambia CACHE (steam-v1 → steam-v2 …) cada vez que subas cambios a GitHub.
   ===================================================================== */
const CACHE = 'steam-v64';
const SHELL = [
  './', 'index.html', 'manifest.json', 'css/app.css',
  'js/config.js', 'js/avatar.js', 'js/actividades.js', 'js/lider.js','js/mapa.js', 'js/colegio.js', 'js/sonidos.js', 'js/importar-excel.js', 'js/app.js', 'js/v30.js', 'js/mayores.js', 'js/turnos.js', 'js/asistencia-oficial.js', 'img/rompecabezas.jpg', 'js/admin.js', 'js/encuestas.js', 'js/copa.js', 'js/copamaster.js', 'sonidos/correcta.mp3', 'sonidos/incorrecta.mp3', 'sonidos/puntos.mp3', 'sonidos/podio.mp3', 'sonidos/aviso.mp3',
  'icon-192.png', 'icon-512.png', 'apple-touch-icon.png', 'badge-96.png'
];

// v63: librerías externas (Supabase, Excel, fuentes) también quedan guardadas para abrir la app sin internet
const CDN = ['https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.2/dist/umd/supabase.js'];
const EXTERNO = /(^|\.)(cdn\.jsdelivr\.net|fonts\.googleapis\.com|fonts\.gstatic\.com|cdnjs\.cloudflare\.com|unpkg\.com)$/;
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL).then(() => Promise.all(CDN.map(u => c.add(u).catch(() => {}))))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// v63: la app avisa cuando hay una versión nueva; se activa al volver el internet
self.addEventListener('message', e => { if (e.data && e.data.tipo === 'actualizar') self.skipWaiting(); });

// Archivos de la app: primero la red (para tener siempre la última versión), si no hay señal, la copia guardada.
// Datos de Supabase: nunca se guardan aquí (siempre en vivo).
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method === 'GET' && EXTERNO.test(url.hostname)) {   // v63: primero la copia guardada (no cambian)
    e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(x => { if (x.ok || x.type === 'opaque') { const c = x.clone(); caches.open(CACHE).then(k => k.put(e.request, c)); } return x; })));
    return;
  }
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  // Los videos no pasan por aquí: el navegador los pide por partes y se descargan directo.
  if (/\.(mp4|webm|mov|m4a)$/i.test(url.pathname) || e.request.headers.has('range')) return;
  e.respondWith(
    fetch(e.request).then(r => {
      if (r.ok) { const copia = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copia)); }
      return r;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('index.html')))
  );
});

// v55 · Notificación como la de WhatsApp: título con quién escribe, el mensaje, la hora, el sonido y la vibración del celular.
// Si la app está abierta en pantalla, no se muestra (la app ya avisa adentro con su sonido).
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) { d = { title: 'STEM Day', body: e.data ? e.data.text() : '' }; }
  e.waitUntil((async () => {
    const cs = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const visible = cs.some(c => c.visibilityState === 'visible' && c.focused);
    if (visible && !/prueba/.test(d.tag || '')) { cs.forEach(c => c.postMessage({ tipo: 'push', d })); return; }
    const tag = d.tag || 'steam';
    // mensajes seguidos de la misma conversación se agrupan en una sola notificación (las últimas 5 líneas)
    let lineas = [d.body || ''];
    if (/^(chat|turnos)-/.test(tag)) {
      const prev = await self.registration.getNotifications({ tag });
      const ant = prev.length && prev[0].data && prev[0].data.lineas || [];
      lineas = ant.concat(d.body || '').slice(-5);
      prev.forEach(n => n.close());
    }
    const n = lineas.length;
    await self.registration.showNotification(n > 1 ? `${d.title} (${n} ${/^turnos-/.test(tag) ? 'propuestas' : 'mensajes'})` : (d.title || 'STEM Day Cafam'), {
      body: lineas.join('\n'),
      tag,
      renotify: true,
      silent: false,
      requireInteraction: !/^(chat|turnos)-/.test(tag),
      vibrate: [200, 100, 200, 100, 400],
      timestamp: d.ts || Date.now(),
      icon: 'icon-192.png',
      badge: 'badge-96.png',
      data: { url: d.url || './', sala: d.sala || null, lineas }
    });
  })());
});

// Al tocar el aviso se abre (o se enfoca) la app; si es del chat, entra a esa conversación
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const data = e.notification.data || {}, destino = data.url || './';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
    for (const c of cs) { if ('focus' in c) { c.postMessage({ tipo: 'abrir', url: destino, sala: data.sala }); return c.focus(); } }
    return self.clients.openWindow(destino + (data.sala ? (destino.includes('?') ? '&' : '?') + 'sala=' + encodeURIComponent(data.sala) : ''));
  }));
});
