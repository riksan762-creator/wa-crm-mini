// GANTI seluruh isi objek ini dengan config dari Firebase Console punya lo:
// Firebase Console -> Project Settings -> General -> scroll ke "Your apps" -> SDK setup and configuration
//
// Catatan: apiKey Firebase yang di sini BUKAN rahasia, aman ditaro di kode publik/GitHub.
// Yang harus dirahasiakan cuma API key WhatsApp (Fonnte/Wablas dll), itu disimpen
// terpisah di Cloudflare Worker, bukan di sini.

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
