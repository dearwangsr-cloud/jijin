// 自动更新版 Service Worker
// 适用于 GitHub + Netlify 部署的网页 App（PWA）

const CACHE_NAME = 'fund-app-v2';

// 需要预缓存的核心文件
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

// 安装时缓存核心资源，并立即激活新 SW
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

// 激活时删除旧缓存，并立即接管页面
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
});

// 请求策略：HTML 永远优先联网，其它资源缓存优先
self.addEventListener('fetch', event => {
  const req = event.request;

  // 页面文件（html）实时更新
  if (req.mode === 'navigate' || req.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then(res => res || caches.match('/index.html')))
    );
    return;
  }

  // 其他静态资源：缓存优先，后台更新
  event.respondWith(
    caches.match(req).then(cached => {
      const networkFetch = fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
          return res;
        })
        .catch(() => cached);

      return cached || networkFetch;
    })
  );
});