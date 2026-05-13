import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    StatusBar,
    ScrollView,
    Alert,
    Platform,
    Modal,
    TextInput,
    ActivityIndicator,
    Dimensions,
    KeyboardAvoidingView,
    Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

const { width } = Dimensions.get('window');

export default function Profile({ navigation }) {
    const { user, logout, updateUser, updatePassword, updateProfilePhoto } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [newName, setNewName] = useState(user?.displayName || '');
    const [newEmail, setNewEmail] = useState(user?.email || '');
    const [newPhone, setNewPhone] = useState(user?.phone || '');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [updating, setUpdating] = useState(false);
    const [passwordUpdating, setPasswordUpdating] = useState(false);

    const handlePickImage = async () => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'We need permission to access your gallery to change profile photo.');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.7,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                setUploadingPhoto(true);
                const uploadResult = await updateProfilePhoto(result.assets[0].uri);
                setUploadingPhoto(false);

                if (uploadResult.success) {
                    Alert.alert('Success', 'Profile photo updated successfully!');
                } else {
                    Alert.alert('Upload Failed', uploadResult.error || 'Could not upload image');
                }
            }
        } catch (error) {
            setUploadingPhoto(false);
            console.error('Pick Image Error:', error);
            Alert.alert('Error', 'An unexpected error occurred while picking the image.');
        }
    };

    const handleUpdateProfile = async () => {
        if (!newName.trim()) {
            Alert.alert('Error', 'Name cannot be empty');
            return;
        }

        setUpdating(true);
        const result = await updateUser(newName.trim(), newEmail.trim(), newPhone.trim());
        setUpdating(false);

        if (result.success) {
            setIsEditing(false);
            Alert.alert('Success', 'Profile updated successfully');
        } else {
            Alert.alert('Error', result.error || 'Failed to update profile');
        }
    };

    const handleChangePassword = async () => {
        if (newPassword.length < 6) {
            Alert.alert('Error', 'Password must be at least 6 characters long');
            return;
        }
        if (newPassword !== confirmPassword) {
            Alert.alert('Error', 'Passwords do not match');
            return;
        }

        setPasswordUpdating(true);
        const result = await updatePassword(newPassword);
        setPasswordUpdating(false);

        if (result.success) {
            setIsChangingPassword(false);
            setNewPassword('');
            setConfirmPassword('');
            Alert.alert('Success', 'Password updated successfully');
        } else {
            if (result.error?.includes('requires-recent-login')) {
                Alert.alert(
                    'Security Requirement',
                    'For security, please sign out and sign back in to change your password.'
                );
            } else {
                Alert.alert('Error', result.error || 'Failed to update password');
            }
        }
    };

    const handleSignOut = () => {
        Alert.alert(
            'Sign Out',
            'Are you sure you want to sign out?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Sign Out',
                    style: 'destructive',
                    onPress: async () => {
                        const result = await logout();
                        if (result.success) {
                            navigation.reset({
                                index: 0,
                                routes: [{ name: 'SignIn' }],
                            });
                        } else {
                            Alert.alert('Error', 'Failed to sign out. Please try again.');
                        }
                    },
                },
            ]
        );
    };

    const profileOptions = [
        {
            id: '1',
            title: 'Full Name',
            value: user?.displayName || 'Not set',
            icon: 'account-circle',
            color: '#4F46E5',
        },
        {
            id: '2',
            title: 'Email Address',
            value: user?.email || 'Not set',
            icon: 'email',
            color: '#7C3AED',
        },
        {
            id: '3',
            title: 'Phone Number',
            value: user?.phone || 'Not set',
            icon: 'phone',
            color: '#10B981',
        },
        {
            id: '4',
            title: 'User ID',
            value: user?.uid?.substring(0, 16) + '...' || 'Not available',
            icon: 'shield-check',
            color: '#64748B',
        },
    ];

    const actionOptions = [
        {
            id: '1',
            title: 'Privacy Policy',
            icon: 'shield-lock',
            color: '#64748B',
            onPress: () => Alert.alert('Privacy Policy', 'Your data is encrypted and secure.'),
        },
        {
            id: '2',
            title: 'Terms & Conditions',
            icon: 'file-document',
            color: '#64748B',
            onPress: () => Alert.alert('Terms & Conditions', 'By using SafeWalk, you agree to our terms.'),
        },
        {
            id: '3',
            title: 'Help & Support',
            icon: 'help-circle',
            color: '#64748B',
            onPress: () => Alert.alert('Support', 'Contact us at help@safewalk.app'),
        },
    ];

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />

            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <MaterialCommunityIcons name="chevron-left" size={28} color="#F8FAFC" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Account Profile</Text>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Hero Section */}
                <View style={styles.heroSection}>
                    <TouchableOpacity 
                        style={styles.avatarContainer} 
                        onPress={handlePickImage}
                        disabled={uploadingPhoto}
                    >
                        <LinearGradient
                            colors={['#3B82F6', '#2563EB']}
                            style={styles.avatarGradient}
                        >
                            {uploadingPhoto ? (
                                <ActivityIndicator color="#fff" size="large" />
                            ) : user?.photoURL ? (
                                <Image source={{ uri: user.photoURL }} style={styles.avatarImage} />
                            ) : (
                                <Text style={styles.avatarInitial}>
                                    {user?.displayName?.charAt(0)?.toUpperCase() || 'U'}
                                </Text>
                            )}
                        </LinearGradient>
                        <View style={styles.statusDot} />
                        <View style={styles.cameraIconBadge}>
                            <MaterialCommunityIcons name="camera" size={14} color="#fff" />
                        </View>
                    </TouchableOpacity>
                    
                    <Text style={styles.userNameText}>{user?.displayName || 'Safe User'}</Text>
                    <Text style={styles.userRoleText}>Premium Member</Text>

                    <TouchableOpacity
                        style={styles.editBtn}
                        onPress={() => {
                            setNewName(user?.displayName || '');
                            setNewEmail(user?.email || '');
                            setNewPhone(user?.phone || '');
                            setIsEditing(true);
                        }}
                    >
                        <MaterialCommunityIcons name="pencil" size={18} color="#fff" />
                        <Text style={styles.editBtnText}>Edit Details</Text>
                    </TouchableOpacity>
                </View>

                {/* Info Cards */}
                <View style={styles.infoSection}>
                    <View style={styles.infoCard}>
                        <View style={styles.infoIconBox}>
                            <MaterialCommunityIcons name="account-outline" size={22} color="#3B82F6" />
                        </View>
                        <View style={styles.infoContent}>
                            <Text style={styles.infoLabel}>FULL NAME</Text>
                            <Text style={styles.infoValue}>{user?.displayName || 'Not set'}</Text>
                        </View>
                    </View>

                    <View style={styles.infoCard}>
                        <View style={[styles.infoIconBox, { backgroundColor: 'rgba(168, 85, 247, 0.1)' }]}>
                            <MaterialCommunityIcons name="email-outline" size={22} color="#A855F7" />
                        </View>
                        <View style={styles.infoContent}>
                            <Text style={styles.infoLabel}>EMAIL ADDRESS</Text>
                            <Text style={styles.infoValue}>{user?.email || 'Not set'}</Text>
                        </View>
                    </View>

                    <View style={styles.infoCard}>
                        <View style={[styles.infoIconBox, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                            <MaterialCommunityIcons name="phone-outline" size={22} color="#10B981" />
                        </View>
                        <View style={styles.infoContent}>
                            <Text style={styles.infoLabel}>PHONE NUMBER</Text>
                            <Text style={styles.infoValue}>{user?.phone || 'Not set'}</Text>
                        </View>
                    </View>

                    <View style={styles.infoCard}>
                        <View style={[styles.infoIconBox, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
                            <MaterialCommunityIcons name="shield-check-outline" size={22} color="#F59E0B" />
                        </View>
                        <View style={styles.infoContent}>
                            <Text style={styles.infoLabel}>USER ID</Text>
                            <Text style={styles.infoValue} numberOfLines={1}>
                                {user?.uid?.substring(0, 16) + '...' || 'Not available'}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Privacy & Security */}
                <View style={styles.actionSection}>
                    <Text style={styles.sectionTitle}>PRIVACY & SECURITY</Text>
                    <View style={styles.actionCardContainer}>
                        <TouchableOpacity
                            style={styles.actionItem}
                            onPress={() => setIsChangingPassword(true)}
                        >
                            <View style={[styles.actionIcon, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
                                <MaterialCommunityIcons name="lock-outline" size={20} color="#F59E0B" />
                            </View>
                            <Text style={styles.actionText}>Update Security Password</Text>
                            <MaterialCommunityIcons name="chevron-right" size={20} color="#64748B" />
                        </TouchableOpacity>

                        <View style={styles.actionDivider} />

                        <TouchableOpacity
                            style={styles.actionItem}
                            onPress={() => Alert.alert('Privacy Policy', 'Your data is encrypted and secure.')}
                        >
                            <View style={[styles.actionIcon, { backgroundColor: 'rgba(148, 163, 184, 0.1)' }]}>
                                <MaterialCommunityIcons name="book-open-outline" size={20} color="#94A3B8" />
                            </View>
                            <Text style={styles.actionText}>Privacy Policy</Text>
                            <MaterialCommunityIcons name="chevron-right" size={20} color="#64748B" />
                        </TouchableOpacity>
                    </View>

                    {/* Sign Out Button */}
                    <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
                        <MaterialCommunityIcons name="logout-variant" size={20} color="#EF4444" />
                        <Text style={styles.signOutBtnText}>Sign Out from Device</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>

            {/* Edit Modal (Keeping functionality, matching style) */}
            <Modal visible={isEditing} transparent={true} animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Edit Identity</Text>
                        <TextInput
                            style={styles.modalInput}
                            placeholder="Full Name"
                            placeholderTextColor="#64748B"
                            value={newName}
                            onChangeText={setNewName}
                        />
                        <TextInput
                            style={styles.modalInput}
                            placeholder="Email"
                            placeholderTextColor="#64748B"
                            value={newEmail}
                            onChangeText={setNewEmail}
                            keyboardType="email-address"
                        />
                        <TextInput
                            style={styles.modalInput}
                            placeholder="Phone"
                            placeholderTextColor="#64748B"
                            value={newPhone}
                            onChangeText={setNewPhone}
                            keyboardType="phone-pad"
                        />
                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.modalCancel} onPress={() => setIsEditing(false)}>
                                <Text style={styles.modalBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.modalSave} onPress={handleUpdateProfile}>
                                {updating ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalBtnText}>Save</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Password Modal (Keeping functionality, matching style) */}
            <Modal visible={isChangingPassword} transparent={true} animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Update Security Code</Text>
                        <TextInput
                            style={styles.modalInput}
                            placeholder="New Password"
                            placeholderTextColor="#64748B"
                            value={newPassword}
                            onChangeText={setNewPassword}
                            secureTextEntry
                        />
                        <TextInput
                            style={styles.modalInput}
                            placeholder="Confirm New Password"
                            placeholderTextColor="#64748B"
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            secureTextEntry
                        />
                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.modalCancel} onPress={() => setIsChangingPassword(false)}>
                                <Text style={styles.modalBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.modalSave} onPress={handleChangePassword}>
                                {passwordUpdating ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalBtnText}>Update</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#010A1A',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: 'rgba(30, 41, 59, 0.5)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        flex: 1,
        textAlign: 'center',
        fontSize: 20,
        fontWeight: '900',
        color: '#F8FAFC',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 40,
    },
    heroSection: {
        alignItems: 'center',
        paddingVertical: 20,
    },
    avatarContainer: {
        position: 'relative',
        marginBottom: 16,
    },
    avatarGradient: {
        width: 120,
        height: 120,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarInitial: {
        fontSize: 52,
        fontWeight: '900',
        color: '#fff',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
        borderRadius: 40,
    },
    statusDot: {
        position: 'absolute',
        bottom: 5,
        right: 5,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#10B981',
        borderWidth: 4,
        borderColor: '#010A1A',
        zIndex: 2,
    },
    cameraIconBadge: {
        position: 'absolute',
        top: 5,
        right: 5,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#2563EB',
        borderWidth: 2,
        borderColor: '#010A1A',
        alignItems: 'center',
        justifyContent: 'center',
    },
    userNameText: {
        fontSize: 28,
        fontWeight: '900',
        color: '#F8FAFC',
    },
    userRoleText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#64748B',
        marginTop: 4,
    },
    editBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#2563EB',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
        marginTop: 20,
        gap: 8,
        shadowColor: '#2563EB',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
    },
    editBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '800',
    },
    infoSection: {
        paddingHorizontal: 20,
        marginTop: 20,
    },
    infoCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#0B1526',
        padding: 16,
        borderRadius: 24,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    infoIconBox: {
        width: 48,
        height: 48,
        borderRadius: 16,
        backgroundColor: 'rgba(37, 99, 235, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    infoContent: {
        marginLeft: 16,
    },
    infoLabel: {
        fontSize: 10,
        fontWeight: '800',
        color: '#64748B',
        letterSpacing: 1,
    },
    infoValue: {
        fontSize: 18,
        fontWeight: '800',
        color: '#F8FAFC',
        marginTop: 2,
    },
    actionSection: {
        paddingHorizontal: 20,
        marginTop: 30,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: '900',
        color: '#64748B',
        letterSpacing: 1.5,
        marginBottom: 16,
        marginLeft: 4,
    },
    actionCardContainer: {
        backgroundColor: '#0B1526',
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    actionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    actionIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionText: {
        flex: 1,
        marginLeft: 16,
        fontSize: 16,
        fontWeight: '700',
        color: '#F8FAFC',
    },
    actionDivider: {
        height: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        marginHorizontal: 16,
    },
    signOutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(239, 68, 68, 0.05)',
        padding: 18,
        borderRadius: 24,
        marginTop: 30,
        gap: 10,
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.2)',
    },
    signOutBtnText: {
        color: '#EF4444',
        fontSize: 16,
        fontWeight: '800',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        justifyContent: 'center',
        padding: 24,
    },
    modalContent: {
        backgroundColor: '#0B1526',
        borderRadius: 32,
        padding: 24,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: '900',
        color: '#F8FAFC',
        marginBottom: 24,
    },
    modalInput: {
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: 16,
        padding: 16,
        color: '#F8FAFC',
        fontSize: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    modalActions: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 8,
    },
    modalCancel: {
        flex: 1,
        padding: 16,
        borderRadius: 16,
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
    },
    modalSave: {
        flex: 1,
        padding: 16,
        borderRadius: 16,
        alignItems: 'center',
        backgroundColor: '#2563EB',
    },
    modalBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '800',
    },
});

