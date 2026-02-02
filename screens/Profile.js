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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

const { width } = Dimensions.get('window');

export default function Profile({ navigation }) {
    const { user, logout, updateUser, updatePassword } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [newName, setNewName] = useState(user?.displayName || '');
    const [newEmail, setNewEmail] = useState(user?.email || '');
    const [newPhone, setNewPhone] = useState(user?.phone || '');
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

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Premium Header */}
                <View style={styles.premiumHeaderBox}>
                    <LinearGradient
                        colors={['#4F46E5', '#7C3AED']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.premiumHeaderGradient}
                    >
                        <View style={styles.headerTopBar}>
                            <TouchableOpacity
                                style={styles.premiumBackButton}
                                onPress={() => navigation.goBack()}
                            >
                                <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
                            </TouchableOpacity>
                            <Text style={styles.premiumHeaderTitle}>Account Profile</Text>
                            <View style={{ width: 44 }} />
                        </View>

                        <View style={styles.heroProfileSection}>
                            <View style={styles.premiumAvatarContainer}>
                                <LinearGradient
                                    colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.05)']}
                                    style={styles.avatarRing}
                                >
                                    <View style={styles.avatarInner}>
                                        <Text style={styles.avatarInitialText}>
                                            {user?.displayName?.charAt(0)?.toUpperCase() || 'U'}
                                        </Text>
                                    </View>
                                </LinearGradient>
                                <View style={styles.activeStatusBadge} />
                            </View>

                            <View style={styles.heroNameGroup}>
                                <Text style={styles.heroNameText}>{user?.displayName || 'Safe User'}</Text>
                            </View>

                            <TouchableOpacity
                                style={styles.premiumEditFab}
                                onPress={() => {
                                    setNewName(user?.displayName || '');
                                    setNewEmail(user?.email || '');
                                    setNewPhone(user?.phone || '');
                                    setIsEditing(true);
                                }}
                            >
                                <LinearGradient
                                    colors={['rgba(255,255,255,0.25)', 'rgba(255,255,255,0.1)']}
                                    style={styles.glassButtonInner}
                                >
                                    <MaterialCommunityIcons name="account-edit" size={18} color="#fff" />
                                    <Text style={styles.glassButtonText}>Edit Details</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </LinearGradient>
                </View>

                {/* Account Details Section */}
                <View style={styles.contentSection}>
                    <View style={styles.sectionHeaderRow}>
                        <MaterialCommunityIcons name="information-outline" size={18} color="#94A3B8" />
                    </View>

                    {profileOptions.map((option) => (
                        <View key={option.id} style={styles.premiumOptionCard}>
                            <View style={[styles.optionIconBox, { backgroundColor: option.color + '15' }]}>
                                <MaterialCommunityIcons name={option.icon} size={22} color={option.color} />
                            </View>
                            <View style={styles.optionInfoBox}>
                                <Text style={styles.optionLabelText}>{option.title}</Text>
                                <Text style={styles.optionValueText}>{option.value}</Text>
                            </View>
                        </View>
                    ))}

                    <View style={[styles.sectionHeaderRow, { marginTop: 24 }]}>
                        <Text style={styles.premiumSectionTitle}>Privacy & Security</Text>
                    </View>

                    <TouchableOpacity
                        style={styles.premiumActionCard}
                        onPress={() => setIsChangingPassword(true)}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.actionIconBox, { backgroundColor: '#F59E0B15' }]}>
                            <MaterialCommunityIcons name="lock-reset" size={22} color="#F59E0B" />
                        </View>
                        <Text style={styles.actionLabelText}>Update Security Password</Text>
                        <MaterialCommunityIcons name="chevron-right" size={20} color="#94A3B8" />
                    </TouchableOpacity>

                    {actionOptions.map((option) => (
                        <TouchableOpacity
                            key={option.id}
                            style={styles.premiumActionCard}
                            onPress={option.onPress}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.actionIconBox, { backgroundColor: option.color + '15' }]}>
                                <MaterialCommunityIcons name={option.icon} size={22} color={option.color} />
                            </View>
                            <Text style={styles.actionLabelText}>{option.title}</Text>
                            <MaterialCommunityIcons name="chevron-right" size={20} color="#94A3B8" />
                        </TouchableOpacity>
                    ))}

                    {/* Elite Sign Out Zone */}
                    <TouchableOpacity
                        style={styles.premiumSignOutCard}
                        onPress={handleSignOut}
                        activeOpacity={0.8}
                    >
                        <LinearGradient
                            colors={['#EF444410', '#EF444405']}
                            style={styles.signOutInner}
                        >
                            <View style={styles.signOutIconContainer}>
                                <MaterialCommunityIcons name="logout-variant" size={24} color="#EF4444" />
                            </View>
                            <Text style={styles.signOutTextMain}>Sign Out from Device</Text>
                            <MaterialCommunityIcons name="chevron-right" size={20} color="#EF4444" />
                        </LinearGradient>
                    </TouchableOpacity>
                </View>

                {/* Footer Attribution */}
                <View style={styles.premiumFooter}>
                    <Text style={styles.footerAppTitle}>SafeWalk Premium</Text>
                    <Text style={styles.footerVersionText}>Version 1.2.0 • Build 2402</Text>
                    <View style={styles.footerDivider} />
                    <Text style={styles.footerLegalText}>© 2026 SafeWalk Infrastructure. All rights reserved.</Text>
                </View>
            </ScrollView>

            {/* Premium Edit Profile Modal */}
            <Modal
                visible={isEditing}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setIsEditing(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalOverlay}
                >
                    <View style={styles.premiumModalSheet}>
                        <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
                            <LinearGradient
                                colors={['#4F46E5', '#3730A3']}
                                style={styles.modalHeaderGradient}
                            >
                                <View style={styles.modalTitleBox}>
                                    <Text style={styles.modalTitlePremium}>Identity settings</Text>
                                    <Text style={styles.modalSubTitlePremium}>Update your profile information</Text>
                                </View>
                                <TouchableOpacity
                                    style={styles.modalCloseButton}
                                    onPress={() => setIsEditing(false)}
                                >
                                    <MaterialCommunityIcons name="close" size={20} color="#fff" />
                                </TouchableOpacity>
                            </LinearGradient>

                            <View style={styles.modalBodyFields}>
                                <Text style={styles.premiumFieldLabel}>Full Name</Text>
                                <View style={styles.premiumInputContainer}>
                                    <MaterialCommunityIcons name="account-details-outline" size={20} color="#4F46E5" />
                                    <TextInput
                                        style={styles.premiumTextInput}
                                        placeholder="Enter your name"
                                        placeholderTextColor="#94A3B8"
                                        value={newName}
                                        onChangeText={setNewName}
                                        autoFocus={true}
                                    />
                                </View>

                                <Text style={styles.premiumFieldLabel}>Email Address</Text>
                                <View style={styles.premiumInputContainer}>
                                    <MaterialCommunityIcons name="email-outline" size={20} color="#4F46E5" />
                                    <TextInput
                                        style={styles.premiumTextInput}
                                        placeholder="Enter your email"
                                        placeholderTextColor="#94A3B8"
                                        value={newEmail}
                                        onChangeText={setNewEmail}
                                        keyboardType="email-address"
                                    />
                                </View>

                                <Text style={styles.premiumFieldLabel}>Phone Number</Text>
                                <View style={styles.premiumInputContainer}>
                                    <MaterialCommunityIcons name="phone-outline" size={20} color="#4F46E5" />
                                    <TextInput
                                        style={styles.premiumTextInput}
                                        placeholder="Enter your phone number"
                                        placeholderTextColor="#94A3B8"
                                        value={newPhone}
                                        onChangeText={setNewPhone}
                                        keyboardType="phone-pad"
                                    />
                                </View>

                                <TouchableOpacity
                                    style={styles.premiumPrimaryButton}
                                    onPress={handleUpdateProfile}
                                    disabled={updating}
                                >
                                    <LinearGradient
                                        colors={['#4F46E5', '#7C3AED']}
                                        style={styles.buttonGradientInner}
                                    >
                                        {updating ? (
                                            <ActivityIndicator color="#fff" size="small" />
                                        ) : (
                                            <>
                                                <MaterialCommunityIcons name="check-decagram" size={20} color="#fff" />
                                                <Text style={styles.primaryButtonText}>Sync Changes</Text>
                                            </>
                                        )}
                                    </LinearGradient>
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Premium Change Password Modal */}
            <Modal
                visible={isChangingPassword}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setIsChangingPassword(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalOverlay}
                >
                    <View style={styles.premiumModalSheet}>
                        <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
                            <LinearGradient
                                colors={['#F59E0B', '#D97706']}
                                style={styles.modalHeaderGradient}
                            >
                                <View style={styles.modalTitleBox}>
                                    <Text style={styles.modalTitlePremium}>Security Shield</Text>
                                    <Text style={styles.modalSubTitlePremium}>Change your access password</Text>
                                </View>
                                <TouchableOpacity
                                    style={styles.modalCloseButton}
                                    onPress={() => setIsChangingPassword(false)}
                                >
                                    <MaterialCommunityIcons name="close" size={20} color="#fff" />
                                </TouchableOpacity>
                            </LinearGradient>

                            <View style={styles.modalBodyFields}>
                                <Text style={styles.premiumFieldLabel}>New Security Code</Text>
                                <View style={styles.premiumInputContainer}>
                                    <MaterialCommunityIcons name="lock-outline" size={20} color="#F59E0B" />
                                    <TextInput
                                        style={styles.premiumTextInput}
                                        placeholder="Min 6 characters"
                                        placeholderTextColor="#94A3B8"
                                        value={newPassword}
                                        onChangeText={setNewPassword}
                                        secureTextEntry
                                    />
                                </View>

                                <Text style={styles.premiumFieldLabel}>Verification Code</Text>
                                <View style={styles.premiumInputContainer}>
                                    <MaterialCommunityIcons name="lock-check-outline" size={20} color="#F59E0B" />
                                    <TextInput
                                        style={styles.premiumTextInput}
                                        placeholder="Confirm new password"
                                        placeholderTextColor="#94A3B8"
                                        value={confirmPassword}
                                        onChangeText={setConfirmPassword}
                                        secureTextEntry
                                    />
                                </View>

                                <TouchableOpacity
                                    style={styles.premiumPrimaryButton}
                                    onPress={handleChangePassword}
                                    disabled={passwordUpdating}
                                >
                                    <LinearGradient
                                        colors={['#F59E0B', '#D97706']}
                                        style={styles.buttonGradientInner}
                                    >
                                        {passwordUpdating ? (
                                            <ActivityIndicator color="#fff" size="small" />
                                        ) : (
                                            <>
                                                <MaterialCommunityIcons name="shield-lock-outline" size={20} color="#fff" />
                                                <Text style={styles.primaryButtonText}>Solidify Password</Text>
                                            </>
                                        )}
                                    </LinearGradient>
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 40,
    },
    premiumHeaderBox: {
        width: '100%',
    },
    premiumHeaderGradient: {
        paddingTop: Platform.OS === 'ios' ? 45 : 25,
        paddingBottom: 10,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
    },
    headerTopBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        marginBottom: 2,
    },
    premiumBackButton: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    premiumHeaderTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#fff',
        letterSpacing: -0.5,
    },
    heroProfileSection: {
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    premiumAvatarContainer: {
        position: 'relative',
        marginBottom: 8,
    },
    avatarRing: {
        width: 65,
        height: 65,
        borderRadius: 22,
        padding: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarInner: {
        width: '100%',
        height: '100%',
        borderRadius: 20,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    avatarInitialText: {
        fontSize: 26,
        fontWeight: '900',
        color: '#4F46E5',
    },
    activeStatusBadge: {
        position: 'absolute',
        bottom: 5,
        right: 5,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#10B981',
        borderWidth: 4,
        borderColor: '#fff',
    },
    heroNameGroup: {
        alignItems: 'center',
        marginBottom: 8,
    },
    heroNameText: {
        fontSize: 20,
        fontWeight: '900',
        color: '#fff',
        marginBottom: 2,
        letterSpacing: -0.5,
    },
    roleBadgePremium: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 6,
    },
    roleTextPremium: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 1,
    },
    premiumEditFab: {
        borderRadius: 20,
        overflow: 'hidden',
    },
    glassButtonInner: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 6,
        gap: 6,
    },
    glassButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
    },
    contentSection: {
        paddingHorizontal: 24,
        marginTop: -20,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
        paddingHorizontal: 4,
    },
    premiumSectionTitle: {
        fontSize: 12,
        fontWeight: '900',
        color: '#1E293B',
        letterSpacing: 1.5,
        textTransform: 'uppercase',
    },
    premiumOptionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 24,
        marginBottom: 12,
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    optionIconBox: {
        width: 48,
        height: 48,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    optionInfoBox: {
        flex: 1,
    },
    optionLabelText: {
        fontSize: 12,
        fontWeight: '800',
        color: '#94A3B8',
        marginBottom: 2,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    optionValueText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1E293B',
    },
    premiumActionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 22,
        marginBottom: 10,
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 10,
        elevation: 1,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    actionIconBox: {
        width: 44,
        height: 44,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    actionLabelText: {
        flex: 1,
        fontSize: 16,
        fontWeight: '700',
        color: '#1E293B',
    },
    premiumSignOutCard: {
        marginTop: 30,
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#FEE2E2',
    },
    signOutInner: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    signOutIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 16,
        backgroundColor: '#FEE2E2',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    signOutTextMain: {
        flex: 1,
        fontSize: 16,
        fontWeight: '800',
        color: '#EF4444',
    },
    premiumFooter: {
        alignItems: 'center',
        marginTop: 40,
        marginBottom: 20,
        paddingHorizontal: 40,
    },
    footerAppTitle: {
        fontSize: 14,
        fontWeight: '900',
        color: '#1E293B',
        letterSpacing: 1,
        marginBottom: 4,
    },
    footerVersionText: {
        fontSize: 12,
        color: '#94A3B8',
        fontWeight: '600',
        marginBottom: 12,
    },
    footerDivider: {
        width: 40,
        height: 3,
        backgroundColor: '#E2E8F0',
        borderRadius: 2,
        marginBottom: 12,
    },
    footerLegalText: {
        fontSize: 10,
        color: '#CBD5E1',
        textAlign: 'center',
        lineHeight: 16,
        fontWeight: '600',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        justifyContent: 'flex-start',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 80 : 50,
    },
    premiumModalSheet: {
        backgroundColor: '#fff',
        borderRadius: 30,
        overflow: 'hidden',
        maxHeight: '90%',
    },
    modalHeaderGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 24,
        paddingTop: 30,
    },
    modalTitleBox: {
        flex: 1,
    },
    modalTitlePremium: {
        fontSize: 22,
        fontWeight: '900',
        color: '#fff',
        letterSpacing: -0.5,
    },
    modalSubTitlePremium: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.8)',
        fontWeight: '600',
        marginTop: 2,
    },
    modalCloseButton: {
        width: 36,
        height: 36,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalBodyFields: {
        padding: 24,
    },
    premiumFieldLabel: {
        fontSize: 11,
        fontWeight: '900',
        color: '#1E293B',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 10,
        marginLeft: 4,
    },
    premiumInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 18,
        paddingHorizontal: 16,
        height: 56,
        marginBottom: 24,
    },
    premiumTextInput: {
        flex: 1,
        marginLeft: 12,
        fontSize: 16,
        color: '#1E293B',
        fontWeight: '700',
    },
    premiumPrimaryButton: {
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: '#4F46E5',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 8,
    },
    buttonGradientInner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 56,
        gap: 10,
    },
    primaryButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
});

