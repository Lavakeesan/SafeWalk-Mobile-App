// Firebase Configuration for SafeWalk App

import { initializeApp, getApp } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Firebase configuration from environment variables with fallback
const firebaseConfig = {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || 'AIzaSyDgniDuRezEvgGy9smJfpfZCbozmDsBVyU',
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || 'safewalk-c472e.firebaseapp.com',
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'safewalk-c472e',
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || 'safewalk-c472e.firebasestorage.app',
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '867095959962',
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '1:867095959962:web:cb985359c4cee4867e4223'
};

// Initialize Firebase 
let app;
try {
    app = initializeApp(firebaseConfig);
} catch (error) {
    // If app already exists, get the existing instance
    if (error.code === 'app/duplicate-app') {
        app = getApp();
    } else {
        throw error;
    }
}

// Initialize Firebase Authentication with platform-specific persistence
let auth;
try {
    if (Platform.OS === 'web') {
        // For web, use standard getAuth (persistence is handled automatically by Firebase)
        auth = getAuth(app);
    } else {
        // For native platforms (iOS/Android), use AsyncStorage persistence
        auth = initializeAuth(app, {
            persistence: getReactNativePersistence(AsyncStorage)
        });
    }
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

export { auth, db, firebaseConfig };
