import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBEj5Y-2cQOGaqArQAwHeMcT00i-1mPpz4",
  authDomain: "gestao-escolar-e9edb.firebaseapp.com",
  projectId: "gestao-escolar-e9edb",
  storageBucket: "gestao-escolar-e9edb.firebasestorage.app",
  messagingSenderId: "402394903775",
  appId: "1:402394903775:web:adb95c34e9015db85ca56a"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);