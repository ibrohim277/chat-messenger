import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, GithubAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDlG9j7OM6ZaBKKkSf3gAOqMc-730D7hYE",
  authDomain: "messenger-login-5c9de.firebaseapp.com",
  projectId: "messenger-login-5c9de",
  storageBucket: "messenger-login-5c9de.firebasestorage.app",
  messagingSenderId: "420152135481",
  appId: "1:420152135481:web:9bf8fb3f354dff96cf62e8"
};

const app = initializeApp(firebaseConfig);

// 🔴 Shular aynan shunday yozilganini tekshiring:
export const auth = getAuth(app); 
export const googleProvider = new GoogleAuthProvider();
export const githubProvider = new GithubAuthProvider();


// // Import the functions you need from the SDKs you need
// import { initializeApp } from "firebase/app";
// import { getAnalytics } from "firebase/analytics";
// // TODO: Add SDKs for Firebase products that you want to use
// // https://firebase.google.com/docs/web/setup#available-libraries

// // Your web app's Firebase configuration
// // For Firebase JS SDK v7.20.0 and later, measurementId is optional
// const firebaseConfig = {
//   apiKey: "AIzaSyDlG9j7OM6ZaBKKkSf3gAOqMc-730D7hYE",
//   authDomain: "messenger-login-5c9de.firebaseapp.com",
//   projectId: "messenger-login-5c9de",
//   storageBucket: "messenger-login-5c9de.firebasestorage.app",
//   messagingSenderId: "420152135481",
//   appId: "1:420152135481:web:9bf8fb3f354dff96cf62e8",
//   measurementId: "G-FF6L12E6DQ"
// };

// // Initialize Firebase
// const app = initializeApp(firebaseConfig);
// const analytics = getAnalytics(app);