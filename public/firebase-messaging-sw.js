/* Firebase Cloud Messaging service worker — handles BACKGROUND push */
importScripts("https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyBU-9-DFUYVd68wJaPr0sbMuU5yM1gL4AM",
  authDomain: "young-malang.firebaseapp.com",
  projectId: "young-malang",
  storageBucket: "young-malang.firebasestorage.app",
  messagingSenderId: "443616002616",
  appId: "1:443616002616:web:3490d55a1a09801a371ccd",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload?.notification?.title || payload?.data?.title || "Pizza King";
  const body = payload?.notification?.body || payload?.data?.body || "";
  const url = payload?.data?.url || "/";
  self.registration.showNotification(title, {
    body,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    data: { url },
    tag: payload?.data?.tag || "youngmalang",
    requireInteraction: false,
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification?.data?.url || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if ("focus" in w) {
          w.navigate(url);
          return w.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
