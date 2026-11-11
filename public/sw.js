// Huddle background helper.
// Today it only lets the app run as an installed web app. Later it will receive
// reminders from the Google back office and update the home-screen badge.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

self.addEventListener('push', event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { /* plain text push */ }
  const tasks = [];
  if (typeof data.badge === 'number' && self.navigator.setAppBadge) {
    tasks.push(data.badge > 0 ? self.navigator.setAppBadge(data.badge) : self.navigator.clearAppBadge());
  }
  if (data.title) {
    tasks.push(self.registration.showNotification(data.title, { body: data.body || '', icon: 'icon-192.png', badge: 'icon-192.png', data: { url: data.url || './' } }));
  }
  event.waitUntil(Promise.all(tasks));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(self.clients.matchAll({ type: 'window' }).then(list => {
    if (list.length) return list[0].focus();
    return self.clients.openWindow(event.notification.data?.url || './');
  }));
});
