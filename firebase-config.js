// Isi sama persis dengan firebase-config.js di folder user-app,
// karena admin panel dan user app pakai project Firebase yang sama.

const firebaseConfig = {
  apiKey: "GANTI_DENGAN_API_KEY_FIREBASE",
  authDomain: "GANTI.firebaseapp.com",
  projectId: "GANTI_PROJECT_ID",
  storageBucket: "GANTI.appspot.com",
  messagingSenderId: "GANTI_SENDER_ID",
  appId: "GANTI_APP_ID"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();
