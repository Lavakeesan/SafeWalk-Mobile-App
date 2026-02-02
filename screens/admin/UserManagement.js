import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    StatusBar,
    Platform,
    Image,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { collection, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';

export default function UserManagement({ navigation }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState('all');
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        try {
            setLoading(true);
            const usersSnapshot = await getDocs(collection(db, 'users'));
            const usersData = [];

            for (const userDoc of usersSnapshot.docs) {
                const data = userDoc.data();

                // Exclude admin users
                if (data.role === 'admin') continue;

                // Parse creation date
                let createdDate = null;
                if (data.createdAt) {
                    try {
                        createdDate = typeof data.createdAt.toDate === 'function'
                            ? data.createdAt.toDate()
                            : new Date(data.createdAt);
                    } catch (error) {
                        createdDate = null;
                    }
                }

                // Parse last login date
                let lastLogin = null;
                if (data.lastLogin) {
                    try {
                        lastLogin = typeof data.lastLogin.toDate === 'function'
                            ? data.lastLogin.toDate()
                            : new Date(data.lastLogin);
                    } catch (error) {
                        lastLogin = null;
                    }
                }

                // Get trusted contacts count (from subcollection or array)
                let trustedContactsCount = 0;
                if (data.trustedContacts && Array.isArray(data.trustedContacts)) {
                    trustedContactsCount = data.trustedContacts.length;
                }

                // Get walk sessions count (from subcollection or array)
                let walkSessionsCount = 0;
                if (data.walkSessions && Array.isArray(data.walkSessions)) {
                    walkSessionsCount = data.walkSessions.length;
                }

                usersData.push({
                    id: userDoc.id,
                    name: data.username || data.email?.split('@')[0] || 'Unknown User',
                    email: data.email || 'No email',
                    phone: data.phone || data.phoneNumber || 'N/A',
                    status: data.isActive !== false ? 'active' : 'inactive',
                    avatar: null,
                    createdAt: createdDate,
                    lastLogin: lastLogin,
                    trustedContactsCount: trustedContactsCount,
                    walkSessionsCount: walkSessionsCount,
                    role: data.role || 'user',
                    // Additional fields
                    fullData: data, // Store full data for detailed view
                });
            }

            // Sort by creation date (newest first)
            usersData.sort((a, b) => {
                if (!a.createdAt) return 1;
                if (!b.createdAt) return -1;
                return b.createdAt - a.createdAt;
            });

            setUsers(usersData);
            setLoading(false);
        } catch (error) {
            console.error('Error loading users:', error);
            Alert.alert('Error', 'Failed to load users');
            setLoading(false);
        }
    };

    const handleDeleteUser = async (userId, userName) => {
        Alert.alert(
            'Delete User',
            `Are you sure you want to delete ${userName}? This action cannot be undone.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const userRef = doc(db, 'users', userId);
                            await deleteDoc(userRef);

                            setUsers((prevUsers) => prevUsers.filter(u => u.id !== userId));
                            Alert.alert('Success', 'User deleted successfully');
                        } catch (error) {
                            console.error('Error deleting user:', error);
                            Alert.alert('Error', 'Failed to delete user: ' + error.message);
                        }
                    },
                },
            ]
        );
    };

    const filteredUsers = users.filter(user => {
        const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (user.phone && user.phone.toLowerCase().includes(searchQuery.toLowerCase()));
        const matchesFilter = activeFilter === 'all' || user.status === activeFilter;
        return matchesSearch && matchesFilter;
    });

    const FilterButton = ({ label, value }) => (
        <TouchableOpacity
            style={[
                styles.filterButton,
                activeFilter === value && styles.filterButtonActive,
            ]}
            onPress={() => setActiveFilter(value)}
        >
            <Text
                style={[
                    styles.filterButtonText,
                    activeFilter === value && styles.filterButtonTextActive,
                ]}
            >
                {label}
            </Text>
        </TouchableOpacity>
    );

    const UserItem = ({ user }) => {
        const formatDate = (date) => {
            if (!date) return 'N/A';
            return date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
        };

        return (
            <View style={styles.userItem}>
                <View style={styles.userAvatar}>
                    <MaterialCommunityIcons name="account" size={28} color="#6B7280" />
                </View>

                <View style={styles.userInfo}>
                    <View style={styles.userNameRow}>
                        <Text style={styles.userName}>{user.name}</Text>
                        <View
                            style={[
                                styles.statusBadge,
                                user.status === 'active' ? styles.statusActive : styles.statusInactive,
                            ]}
                        >
                            <Text
                                style={[
                                    styles.statusText,
                                    user.status === 'active' ? styles.statusTextActive : styles.statusTextInactive,
                                ]}
                            >
                                {user.status.toUpperCase()}
                            </Text>
                        </View>
                    </View>

                    <Text style={styles.userEmail}>{user.email}</Text>

                    {user.phone !== 'N/A' && (
                        <View style={styles.userDetailRow}>
                            <MaterialCommunityIcons name="phone" size={12} color="#9CA3AF" />
                            <Text style={styles.userDetailText}>{user.phone}</Text>
                        </View>
                    )}

                    <View style={styles.userMetaRow}>
                        <View style={styles.metaItem}>
                            <MaterialCommunityIcons name="calendar" size={12} color="#9CA3AF" />
                            <Text style={styles.metaText}>Joined {formatDate(user.createdAt)}</Text>
                        </View>
                    </View>

                    <View style={styles.userStatsRow}>
                        <View style={styles.statItem}>
                            <MaterialCommunityIcons name="account-group" size={14} color="#4F46E5" />
                            <Text style={styles.statText}>{user.trustedContactsCount} contacts</Text>
                        </View>
                        <View style={styles.statItem}>
                            <MaterialCommunityIcons name="map-marker-path" size={14} color="#10B981" />
                            <Text style={styles.statText}>{user.walkSessionsCount} walks</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.userActions}>
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => navigation.navigate('EditUser', { userId: user.id, user })}
                    >
                        <MaterialCommunityIcons name="pencil" size={20} color="#6B7280" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleDeleteUser(user.id, user.name)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        activeOpacity={0.6}
                    >
                        <MaterialCommunityIcons name="delete-outline" size={20} color="#EF4444" />
                    </TouchableOpacity>
                </View>
            </View>
        );
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
                <View style={styles.headerTitleContainer}>
                    <Text style={styles.headerTitle}>User Management</Text>
                    <Text style={styles.headerSubtitle}>{users.length} total users</Text>
                </View>
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <MaterialCommunityIcons name="magnify" size={20} color="#9CA3AF" />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search by name, email, or phone..."
                    placeholderTextColor="#9CA3AF"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>

            {/* Filters */}
            <View style={styles.filtersContainer}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.filtersContent}
                >
                    <FilterButton label="All Users" value="all" />
                    <FilterButton label="Active" value="active" />
                    <FilterButton label="Inactive" value="inactive" />
                </ScrollView>
            </View>

            {/* Users List */}
            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#4F46E5" />
                    <Text style={styles.loadingText}>Loading users...</Text>
                </View>
            ) : (
                <ScrollView
                    style={styles.usersList}
                    showsVerticalScrollIndicator={false}
                >
                    {filteredUsers.map((user) => (
                        <UserItem key={user.id} user={user} />
                    ))}

                    {filteredUsers.length === 0 && (
                        <View style={styles.emptyState}>
                            <MaterialCommunityIcons name="account-search" size={64} color="#D1D5DB" />
                            <Text style={styles.emptyStateText}>No users found</Text>
                        </View>
                    )}
                </ScrollView>
            )}

            {/* Add User FAB */}
            <TouchableOpacity
                style={styles.fab}
                onPress={() => navigation.navigate('AddUser')}
            >
                <MaterialCommunityIcons name="plus" size={28} color="#fff" />
            </TouchableOpacity>
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
    headerTitleContainer: {
        flex: 1,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#111827',
    },
    headerSubtitle: {
        fontSize: 13,
        color: '#6B7280',
        marginTop: 2,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        marginHorizontal: 20,
        marginTop: 20,
        marginBottom: 16,
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 48,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    searchInput: {
        flex: 1,
        marginLeft: 12,
        fontSize: 15,
        color: '#111827',
    },
    filtersContainer: {
        marginBottom: 20,
    },
    filtersContent: {
        paddingHorizontal: 20,
        gap: 12,
    },
    filterButton: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    filterButtonActive: {
        backgroundColor: '#4F46E5',
        borderColor: '#4F46E5',
    },
    filterButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6B7280',
    },
    filterButtonTextActive: {
        color: '#fff',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
    },
    loadingText: {
        fontSize: 14,
        color: '#6B7280',
        marginTop: 12,
    },
    usersList: {
        flex: 1,
        paddingHorizontal: 20,
    },
    userItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    userAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    userInfo: {
        flex: 1,
    },
    userNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    userName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#111827',
        marginRight: 8,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
    },
    statusActive: {
        backgroundColor: '#D1FAE5',
    },
    statusInactive: {
        backgroundColor: '#FEE2E2',
    },
    statusText: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    statusTextActive: {
        color: '#059669',
    },
    statusTextInactive: {
        color: '#DC2626',
    },
    userEmail: {
        fontSize: 13,
        color: '#6B7280',
        marginBottom: 4,
    },
    userDetailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
        gap: 6,
    },
    userDetailText: {
        fontSize: 12,
        color: '#6B7280',
    },
    userMetaRow: {
        marginTop: 6,
        marginBottom: 6,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    metaText: {
        fontSize: 11,
        color: '#9CA3AF',
    },
    userStatsRow: {
        flexDirection: 'row',
        marginTop: 8,
        gap: 16,
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    statText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#6B7280',
    },
    userActions: {
        flexDirection: 'row',
        gap: 8,
    },
    actionButton: {
        width: 36,
        height: 36,
        borderRadius: 8,
        backgroundColor: '#F9FAFB',
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    emptyStateText: {
        fontSize: 16,
        color: '#9CA3AF',
        marginTop: 16,
    },
    fab: {
        position: 'absolute',
        bottom: 30,
        right: 30,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#4F46E5',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#4F46E5',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
});
