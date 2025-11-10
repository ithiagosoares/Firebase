import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

export const firebaseConfig = {
  projectId: "studio-296644579-18969",
  appId: "1:814805864825:web:f8488613ee3fdc818d5fa8",
  storageBucket: "studio-296644579-18969.appspot.com",
  apiKey: "AIzaSyBSVdKZiro4GcjbHlw0XcoaK-j6BD3DEUs",
  authDomain: "studio-296644579-18969.firebaseapp.com",
  messagingSenderId: "814805864825",
};

export const firebaseApp = !getApps().length
  ? initializeApp(firebaseConfig)
  : getApp();

export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
