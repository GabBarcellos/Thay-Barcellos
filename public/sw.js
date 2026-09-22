/* Service worker: exibe notificações mesmo com o app fechado */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: "Lembrete", body: event.data ? event.data.text() : "" };
  }

  const title = payload.title || "Lembrete de agendamentos";
  const options = {
    body: payload.body || "",
    icon: "/app-icon.svg?v=4",
    badge: "/app-icon.svg?v=4",
    tag: payload.tag || "admin-reminder",
    renotify: true,
    requireInteraction: true,
    data: { url: payload.url || "/admin" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/admin";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
