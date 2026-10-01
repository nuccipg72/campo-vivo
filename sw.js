/* Campo Vivo — service worker.
   Rete prima, cache come rete di scorta: online prendi sempre l'ultima
   versione pubblicata, offline parte comunque l'ultima che hai aperto.
   Il contrario (cache prima) ti bloccherebbe su una versione vecchia. */
const CACHE = 'campo-vivo-v71';
const SHELL = ['./', './index.html', './manifest.webmanifest'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL).catch(() => {})));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(k => Promise.all(k.filter(x => x !== CACHE).map(x => caches.delete(x))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if(req.method !== 'GET') return;
  const url = new URL(req.url);
  if(url.origin !== location.origin) return;      // font e CDN non li tocco

  /* Il documento si chiede SEMPRE al server, scavalcando la cache del
     browser. GitHub Pages dice a Chrome di tenersi la pagina per dieci
     minuti, e in quei dieci minuti il telefono serviva la versione vecchia
     senza nemmeno provare a chiedere: tu caricavi l'aggiornamento e l'app
     continuava a partire com'era. Con 'reload' la richiesta parte davvero, e
     se la rete non c'e' si ricade sulla copia salvata come prima. */
  const documento = req.mode === 'navigate' || /\/(index\.html)?(\?|$)/.test(url.pathname + url.search);

  e.respondWith(
    fetch(documento ? new Request(req, {cache: 'reload'}) : req).then(res => {
      const copia = res.clone();
      caches.open(CACHE).then(c => c.put(req, copia)).catch(() => {});
      return res;
    }).catch(() =>
      caches.match(req, {ignoreSearch: true})     // il ?t= non deve far mancare la copia
        .then(hit => hit || caches.match('./index.html'))
    )
  );
});
