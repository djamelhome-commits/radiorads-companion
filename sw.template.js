/* Service worker généré à partir de ce modèle ; aucune requête extérieure interceptée. */
const VERSION='__VERSION__';
const FILES=__FILES__;
const BASE=self.registration.scope;
const PREFIX='radiorads-'+encodeURIComponent(BASE)+'-';
const CACHE=PREFIX+VERSION;
const URLS=FILES.map(file=>new URL(file,BASE).href);
self.addEventListener('install',event=>event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  // addAll est atomique : une ressource absente empêche de déclarer le cache prêt.
  await cache.addAll(URLS.map(url=>new Request(url,{cache:'reload'})));
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  for(const key of await caches.keys())if(key.startsWith(PREFIX)&&key!==CACHE)await caches.delete(key);
  await self.clients.claim();
})()));
self.addEventListener('message',event=>{
  if(event.data?.type==='SKIP_WAITING')event.waitUntil(self.skipWaiting());
  if(event.data?.type==='CACHE_STATUS')event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);
    const complete=(await Promise.all(URLS.map(url=>cache.match(url)))).every(Boolean);
    event.ports[0]?.postMessage({complete,version:VERSION});
  })());
});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin||!url.href.startsWith(BASE))return;
  const pathname=url.origin+url.pathname;
  const isEntry=pathname===BASE||pathname===new URL('index.html',BASE).href;
  const asset=URLS.find(item=>item===pathname);
  if(!asset&&!isEntry)return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    const cached=await cache.match(isEntry?new URL('index.html',BASE).href:asset);
    return cached||fetch(event.request);
  })());
});
