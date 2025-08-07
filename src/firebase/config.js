// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
//import { getAnalytics } from "firebase/analytics";
import {getAuth} from "firebase/auth";
import {getFirestore} from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAQFQmrp1_f4qZvVEG9INZ4qWCM5rZWh1Q",
  authDomain: "realtime-collab-e4205.firebaseapp.com",
  projectId: "realtime-collab-e4205",
  storageBucket: "realtime-collab-e4205.firebasestorage.app",
  messagingSenderId: "341019195941",
  appId: "1:341019195941:web:6d39b658c79a4674f8ddcc",
  measurementId: "G-SKC1PTDMB1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
//const analytics = getAnalytics(app);
const auth =getAuth(app);
const db=getFirestore(app);

export {app,auth,db};