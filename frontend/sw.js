importScripts('https://www.gstatic.com/firebasejs/10.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDt__8uYr4mSKRPb_00gvzfbkS5_XMGM7s",
  authDomain: "freshalert-61e16.firebaseapp.com",
  projectId: "freshalert-61e16",
  storageBucket: "freshalert-61e16.firebasestorage.app",
  messagingSenderId: "63492535322",
  appId: "1:63492535322:web:2e34db39a6a5a7661ecda3"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(payload => {
  self.registration.showNotification(payload.notification.title, {
    body: payload.notification.body,
    icon: '/icon.png'
  });
});