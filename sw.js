// Lưu giao diện web app vào máy để mở được khi không có mạng. Truyện không nằm ở đây (nằm trong IndexedDB).
// Đổi VERSION mỗi lần sửa giao diện: điện thoại tải bản mới khi có mạng, bản cũ tự xoá, app báo "Đã có bản mới · Tải lại".
const VERSION = 'doc-truyen-v3';
const FILES = ['./', 'index.html', 'manifest.webmanifest', 'icon-180.png', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', e => {
  // cache: 'reload' = lấy thẳng từ máy chủ, không dùng bản cũ trong bộ nhớ đệm của trình duyệt
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Lấy trong máy trước (mở nhanh, chạy offline), đồng thời hỏi mạng để cập nhật bản lưu cho lần mở sau
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  const key = req.mode === 'navigate' ? 'index.html' : req;
  e.respondWith(caches.open(VERSION).then(async cache => {
    const hit = await cache.match(key, { ignoreSearch: true });
    const net = fetch(req).then(res => {
      if (res.ok && res.type === 'basic') cache.put(key, res.clone());
      return res;
    }).catch(() => null);
    if (hit) { e.waitUntil(net); return hit; }
    return (await net) || new Response('Đang offline và trang chưa được lưu vào máy. Mở lại khi có mạng nhé.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }));
});
