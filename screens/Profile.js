import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    StatusBar,
    ScrollView,
    Alert,
    Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

export default function Profile({ navigation }) {
    const { user, logout } = useAuth();

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

                    {/* Profile Avatar */}
                    <View style={styles.avatarContainer}>
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>
                                {user?.displayName?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
                            </Text>
                        </View>
                        <View style={styles.verifiedBadge}>
                            <MaterialCommunityIcons name="check-circle" size={24} color="#10B981" />
                        </View>
                    </View>

                    <Text style={styles.userName}>{user?.displayName || 'User'}</Text>
                    <Text style={styles.userEmail}>{user?.email || 'No email'}</Text>
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

                {/* Main Sign Out Button (at the very bottom) */}
                <TouchableOpacity
                    style={styles.logoutButton}
                    onPress={handleSignOut}
                    activeOpacity={0.8}
                >
                    <LinearGradient
                        colors={['#EF4444', '#DC2626']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.logoutGradient}
                    >
                        <MaterialCommunityIcons name="logout" size={20} color="#fff" />
                        <Text style={styles.logoutText}>Sign Out</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </ScrollView>
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
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingBottom: 32,
        paddingHorizontal: 20,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: '#fff',
    },
    avatarContainer: {
        alignItems: 'center',
        marginBottom: 16,
        position: 'relative',
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 4,
        borderColor: '#fff',
    },
    avatarText: {
        fontSize: 40,
        fontWeight: '800',
        color: '#fff',
    },
    verifiedBadge: {
        position: 'absolute',
        bottom: 0,
        right: '35%',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 2,
    },
    userName: {
        fontSize: 24,
        fontWeight: '800',
        color: '#fff',
        textAlign: 'center',
        marginBottom: 4,
    },
    userEmail: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.9)',
        textAlign: 'center',
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
    logoutButton: {
        marginHorizontal: 20,
        marginTop: 10,
        marginBottom: 20,
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#EF4444',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    logoutGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        gap: 8,
    },
    logoutText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
    },
});
