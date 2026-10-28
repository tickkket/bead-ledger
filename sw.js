/* Offline app shell; ledger records are stored in IndexedDB, not in this cache. */
const CACHE="bead-stall-ledger-pwa-v20";
const FILES=["./","./index.html","./pwa.js","./ai-assistant.js","./hand-material.js","./daily-intake.js","./bead-conversion.js","./manifest.webmanifest",
"./icons/icon-192.png","./icons/icon-512.png","./icons/icon-maskable-512.png","./icons/apple-touch-icon.png"];
self.addEventListener("install",e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES))));
self.addEventListener("activate",e=>e.waitUntil((async()=>{
 const names=await caches.keys();
 await Promise.all(names.filter(n=>n.startsWith("bead-stall-ledger-pwa-")&&n!==CACHE).map(n=>caches.delete(n)));
 await self.clients.claim();
})()));
self.addEventListener("message",e=>{if(e.data?.type==="SKIP_WAITING")self.skipWaiting();});
self.addEventListener("fetch",e=>{
 const r=e.request;
 if(r.method!=="GET"||new URL(r.url).origin!==self.location.origin)return;
 e.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  try {const response=await fetch(r);if(response.ok)await cache.put(r,response.clone());return response;}
  catch {return (await cache.match(r))||(r.mode==="navigate"?await cache.match("./index.html"):undefined)||Response.error();}
 })());
});
