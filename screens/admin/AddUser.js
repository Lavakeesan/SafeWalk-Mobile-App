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
    Dimensions,
    ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { db, firebaseConfig } from '../../config/firebase';

const { width } = Dimensions.get('window');

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
        if (!formData.fullName.trim()) {
            Alert.alert('Error', 'Please enter a name');
            return;
        }

        if (!formData.email.trim()) {
            Alert.alert('Error', 'Please enter an email address');
            return;
        }

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
            const secondaryAppName = `secondary-app-${Date.now()}`;
            secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
            const secondaryAuth = getAuth(secondaryApp);

            const userCredential = await createUserWithEmailAndPassword(
                secondaryAuth,
                formData.email.trim().toLowerCase(),
                formData.password
            );

            const uid = userCredential.user.uid;

            const userData = {
                username: formData.fullName.trim(),
                name: formData.fullName.trim(),
                email: formData.email.trim().toLowerCase(),
                phone: formData.phone.trim(),
                isActive: formData.status,
                status: formData.status ? 'active' : 'suspended',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                role: 'user',
                trustedContactsCount: 0,
                walkSessionsCount: 0,
                uid: uid,
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
            if (secondaryApp) {
                await deleteApp(secondaryApp);
            }
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />

            {/* Premium Header */}
            <View style={styles.premiumHeaderBox}>
                <LinearGradient
                    colors={['#4F46E5', '#7C3AED']}
                    style={styles.premiumHeaderGradient}
                >
                    <View style={styles.headerLayout}>
                        <TouchableOpacity
                            style={styles.premiumBackButton}
                            onPress={() => navigation.goBack()}
                        >
                            <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
                        </TouchableOpacity>
                        <View style={styles.headerTextLayer}>
                            <Text style={styles.premiumHeaderTitle}>Add Member</Text>
                            <Text style={styles.premiumHeaderSub}>System Registration Suite</Text>
                        </View>
                        {loading && (
                            <View style={styles.headerLoadingBox}>
                                <ActivityIndicator color="#fff" size="small" />
                            </View>
                        )}
                    </View>
                </LinearGradient>
            </View>

            <ScrollView
                style={styles.mainScroll}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollPadding}
            >
                {/* Central Identity Card */}
                <View style={styles.idCardSection}>
                    <View style={styles.idAvatarOuter}>
                        <LinearGradient
                            colors={['#F8FAFC', '#F1F5F9']}
                            style={styles.idAvatarInner}
                        >
                            <MaterialCommunityIcons name="account-plus-outline" size={42} color="#4F46E5" />
                        </LinearGradient>
                        <View style={styles.idEditBadge}>
                            <MaterialCommunityIcons name="plus" size={14} color="#fff" />
                        </View>
                    </View>
                    <Text style={styles.idCardMainLabel}>Member Identity</Text>
                    <Text style={styles.idCardSubLabel}>Initialize secure credentials</Text>
                </View>

                <View style={styles.creationFormBox}>
                    <View style={styles.formSectionHeader}>
                        <MaterialCommunityIcons name="card-account-details-outline" size={18} color="#94A3B8" />
                        <Text style={styles.formSectionTitle}>PRIMARY DETAILS</Text>
                    </View>

                    <View style={styles.premiumInputCard}>
                        <Text style={styles.premiumInputLabel}>Full Name</Text>
                        <View style={styles.premiumInputFieldWrapper}>
                            <MaterialCommunityIcons name="account-circle-outline" size={20} color="#64748B" />
                            <TextInput
                                style={styles.premiumTextInputStyle}
                                value={formData.fullName}
                                onChangeText={(text) => setFormData({ ...formData, fullName: text })}
                                placeholder="Enter member name"
                                placeholderTextColor="#94A3B8"
                            />
                        </View>
                    </View>

                    <View style={styles.premiumInputCard}>
                        <Text style={styles.premiumInputLabel}>Email Address</Text>
                        <View style={styles.premiumInputFieldWrapper}>
                            <MaterialCommunityIcons name="email-fast-outline" size={20} color="#64748B" />
                            <TextInput
                                style={styles.premiumTextInputStyle}
                                value={formData.email}
                                onChangeText={(text) => setFormData({ ...formData, email: text })}
                                placeholder="member@domain.com"
                                placeholderTextColor="#94A3B8"
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                        </View>
                    </View>

                    <View style={styles.premiumInputCard}>
                        <Text style={styles.premiumInputLabel}>Mobile Contact</Text>
                        <View style={styles.premiumInputFieldWrapper}>
                            <MaterialCommunityIcons name="phone-settings-outline" size={20} color="#64748B" />
                            <TextInput
                                style={styles.premiumTextInputStyle}
                                value={formData.phone}
                                onChangeText={(text) => setFormData({ ...formData, phone: text })}
                                placeholder="+94 XX XXX XXXX"
                                placeholderTextColor="#94A3B8"
                                keyboardType="phone-pad"
                            />
                        </View>
                    </View>

                    <View style={styles.formSectionHeader}>
                        <MaterialCommunityIcons name="shield-lock-outline" size={18} color="#94A3B8" />
                        <Text style={styles.formSectionTitle}>SECURITY SETUP</Text>
                    </View>

                    <View style={styles.premiumInputCard}>
                        <Text style={styles.premiumInputLabel}>Permanent Password</Text>
                        <View style={styles.premiumInputFieldWrapper}>
                            <MaterialCommunityIcons name="key-variant" size={20} color="#64748B" />
                            <TextInput
                                style={styles.premiumTextInputStyle}
                                value={formData.password}
                                onChangeText={(text) => setFormData({ ...formData, password: text })}
                                placeholder="Secure password"
                                placeholderTextColor="#94A3B8"
                                secureTextEntry
                            />
                        </View>
                    </View>

                    <View style={styles.premiumStatusToggleCard}>
                        <View style={styles.statusToggleInfo}>
                            <Text style={styles.statusToggleMain}>Activate Account</Text>
                            <Text style={styles.statusToggleSub}>Enable system access immediately</Text>
                        </View>
                        <Switch
                            value={formData.status}
                            onValueChange={(value) => setFormData({ ...formData, status: value })}
                            trackColor={{ false: '#E2E8F0', true: '#C7D2FE' }}
                            thumbColor={formData.status ? '#4F46E5' : '#94A3B8'}
                        />
                    </View>

                    <TouchableOpacity
                        style={styles.premiumRegisterButton}
                        onPress={handleSave}
                        disabled={loading}
                    >
                        <LinearGradient
                            colors={['#4F46E5', '#7C3AED']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.registerButtonGradient}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" size="small" />
                            ) : (
                                <>
                                    <Text style={styles.registerButtonText}>INITIALIZE MEMBER</Text>
                                    <MaterialCommunityIcons name="account-check" size={22} color="#fff" />
                                </>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.returnButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Text style={styles.returnButtonText}>Cancel & Exit</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    premiumHeaderBox: {
        width: '100%',
    },
    premiumHeaderGradient: {
        paddingTop: Platform.OS === 'ios' ? 50 : 30,
        paddingBottom: 24,
        borderBottomLeftRadius: 35,
        borderBottomRightRadius: 35,
    },
    headerLayout: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
    },
    premiumBackButton: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    headerTextLayer: {
        flex: 1,
    },
    premiumHeaderTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: '#fff',
        letterSpacing: -0.5,
    },
    premiumHeaderSub: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.7)',
        fontWeight: '500',
    },
    headerLoadingBox: {
        width: 32,
        alignItems: 'center',
    },
    mainScroll: {
        flex: 1,
    },
    scrollPadding: {
        paddingBottom: 40,
    },
    idCardSection: {
        alignItems: 'center',
        paddingVertical: 30,
    },
    idAvatarOuter: {
        position: 'relative',
        marginBottom: 16,
    },
    idAvatarInner: {
        width: 100,
        height: 100,
        borderRadius: 35,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 4,
    },
    idEditBadge: {
        position: 'absolute',
        bottom: -4,
        right: -4,
        width: 28,
        height: 28,
        borderRadius: 10,
        backgroundColor: '#4F46E5',
        borderWidth: 3,
        borderColor: '#F8FAFC',
        alignItems: 'center',
        justifyContent: 'center',
    },
    idCardMainLabel: {
        fontSize: 20,
        fontWeight: '800',
        color: '#1E293B',
    },
    idCardSubLabel: {
        fontSize: 13,
        color: '#1E293B',
        fontWeight: '500',
    },
    creationFormBox: {
        paddingHorizontal: 24,
    },
    formSectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        marginTop: 10,
        gap: 8,
    },
    formSectionTitle: {
        fontSize: 11,
        fontWeight: '800',
        color: '#1E293B',
        letterSpacing: 1.2,
    },
    premiumInputCard: {
        backgroundColor: '#fff',
        borderRadius: 22,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 1,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    premiumInputLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: '#1E293B',
        marginBottom: 10,
        marginLeft: 4,
    },
    premiumInputFieldWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        borderRadius: 14,
        paddingHorizontal: 12,
        height: 48,
        gap: 12,
    },
    premiumTextInputStyle: {
        flex: 1,
        fontSize: 15,
        color: '#1E293B',
        fontWeight: '600',
    },
    premiumStatusToggleCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 22,
        marginBottom: 30,
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 1,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    statusToggleInfo: {
        flex: 1,
    },
    statusToggleMain: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1E293B',
        marginBottom: 2,
    },
    statusToggleSub: {
        fontSize: 12,
        color: '#1E293B',
        fontWeight: '500',
    },
    premiumRegisterButton: {
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: '#4F46E5',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 15,
        elevation: 8,
    },
    registerButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 18,
        gap: 12,
    },
    registerButtonText: {
        fontSize: 14,
        fontWeight: '800',
        color: '#fff',
        letterSpacing: 1,
    },
    returnButton: {
        alignItems: 'center',
        paddingVertical: 20,
        marginTop: 8,
    },
    returnButtonText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#111827',
    },
});
