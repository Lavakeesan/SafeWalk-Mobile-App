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
                            displayName: userData.fullName || userData.username || firebaseUser.displayName || '',
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

    const register = async (email, password, fullName, phone = '') => {
        try {
            setError(null);
            setLoading(true);

            // Create user account
            const userCredential = await createUserWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
            const { user: firebaseUser } = userCredential;

            // Update user profile with display name
            await updateProfile(firebaseUser, {
                displayName: fullName
            });

            // Create user document in Firestore
            await setDoc(doc(db, 'users', firebaseUser.uid), {
                fullName,
                username: fullName, // Add this for dashboard compatibility
                email,
                phone, // Save the phone number
                role: 'user',
                createdAt: new Date().toISOString()
            });

            setLoading(false);
            return { success: true, user: { uid: firebaseUser.uid, email, fullName, role: 'user' } };
        } catch (err) {
            setLoading(false);
            console.error('Registration Error:', err.code, err.message);
            let errorMessage = err.message;

            // Provide user-friendly error messages
            if (err.code === 'auth/email-already-in-use') {
                errorMessage = 'This email is already registered. Please sign in instead.';
            } else if (err.code === 'auth/invalid-email') {
                errorMessage = 'Invalid email address format.';
            } else if (err.code === 'auth/weak-password') {
                errorMessage = 'Password should be at least 6 characters.';
            } else if (err.code === 'auth/operation-not-allowed') {
                errorMessage = 'Email/Password authentication is not enabled. Please contact support.';
            }

            setError(errorMessage);
            return { success: false, error: errorMessage };
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
            const userCredential = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
            const userUID = userCredential.user.uid;
            console.log('Login success - UID:', userUID);

            const userDoc = await getDoc(doc(db, 'users', userUID));
            const userData = userDoc.exists() ? userDoc.data() : null;
            console.log('Firestore userData:', userData);

            setLoading(false);
            return { success: true, user: { uid: userUID, ...userData } };
        } catch (err) {
            setLoading(false);
            console.error('Login Error:', err.code, err.message);
            let errorMessage = err.message;

            // Provide user-friendly error messages
            if (err.code === 'auth/user-not-found') {
                errorMessage = 'No account found with this email. Please register first.';
            } else if (err.code === 'auth/wrong-password') {
                errorMessage = 'Incorrect password. Please try again.';
            } else if (err.code === 'auth/invalid-credential') {
                errorMessage = 'Incorrect email or password. Please try again.';
            } else if (err.code === 'auth/invalid-email') {
                errorMessage = 'Invalid email address format.';
            } else if (err.code === 'auth/user-disabled') {
                errorMessage = 'This account has been disabled.';
            } else if (err.code === 'auth/operation-not-allowed') {
                errorMessage = 'Email/Password authentication is not enabled. Please contact support.';
            }

            setError(errorMessage);
            return { success: false, error: errorMessage };
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
