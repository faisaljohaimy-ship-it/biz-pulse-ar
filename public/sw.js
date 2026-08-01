// Bumped for the 2026-08-01 rename. The key had to change for a reason beyond
// tidiness: the manifest and the icon are precached, so an existing installed
// PWA would keep serving the OLD app name from cache and never see the rename.
// The `activate` handler below deletes every key that is not this one, so the
// old "nexios-static-*" entries are evicted on the next activation.
//
// The name is the internal slug, not the display brand: the display brand is
// Arabic and a cache key must stay ASCII.
const CACHE_NAME = "injaz-al-aamal-platform-static-v6-rename";
const PRECACHE = ["/brand-icon.png", "/finn-portrait.png", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Never cache authenticated navigation, API responses, or third-party data.
  if (
    request.method !== "GET" ||
    url.origin !== self.location.origin ||
    request.mode === "navigate" ||
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/__l5e/")
  ) {
    return;
  }

  const isStaticAsset = /\.(?:avif|css|gif|ico|jpe?g|js|png|svg|webmanifest|webp|woff2?)$/i.test(
    url.pathname,
  );
  if (!isStaticAsset) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request).then((response) => {
        if (response.ok && response.type === "basic") {
          const copy = response.clone();
          void caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      });
      return cached ?? network;
    }),
  );
});
