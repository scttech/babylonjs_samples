// The service worker: it keeps the files of the game, so that the game starts with no network, and answers from them (see js/install.js, which says which files and which
// requests, and is loaded here). It is its own page, in its own thread: it has no window and no document, only the events of the browser asking it what to do.
importScripts("js/install.js");

// Installing: the files of the shell are fetched and kept, all or none. Then it does not wait for the old worker to be done with.
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(INSTALL.cache).then((cache) => cache.addAll(INSTALL.shell)).then(() => self.skipWaiting()));
});

// Activating: the caches of old versions of the game are thrown away, and the worker takes the pages that are open.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) => Promise.all(staleCaches(names).map((name) => caches.delete(name))))
      .then(() => self.clients.claim())
  );
});

// A request: if it is one of the game's own files, answer from what is kept, or fetch it and keep it. (Only a whole answer is kept: music is asked for in pieces.)
self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (cacheDecision(request.url, request.method, self.location.origin) !== "cache") return;
  event.respondWith(
    caches.match(request).then(
      (hit) =>
        hit ||
        fetch(request).then((response) => {
          if (response.status === 200) {
            const copy = response.clone();
            caches.open(INSTALL.cache).then((cache) => cache.put(request, copy));
          }
          return response;
        })
    )
  );
});
