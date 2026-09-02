const firebaseConfig = {
  apiKey: "AIzaSyBV41WhaT_2MXYMAfEMJU0T2SE7_spODM8",
  authDomain: "wa-crm-mini.firebaseapp.com",
  projectId: "wa-crm-mini",
  storageBucket: "wa-crm-mini.firebasestorage.app",
  messagingSenderId: "57196443945",
  appId: "1:57196443945:web:5c2c1db91af6cf3219df38"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();
