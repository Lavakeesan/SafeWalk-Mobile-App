import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    StatusBar,
    Platform,
    Alert,
    Switch,
    ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { db, firebaseConfig } from '../../config/firebase';

export default function AddUser({ navigation }) {
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        phone: '',
        password: '',
        status: true,
    });
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        // Validation
        if (!formData.fullName.trim()) {
            Alert.alert('Error', 'Please enter a name');
            return;
        }

        if (!formData.email.trim()) {
            Alert.alert('Error', 'Please enter an email address');
            return;
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            Alert.alert('Error', 'Please enter a valid email address');
            return;
        }

        if (!formData.password.trim() || formData.password.length < 6) {
            Alert.alert('Error', 'Password must be at least 6 characters');
            return;
        }

        setLoading(true);
        let secondaryApp = null;
        try {
            // 1. Initialize a secondary Firebase app to create the user without logging out the admin
            const secondaryAppName = `secondary-app-${Date.now()}`;
            secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
            const secondaryAuth = getAuth(secondaryApp);

            // 2. Create the user in Firebase Authentication
            const userCredential = await createUserWithEmailAndPassword(
                secondaryAuth,
                formData.email.trim().toLowerCase(),
                formData.password
            );

            const uid = userCredential.user.uid;

            // 3. Create the user document in Firestore using the Auth UID
            const userData = {
                username: formData.fullName.trim(),
                email: formData.email.trim().toLowerCase(),
                phone: formData.phone.trim(),
                isActive: formData.status,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                role: 'user',
                trustedContacts: [],
                walkSessions: [],
                uid: uid, // Store the Auth UID in the document
            };

            await setDoc(doc(db, 'users', uid), userData);

            Alert.alert('Success', 'User account created successfully! They can now log in with their email and password.', [
                { text: 'OK', onPress: () => navigation.goBack() },
            ]);
        } catch (error) {
            console.error('Error adding user:', error);
            let errorMessage = error.message;
            if (error.code === 'auth/email-already-in-use') {
                errorMessage = 'This email address is already in use by another account.';
            }
            Alert.alert('Error', `Failed to add user: ${errorMessage}`);
        } finally {
            // 4. Clean up the secondary app instance
            if (secondaryApp) {
                await deleteApp(secondaryApp);
            }
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <MaterialCommunityIcons name="arrow-left" size={24} color="#111827" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Add New User</Text>
            </View>

            <ScrollView
                style={styles.content}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.infoBox}>
                    <MaterialCommunityIcons name="information-outline" size={20} color="#6B7280" />
                    <Text style={styles.infoText}>
                        Creating a user here will create both a login account and a database profile. The user can log in immediately after creation.
                    </Text>
                </View>

                {/* Profile Placeholder */}
                <View style={styles.profileSection}>
                    <View style={styles.avatarContainer}>
                        <View style={styles.avatar}>
                            <MaterialCommunityIcons name="account-plus" size={60} color="#6B7280" />
                        </View>
                    </View>
                    <Text style={styles.profileName}>New Member</Text>
                </View>

                {/* Form Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>ACCOUNT DETAILS</Text>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Full Name</Text>
                        <View style={styles.inputWrapper}>
                            <TextInput
                                style={styles.input}
                                value={formData.fullName}
                                onChangeText={(text) => setFormData({ ...formData, fullName: text })}
                                placeholder="Enter full name"
                                placeholderTextColor="#9CA3AF"
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Email Address</Text>
                        <View style={styles.inputWrapper}>
                            <TextInput
                                style={styles.input}
                                value={formData.email}
                                onChangeText={(text) => setFormData({ ...formData, email: text })}
                                placeholder="Enter email address"
                                placeholderTextColor="#9CA3AF"
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Phone Number</Text>
                        <View style={styles.inputWrapper}>
                            <TextInput
                                style={styles.input}
                                value={formData.phone}
                                onChangeText={(text) => setFormData({ ...formData, phone: text })}
                                placeholder="Enter phone number"
                                placeholderTextColor="#9CA3AF"
                                keyboardType="phone-pad"
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Temporary Password</Text>
                        <View style={styles.inputWrapper}>
                            <TextInput
                                style={styles.input}
                                value={formData.password}
                                onChangeText={(text) => setFormData({ ...formData, password: text })}
                                placeholder="Min 6 characters"
                                placeholderTextColor="#9CA3AF"
                                secureTextEntry
                            />
                        </View>
                    </View>
                </View>

                {/* Status Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>PERMISSIONS</Text>
                    <View style={styles.switchRow}>
                        <View>
                            <Text style={styles.switchLabel}>Enable Account</Text>
                            <Text style={styles.switchDescription}>
                                {formData.status ? 'User can access the app' : 'User will be suspended'}
                            </Text>
                        </View>
                        <Switch
                            value={formData.status}
                            onValueChange={(value) => setFormData({ ...formData, status: value })}
                            trackColor={{ false: '#D1D5DB', true: '#93C5FD' }}
                            thumbColor={formData.status ? '#3B82F6' : '#F3F4F6'}
                            ios_backgroundColor="#D1D5DB"
                        />
                    </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                    <TouchableOpacity
                        style={styles.saveButton}
                        onPress={handleSave}
                        disabled={loading}
                    >
                        <LinearGradient
                            colors={['#4F46E5', '#7C3AED']}
                            style={styles.saveButtonGradient}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.saveButtonText}>Create User</Text>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: Platform.OS === 'ios' ? 50 : 20,
        paddingHorizontal: 20,
        paddingBottom: 20,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    backButton: {
        marginRight: 16,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#111827',
    },
    content: {
        flex: 1,
    },
    infoBox: {
        flexDirection: 'row',
        backgroundColor: '#F3F4F6',
        margin: 20,
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
        gap: 10,
    },
    infoText: {
        flex: 1,
        fontSize: 12,
        color: '#6B7280',
        lineHeight: 18,
    },
    profileSection: {
        alignItems: 'center',
        paddingBottom: 24,
    },
    avatarContainer: {
        marginBottom: 12,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    profileName: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
    },
    section: {
        paddingHorizontal: 20,
        paddingBottom: 24,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: '#9CA3AF',
        letterSpacing: 0.5,
        marginBottom: 16,
    },
    inputGroup: {
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 8,
    },
    inputWrapper: {
        backgroundColor: '#fff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        paddingHorizontal: 16,
        height: 52,
        justifyContent: 'center',
    },
    input: {
        fontSize: 15,
        color: '#111827',
    },
    switchRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        padding: 16,
    },
    switchLabel: {
        fontSize: 15,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 4,
    },
    switchDescription: {
        fontSize: 13,
        color: '#6B7280',
    },
    actionButtons: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    saveButton: {
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 12,
        shadowColor: '#4F46E5',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    saveButtonGradient: {
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 56,
    },
    saveButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
    },
    cancelButton: {
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#6B7280',
    },
});
