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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

export default function Profile({ navigation }) {
    const { user, logout, updateUser, updatePassword } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [newName, setNewName] = useState(user?.displayName || '');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [updating, setUpdating] = useState(false);
    const [passwordUpdating, setPasswordUpdating] = useState(false);

    const handleUpdateProfile = async () => {
        if (!newName.trim()) {
            Alert.alert('Error', 'Name cannot be empty');
            return;
        }

        setUpdating(true);
        const result = await updateUser(newName.trim());
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
            // For sensitive operations like password change, Firebase might require recent login
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
            icon: 'account-circle-outline',
            color: '#3B82F6',
        },
        {
            id: '2',
            title: 'Email Address',
            value: user?.email || 'Not set',
            icon: 'email-outline',
            color: '#8B5CF6',
        },
        {
            id: '3',
            title: 'User ID',
            value: user?.uid?.substring(0, 20) + '...' || 'Not available',
            icon: 'identifier',
            color: '#10B981',
        },
    ];

    const actionOptions = [
        {
            id: '1',
            title: 'Privacy Policy',
            icon: 'shield-lock-outline',
            color: '#6B7280',
            onPress: () => Alert.alert('Privacy Policy', 'Privacy policy content here'),
        },
        {
            id: '2',
            title: 'Terms & Conditions',
            icon: 'file-document-outline',
            color: '#6B7280',
            onPress: () => Alert.alert('Terms & Conditions', 'Terms and conditions content here'),
        },
        {
            id: '3',
            title: 'Help & Support',
            icon: 'help-circle-outline',
            color: '#6B7280',
            onPress: () => Alert.alert('Help & Support', 'Contact support at support@safewalk.com'),
        },
        {
            id: '4',
            title: 'Sign Out',
            icon: 'logout',
            color: '#EF4444',
            onPress: handleSignOut,
        },
    ];

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                bounces={true}
            >
                {/* Header Section (Now inside ScrollView for better stability) */}
                <LinearGradient
                    colors={['#10B981', '#059669']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.header}
                >
                    <View style={styles.headerContent}>
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={() => navigation.goBack()}
                        >
                            <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Profile</Text>
                        <View style={{ width: 40 }} />
                    </View>

                    {/* Profile Info Row */}
                    <View style={styles.profileInfoContainer}>
                        {/* Profile Avatar */}
                        <View style={styles.avatarContainer}>
                            <View style={styles.avatar}>
                                <Text style={styles.avatarText}>
                                    {user?.displayName?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
                                </Text>
                            </View>
                            <View style={styles.verifiedBadge}>
                                <MaterialCommunityIcons name="check-circle" size={16} color="#100081" />
                            </View>
                        </View>

                        <View style={styles.userInfo}>
                            <Text style={styles.userName}>{user?.displayName || 'User'}</Text>
                            <Text style={styles.userEmail}>{user?.email || 'No email'}</Text>

                            <TouchableOpacity
                                style={styles.editProfileButton}
                                onPress={() => {
                                    setNewName(user?.displayName || '');
                                    setIsEditing(true);
                                }}
                            >
                                <MaterialCommunityIcons name="pencil-outline" size={14} color="#fff" />
                                <Text style={styles.editProfileText}>Edit Profile</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </LinearGradient>

                {/* Account Information */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Account Information</Text>
                    {profileOptions.map((option) => (
                        <View key={option.id} style={styles.optionCard}>
                            <View style={[styles.optionIcon, { backgroundColor: option.color + '15' }]}>
                                <MaterialCommunityIcons name={option.icon} size={22} color={option.color} />
                            </View>
                            <View style={styles.optionContent}>
                                <Text style={styles.optionTitle}>{option.title}</Text>
                                <Text style={styles.optionValue} numberOfLines={1}>
                                    {option.value}
                                </Text>
                            </View>
                        </View>
                    ))}
                </View>

                {/* App Settings */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Security</Text>
                    <TouchableOpacity
                        style={styles.actionCard}
                        onPress={() => setIsChangingPassword(true)}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.actionIcon, { backgroundColor: '#F59E0B15' }]}>
                            <MaterialCommunityIcons name="lock-reset" size={22} color="#F59E0B" />
                        </View>
                        <Text style={styles.actionTitle}>Change Password</Text>
                        <MaterialCommunityIcons name="chevron-right" size={20} color="#9CA3AF" />
                    </TouchableOpacity>
                </View>

                {/* App Settings */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>App Settings</Text>
                    {actionOptions.map((option) => (
                        <TouchableOpacity
                            key={option.id}
                            style={styles.actionCard}
                            onPress={option.onPress}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.actionIcon, { backgroundColor: option.color + '15' }]}>
                                <MaterialCommunityIcons name={option.icon} size={22} color={option.color} />
                            </View>
                            <Text style={styles.actionTitle}>{option.title}</Text>
                            <MaterialCommunityIcons name="chevron-right" size={20} color="#9CA3AF" />
                        </TouchableOpacity>
                    ))}
                </View>

                {/* App Version */}
                <View style={styles.versionContainer}>
                    <Text style={styles.versionText}>SafeWalk v1.0.0</Text>
                    <Text style={styles.versionSubtext}>Made with ❤️ for your safety</Text>
                </View>

            </ScrollView>

            {/* Edit Profile Modal */}
            <Modal
                visible={isEditing}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setIsEditing(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Edit Profile</Text>
                            <TouchableOpacity onPress={() => setIsEditing(false)}>
                                <MaterialCommunityIcons name="close" size={24} color="#6B7280" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.modalBody}>
                            <Text style={styles.inputLabel}>Full Name</Text>
                            <View style={styles.inputContainer}>
                                <MaterialCommunityIcons name="account-outline" size={20} color="#6B7280" />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter full name"
                                    value={newName}
                                    onChangeText={setNewName}
                                    autoFocus={true}
                                />
                            </View>

                            <TouchableOpacity
                                style={styles.updateButton}
                                onPress={handleUpdateProfile}
                                disabled={updating}
                            >
                                <LinearGradient
                                    colors={['#10B981', '#059669']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.updateGradient}
                                >
                                    {updating ? (
                                        <ActivityIndicator color="#fff" size="small" />
                                    ) : (
                                        <>
                                            <MaterialCommunityIcons name="check" size={20} color="#fff" />
                                            <Text style={styles.updateButtonText}>Save Changes</Text>
                                        </>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Change Password Modal */}
            <Modal
                visible={isChangingPassword}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setIsChangingPassword(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Change Password</Text>
                            <TouchableOpacity onPress={() => setIsChangingPassword(false)}>
                                <MaterialCommunityIcons name="close" size={24} color="#6B7280" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.modalBody}>
                            <Text style={styles.inputLabel}>New Password</Text>
                            <View style={styles.inputContainer}>
                                <MaterialCommunityIcons name="lock-outline" size={20} color="#6B7280" />
                                <TextInput
                                    style={styles.input}
                                    placeholder="At least 6 characters"
                                    value={newPassword}
                                    onChangeText={setNewPassword}
                                    secureTextEntry
                                />
                            </View>

                            <Text style={styles.inputLabel}>Confirm New Password</Text>
                            <View style={styles.inputContainer}>
                                <MaterialCommunityIcons name="lock-check-outline" size={20} color="#6B7280" />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Confirm password"
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                    secureTextEntry
                                />
                            </View>

                            <TouchableOpacity
                                style={styles.updateButton}
                                onPress={handleChangePassword}
                                disabled={passwordUpdating}
                            >
                                <LinearGradient
                                    colors={['#F59E0B', '#D97706']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.updateGradient}
                                >
                                    {passwordUpdating ? (
                                        <ActivityIndicator color="#fff" size="small" />
                                    ) : (
                                        <>
                                            <MaterialCommunityIcons name="shield-key-outline" size={20} color="#fff" />
                                            <Text style={styles.updateButtonText}>Update Password</Text>
                                        </>
                                    )}
                                </LinearGradient>
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
        backgroundColor: '#F9FAFB',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 40,
    },
    header: {
        paddingTop: Platform.OS === 'ios' ? 45 : 25,
        paddingBottom: 18,
        paddingHorizontal: 20,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 15,
        fontWeight: '800',
        color: '#fff',
    },
    avatarContainer: {
        position: 'relative',
    },
    profileInfoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 4,
    },
    userInfo: {
        marginLeft: 30,
    },
    avatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#fff',
    },
    avatarText: {
        fontSize: 22,
        fontWeight: '800',
        color: '#fff',
    },
    verifiedBadge: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 1,
    },
    userName: {
        fontSize: 17,
        fontWeight: '800',
        color: '#fff',
        marginBottom: 2,
    },
    userEmail: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.8)',
    },
    section: {
        marginTop: 24,
        paddingHorizontal: 20,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#6B7280',
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    optionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 16,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    optionIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    optionContent: {
        flex: 1,
        marginLeft: 12,
    },
    optionTitle: {
        fontSize: 13,
        color: '#6B7280',
        marginBottom: 4,
    },
    optionValue: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
    },
    actionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 16,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    actionIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    actionTitle: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
    },
    versionContainer: {
        alignItems: 'center',
        marginTop: 32,
        marginBottom: 24,
    },
    versionText: {
        fontSize: 13,
        color: '#9CA3AF',
        fontWeight: '600',
    },
    versionSubtext: {
        fontSize: 12,
        color: '#D1D5DB',
        marginTop: 4,
    },
    logoutText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
    },
    editProfileButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        marginTop: 6,
        alignSelf: 'flex-start',
    },
    editProfileText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '600',
        marginLeft: 4,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 24,
        overflow: 'hidden',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
    },
    modalBody: {
        padding: 20,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 8,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 48,
        marginBottom: 20,
    },
    input: {
        flex: 1,
        marginLeft: 10,
        fontSize: 16,
        color: '#111827',
    },
    updateButton: {
        borderRadius: 12,
        overflow: 'hidden',
    },
    updateGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 48,
        gap: 8,
    },
    updateButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
});
