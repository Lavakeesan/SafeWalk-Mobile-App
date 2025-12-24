import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { theme } from '../theme';

/**
 * Profile Screen
 * Displays user information and provides logout functionality
 */
export default function Profile({ navigation }) {
    const { user, logout } = useAuth();

    const handleLogout = () => {
        Alert.alert(
            'Logout',
            'Are you sure you want to logout?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Logout',
                    style: 'destructive',
                    onPress: async () => {
                        const result = await logout();
                        if (result.success) {
                            navigation.navigate('SignIn');
                        } else {
                            Alert.alert('Error', 'Failed to logout. Please try again.');
                        }
                    },
                },
            ]
        );
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={theme.colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Profile</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Profile Content */}
            <View style={styles.content}>
                {/* Avatar */}
                <View style={styles.avatarContainer}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>
                            {user?.displayName?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
                        </Text>
                    </View>
                </View>

                {/* User Info */}
                <View style={styles.infoSection}>
                    <Text style={styles.userName}>{user?.displayName || 'User'}</Text>
                    <Text style={styles.userEmail}>{user?.email || 'No email'}</Text>
                </View>

                {/* Profile Options */}
                <View style={styles.optionsContainer}>
                    <TouchableOpacity style={styles.optionItem}>
                        <MaterialCommunityIcons name="account-circle-outline" size={24} color={theme.colors.primary} />
                        <View style={styles.optionTextContainer}>
                            <Text style={styles.optionTitle}>Full Name</Text>
                            <Text style={styles.optionValue}>{user?.displayName || 'Not set'}</Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.optionItem}>
                        <MaterialCommunityIcons name="email-outline" size={24} color={theme.colors.primary} />
                        <View style={styles.optionTextContainer}>
                            <Text style={styles.optionTitle}>Email</Text>
                            <Text style={styles.optionValue}>{user?.email || 'Not set'}</Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.optionItem}>
                        <MaterialCommunityIcons name="shield-account-outline" size={24} color={theme.colors.primary} />
                        <View style={styles.optionTextContainer}>
                            <Text style={styles.optionTitle}>User ID</Text>
                            <Text style={styles.optionValue} numberOfLines={1}>{user?.uid || 'Not available'}</Text>
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Logout Button */}
                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <MaterialCommunityIcons name="logout" size={20} color="#fff" />
                    <Text style={styles.logoutText}>Logout</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 12,
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: theme.colors.text,
    },
    content: {
        flex: 1,
        padding: 16,
    },
    avatarContainer: {
        alignItems: 'center',
        marginVertical: 24,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: theme.colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        fontSize: 40,
        fontWeight: '700',
        color: '#fff',
    },
    infoSection: {
        alignItems: 'center',
        marginBottom: 32,
    },
    userName: {
        fontSize: 24,
        fontWeight: '700',
        color: theme.colors.text,
        marginBottom: 4,
    },
    userEmail: {
        fontSize: 14,
        color: theme.colors.subtitle,
    },
    optionsContainer: {
        gap: 12,
        marginBottom: 32,
    },
    optionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    optionTextContainer: {
        flex: 1,
        marginLeft: 12,
    },
    optionTitle: {
        fontSize: 12,
        color: theme.colors.subtitle,
        marginBottom: 2,
    },
    optionValue: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#EF4444',
        paddingVertical: 14,
        borderRadius: 12,
        gap: 8,
    },
    logoutText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
});
