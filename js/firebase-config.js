// =============================================
// FIREBASE-CONFIG.JS — Configuração do Firebase
//
// INSTRUÇÕES:
// 1. Acesse console.firebase.google.com
// 2. Abra seu projeto > Configurações do projeto
// 3. Role até "Seus apps" > clique em "</>  Web"
// 4. Copie o firebaseConfig que aparecer e cole aqui
// =============================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
  getFirestore, collection, addDoc, getDocs,
  deleteDoc, doc, setDoc, updateDoc, orderBy, query, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ⚠️ SUBSTITUA com as suas credenciais do Firebase:
const firebaseConfig = {
  apiKey:            "AIzaSyC5P8MEyV5Va2I4zWpmyJ1T1JzF4Fp6O2w",
  authDomain:        "nosso-lugar-9bcf6.firebaseapp.com",
  projectId:         "nosso-lugar-9bcf6",
  storageBucket:     "nosso-lugar-9bcf6.firebasestorage.app",
  messagingSenderId: "865539049756",
  appId:             "1:865539049756:web:148b917035a463a9e0d2d9",
};

const app = initializeApp(firebaseConfig);

window.firebaseDb = getFirestore(app);

window.firebaseDbLib = {
  collection, addDoc, getDocs,
  deleteDoc, doc, setDoc, updateDoc, orderBy, query, serverTimestamp
};

console.log('Firebase conectado ✓');
