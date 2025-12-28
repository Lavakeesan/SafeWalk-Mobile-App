import React, { createContext, useContext, useState, useEffect } from 'react';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updateProfile,
    sendPasswordResetEmail,
    updatePassword as firebaseUpdatePassword
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
                const userDocRef = doc(db, 'users', firebaseUser.uid);

                unsubscribeDoc = onSnapshot(userDocRef, (snapshot) => {
                    if (snapshot.exists()) {
                        const userData = snapshot.data();
                        setUser(prev => ({
                            ...prev,
                            uid: firebaseUser.uid,
                            email: firebaseUser.email,
                            displayName: userData.fullName || firebaseUser.displayName || '',
                            ...userData
                        }));
                    }
                }, (err) => {
                    // If we get a permission error right at start, it might be the race condition
                    // We'll log it but not let it crash the app experience if we're in the middle of registering
                    if (err.code === 'permission-denied') {
                        console.log('Firestore: Waiting for document permissions/creation...');
                    } else {
                        console.error('Firestore snapshot error:', err);
                    }
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
     * Send password reset email
     * @param {string} email - User's email
     */
    const sendPasswordReset = async (email) => {
        try {
            setError(null);
            setLoading(true);
            await sendPasswordResetEmail(auth, email);
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
    /**
     * Update user profile information
     * @param {string} fullName - New full name
     */
    const updateUser = async (fullName) => {
        try {
            if (!auth.currentUser) throw new Error('No user logged in');

            setLoading(true);
            // Update Auth profile
            await updateProfile(auth.currentUser, { displayName: fullName });

            // Update Firestore document
            await setDoc(doc(db, 'users', auth.currentUser.uid), {
                fullName: fullName
            }, { merge: true });

            setLoading(false);
            return { success: true };
        } catch (err) {
            setLoading(false);
            console.error('Error updating profile:', err);
            return { success: false, error: err.message };
        }
    };

    /**
     * Update user password
     * @param {string} newPassword - New password
     */
    const updatePassword = async (newPassword) => {
        try {
            if (!auth.currentUser) throw new Error('No user logged in');
            setLoading(true);
            await firebaseUpdatePassword(auth.currentUser, newPassword);
            setLoading(false);
            return { success: true };
        } catch (err) {
            setLoading(false);
            console.error('Error updating password:', err);
            return { success: false, error: err.message };
        }
    };

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
        logout,
        updateUser,
        sendPasswordReset,
        updatePassword
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
