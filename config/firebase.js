// Firebase Configuration for SafeWalk App
// 
// SETUP INSTRUCTIONS:
// 1. Go to https://console.firebase.google.com/
// 2. Create a new project called "SafeWalk"
// 3. Go to Project Settings > General
// 4. Scroll down to "Your apps" and click "Web" (</> icon)
// 5. Register your app with nickname "SafeWalk Web"
// 6. Copy the firebaseConfig object and replace the placeholder values below
// 7. Enable Authentication:
//    - Go to Authentication > Sign-in method
//    - Enable "Email/Password"
// 8. Create Firestore Database:
//    - Go to Firestore Database
//    - Click "Create database"
//    - Start in "Test mode" (for development)
//    - Choose your region
//
// IMPORTANT: Replace these placeholder values with your actual Firebase config

import { initializeApp } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Firebase configuration from environment variables
// Values are loaded from .env file
const firebaseConfig = {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID
};

// Initialize Firebase
let app;
try {
    app = initializeApp(firebaseConfig);
} catch (error) {
    // If app already exists, get the existing instance
    if (error.code === 'app/duplicate-app') {
        const { getApp } = require('firebase/app');
        app = getApp();
    } else {
        throw error;
    }
}
//hjhjh
// Initialize Firebase Authentication with AsyncStorage persistence
let auth;
try {
    auth = initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage)
    });
} catch (error) {
    // If auth already initialized, get existing instance
    if (error.code === 'auth/already-initialized') {
        auth = getAuth(app);
    } else {
        throw error;
    }
}

// Initialize Firestore
const db = getFirestore(app);

export { auth, db };
