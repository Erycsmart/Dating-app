import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCUlxyJ_-Zks_5ezhLJxp3Dfhp7vymUGIE",
  authDomain: "nansubuga-869c6.firebaseapp.com",
  projectId: "nansubuga-869c6",
  storageBucket: "nansubuga-869c6.firebasestorage.app",
  messagingSenderId: "56571829269",
  appId: "1:56571829269:web:1bffe1d71cfe8a97fc821c",
  measurementId: "G-S049N2DM54"
};
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getDatabase(app);