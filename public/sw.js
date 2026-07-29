self.addEventListener("push", (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    return;
  }

  const title =
    typeof data.title === "string" ? data.title : "Dopa competitor alert";
  const body =
    typeof data.body === "string"
      ? data.body
      : "New competitor intelligence is ready.";
  const url =
    typeof data.url === "string" && data.url.startsWith("/")
      ? data.url
      : "/dashboard?tab=competitors";

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/icon.svg",
      badge: "/icon.svg",
      tag: "dopa-competitor-intelligence",
      data: { url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const path =
    event.notification.data &&
    typeof event.notification.data.url === "string" &&
    event.notification.data.url.startsWith("/")
      ? event.notification.data.url
      : "/dashboard?tab=competitors";
  const destination = new URL(path, self.location.origin).href;

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        for (const client of clients) {
          if ("focus" in client) {
            if ("navigate" in client) client.navigate(destination);
            return client.focus();
          }
        }
        return self.clients.openWindow(destination);
      }),
  );
});
