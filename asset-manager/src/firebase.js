// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBD3y2GZQUlCf3fsSJuJBE4N9r4zxWE1WQ",
  authDomain: "moneyprogram0-d6b68.firebaseapp.com",
  projectId: "moneyprogram0-d6b68",
  storageBucket: "moneyprogram0-d6b68.firebasestorage.app",
  messagingSenderId: "220798387051",
  appId: "1:220798387051:web:bea6377c3b87cb0146822e",
  measurementId: "G-NC6T6GH2H3"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);

export { app, analytics, db };