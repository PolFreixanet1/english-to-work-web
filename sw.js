/* AY: public app shell only. API/auth/storage responses NEVER enter a cache. */
const CACHE = 'etw-ay-shell-v1';
const base = new URL('./', self.location.href);
const local = ['./', './index.html', './english-to-work.html', './manifest.webmanifest',
  './icons/app-icon.svg', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-180.png'].map(p=>new URL(p,base).href);
const staticHosts = new Set(['cdn.tailwindcss.com','cdn.jsdelivr.net','fonts.googleapis.com','fonts.gstatic.com']);
self.addEventListener('install', event => event.waitUntil((async()=>{
  const cache = await caches.open(CACHE);
  // localhost uses the original filename; Pages serves index.html. Either may be absent.
  const assets=[...local,'https://cdn.tailwindcss.com/?plugins=forms,container-queries','https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js'];
  await Promise.all(assets.map(async url=>{try {const r=await fetch(url,{cache:'reload'});if(r.ok || r.type==='opaque')await cache.put(url,r);} catch {}}));
})()));
self.addEventListener('activate', event=>event.waitUntil((async()=>{
  for(const key of await caches.keys())if(key.startsWith('etw-ay-shell-')&&key!==CACHE)await caches.delete(key);
  await self.clients.claim();
})()));
self.addEventListener('fetch', event=>{
  const req=event.request, url=new URL(req.url);
  if(req.method!=='GET' || req.headers.has('authorization'))return;
  // Allowlist only: Supabase and other APIs go directly to the network, no offline fallback.
  if(!local.includes(url.href) && !staticHosts.has(url.hostname))return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    try {const response=await fetch(req);if(response.ok || response.type==='opaque')await cache.put(req,response.clone());return response;}
    catch(error){const saved=await cache.match(req);if(saved)return saved;
      if(req.mode==='navigate')for(const page of local.slice(0,3)){const r=await cache.match(page);if(r)return r;}
      throw error;
    }
  })());
});
self.addEventListener('notificationclick',event=>{event.notification.close();event.waitUntil(self.clients.openWindow(base.href));});
