import React, { createContext, useContext, useState, useEffect } from 'react';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

// Create Authentication Context
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Listen for authentication state changes and Firestore profile updates
    useEffect(() => {
        let unsubscribeDoc = null;

        const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                // Set initial user data
                setUser({
                    uid: firebaseUser.uid,
                    email: firebaseUser.email,
                    displayName: firebaseUser.displayName || '',
                });

                // Listen for real-time changes to the user's document in Firestore
                unsubscribeDoc = onSnapshot(doc(db, 'users', firebaseUser.uid), (doc) => {
                    if (doc.exists()) {
                        const userData = doc.data();
                        setUser({
                            uid: firebaseUser.uid,
                            email: firebaseUser.email,
                            displayName: userData.fullName || firebaseUser.displayName || '',
                            ...userData
                        });
                    }
                }, (err) => {
                    console.error('Firestore snapshot error:', err);
                });
            } else {
                // User is signed out
                if (unsubscribeDoc) unsubscribeDoc();
                setUser(null);
            }
            setLoading(false);
        });

        // Cleanup subscriptions on unmount
        return () => {
            unsubscribeAuth();
            if (unsubscribeDoc) unsubscribeDoc();
        };
    }, []);

    /**
     * Register a new user
     * @param {string} email - User's email
     * @param {string} password - User's password
     * @param {string} fullName - User's full name
     */
    const register = async (email, password, fullName) => {
        try {
            setError(null);
            setLoading(true);

            // Create user account
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const { user: firebaseUser } = userCredential;

            // Update user profile with display name
            await updateProfile(firebaseUser, {
                displayName: fullName
            });

            // Create user document in Firestore
            await setDoc(doc(db, 'users', firebaseUser.uid), {
                fullName,
                email,
                createdAt: new Date().toISOString(),
                trustedContacts: [],
                walkSessions: []
            });

            setLoading(false);
            return { success: true };
        } catch (err) {
            setLoading(false);
            setError(err.message);
            return { success: false, error: err.message };
        }
    };

    /**
     * Sign in existing user
     * @param {string} email - User's email
     * @param {string} password - User's password
     */
    const login = async (email, password) => {
        try {
            setError(null);
            setLoading(true);
            await signInWithEmailAndPassword(auth, email, password);
            setLoading(false);
            return { success: true };
        } catch (err) {
            setLoading(false);
            setError(err.message);
            return { success: false, error: err.message };
        }
    };

    /**
     * Sign out current user
     */
    const logout = async () => {
        try {
            setError(null);
            await signOut(auth);
            return { success: true };
        } catch (err) {
            setError(err.message);
            return { success: false, error: err.message };
        }
    };

    const value = {
        user,
        loading,
        error,
        register,
        login,
        logout
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Custom hook to use authentication context
 * @returns {object} Authentication context value
 */
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
