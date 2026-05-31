importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-messaging-compat.js');

// Config này sẽ được khởi tạo lại ở môi trường production.
// Tuy nhiên đối với service worker, chúng ta cần truyền thẳng apiKey hoặc nạp động
// Bằng cách sử dụng URL parameters khi đăng ký ServiceWorker hoặc ghi cứng vào file cấu hình.
// Một cách phổ biến là inject các giá trị config vào đây khi build. 
// Do đây là public file, chúng ta có thể nghe firebase config qua query parameters nếu cần
// Để đơn giản, bạn có thể thay thế các biến dưới đây bằng giá trị thật nếu không dùng được ENV.
const firebaseConfig = {
  apiKey: new URL(location).searchParams.get('apiKey'),
  authDomain: new URL(location).searchParams.get('authDomain'),
  projectId: new URL(location).searchParams.get('projectId'),
  storageBucket: new URL(location).searchParams.get('storageBucket'),
  messagingSenderId: new URL(location).searchParams.get('messagingSenderId'),
  appId: new URL(location).searchParams.get('appId')
};

if (firebaseConfig.apiKey) {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
      body: payload.notification.body,
      icon: payload.data?.avatarUrl || '/vite.svg',
      tag: payload.data?.type || 'default'
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
  });
}
