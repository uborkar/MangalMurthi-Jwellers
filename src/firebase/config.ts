import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAbfU2Wx1rLuhLTdaJOk4xdDv1xlbLtVd0",
  authDomain: "mangalmurti-8eb36.firebaseapp.com",
  projectId: "mangalmurti-8eb36",
  storageBucket: "mangalmurti-8eb36.firebasestorage.app",
  messagingSenderId: "185527680224",
  appId: "1:185527680224:web:6ca32f2dedfc3241c26485",
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
