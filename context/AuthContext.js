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
import { doc, setDoc, getDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from '../config/firebase';

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
                    photoURL: firebaseUser.photoURL || null,
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
     * @param {string} email - New email address
     * @param {string} phone - New phone number
     */
    const updateUser = async (fullName, email, phone) => {
        try {
            if (!auth.currentUser) throw new Error('No user logged in');

            setLoading(true);

            // 1. Update Profile Display Name
            if (fullName) {
                await updateProfile(auth.currentUser, { displayName: fullName });
            }

            // 2. Update Firestore document (Phone, Email, and Full Name)
            const updateData = {
                fullName: fullName,
                username: fullName, // dashboard compatibility
                email: email,
                phone: phone
            };

            // Remove undefined fields
            Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

            await setDoc(doc(db, 'users', auth.currentUser.uid), updateData, { merge: true });

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

    /**
     * Update user profile photo
     * @param {string} imageUri - Local URI of the image to upload
     */
    const updateProfilePhoto = async (imageUri) => {
        try {
            if (!auth.currentUser) throw new Error('No user logged in');
            setLoading(true);

            // 1. Prepare blob from image URI (Robust version for React Native)
            const blob = await new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.onload = function () {
                    resolve(xhr.response);
                };
                xhr.onerror = function (e) {
                    reject(new TypeError('Network request failed'));
                };
                xhr.responseType = 'blob';
                xhr.open('GET', imageUri, true);
                xhr.send(null);
            });

            // 2. Upload to Firebase Storage
            const storageRef = ref(storage, `profile_photos/${auth.currentUser.uid}`);
            await uploadBytes(storageRef, blob);

            // Close the blob to free up memory
            if (blob.close) blob.close();

            // 3. Get download URL
            const photoURL = await getDownloadURL(storageRef);

            // 4. Update Firebase Auth profile
            await updateProfile(auth.currentUser, { photoURL });

            // 5. Update Firestore document
            await updateDoc(doc(db, 'users', auth.currentUser.uid), {
                photoURL: photoURL
            });

            // 6. Update local state
            setUser(prev => ({ ...prev, photoURL }));

            setLoading(false);
            return { success: true, photoURL };
        } catch (err) {
            setLoading(false);
            console.error('Error uploading profile photo:', err);
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
        updatePassword,
        updateProfilePhoto
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
