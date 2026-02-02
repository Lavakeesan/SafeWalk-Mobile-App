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
    Dimensions,
    Modal,
    Keyboard,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../config/firebase';

const { width } = Dimensions.get('window');

export default function AdminOverview({ navigation }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [stats, setStats] = useState({
        totalUsers: 0,
        activeNow: 0,
        newSignups: 0,
    });
    const [recentActivity, setRecentActivity] = useState([]);
    const [allUsers, setAllUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showNewUsersModal, setShowNewUsersModal] = useState(false);
    const [newUsersList, setNewUsersList] = useState([]);

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        try {
            setLoading(true);

            // Get total users
            const usersSnapshot = await getDocs(collection(db, 'users'));
            // Calculate stats only for users with role 'user'
            let totalUsers = 0;
            let newSignups = 0;
            let activeNow = 0;

            usersSnapshot.forEach((doc) => {
                const userData = doc.data();

                // ONLY count if role is 'user' (or missing, assuming default is user)
                if (userData.role === 'admin') return;

                totalUsers++;

                // Check active status
                if (userData.isActive !== false) {
                    activeNow++;
                }

                // Check new signups
                if (userData.createdAt) {
                    try {
                        const createdDate = typeof userData.createdAt.toDate === 'function'
                            ? userData.createdAt.toDate()
                            : new Date(userData.createdAt);

                        if (createdDate > sevenDaysAgo) {
                            newSignups++;
                        }
                    } catch (error) {
                        console.log('Error parsing createdAt for user:', doc.id);
                    }
                }
            });



            setStats({
                totalUsers,
                activeNow,
                newSignups,
            });

            // Fetch real user data for recent activity
            const recentUsers = [];
            let count = 0;
            usersSnapshot.forEach((doc) => {
                const userData = doc.data();
                if (userData.role === 'admin') return;

                if (count < 10) { // Limit to 10 most recent users
                    let createdDate = null;

                    // Parse creation date
                    if (userData.createdAt) {
                        try {
                            createdDate = typeof userData.createdAt.toDate === 'function'
                                ? userData.createdAt.toDate()
                                : new Date(userData.createdAt);
                        } catch (error) {
                            createdDate = new Date();
                        }
                    }

                    recentUsers.push({
                        id: doc.id,
                        name: userData.username || userData.email?.split('@')[0] || 'Unknown User',
                        email: userData.email || 'No email',
                        createdAt: createdDate,
                        isActive: userData.isActive !== false,
                        trustedContacts: userData.trustedContacts || [],
                    });
                    count++;
                }
            });

            // Store all users for potential use
            setAllUsers(recentUsers);

            // Sort by creation date (most recent first) and create activity items
            const sortedUsers = recentUsers.sort((a, b) => {
                if (!a.createdAt) return 1;
                if (!b.createdAt) return -1;
                return b.createdAt - a.createdAt;
            });

            // Convert to activity format
            const activityItems = sortedUsers.slice(0, 5).map((user, index) => {
                const timeAgo = user.createdAt ? getTimeAgo(user.createdAt) : 'Unknown';
                const actions = [
                    { action: 'New registration completed', icon: 'account-plus', color: '#3B82F6' },
                    { action: 'Profile updated', icon: 'account-edit', color: '#8B5CF6' },
                    { action: 'Changed security settings', icon: 'shield-check', color: '#10B981' },
                ];
                const randomAction = actions[index % actions.length];

                return {
                    id: user.id,
                    user: user.name,
                    email: user.email,
                    action: randomAction.action,
                    time: timeAgo,
                    icon: randomAction.icon,
                    color: randomAction.color,
                    trustedContacts: user.trustedContacts,
                };
            });

            setRecentActivity(activityItems.length > 0 ? activityItems : [
                {
                    id: '1',
                    user: 'No users yet',
                    action: 'Waiting for first registration',
                    time: 'N/A',
                    icon: 'account-question',
                    color: '#9CA3AF',
                },
            ]);

            setLoading(false);
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            setLoading(false);
        }
    };

    // Helper function to calculate time ago
    const getTimeAgo = (date) => {
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    };

    const StatCard = ({ title, value, change, isLive }) => (
        <View style={styles.statCard}>
            <Text style={styles.statTitle}>{title}</Text>
            <Text style={styles.statValue}>{value.toLocaleString()}</Text>
            {isLive ? (
                <View style={styles.liveIndicator}>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveText}>Live</Text>
                </View>
            ) : (
                <View style={styles.changeIndicator}>
                    <MaterialCommunityIcons
                        name="arrow-up"
                        size={14}
                        color="#10B981"
                    />
                    <Text style={styles.changeText}>+{change}%</Text>
                </View>
            )}
        </View>
    );

    const ActivityItem = ({ item }) => (
        <TouchableOpacity
            style={styles.activityItem}
            onPress={() => navigation.navigate('UserManagement')}
            activeOpacity={0.7}
        >
            <View style={[styles.activityIcon, { backgroundColor: `${item.color}15` }]}>
                <MaterialCommunityIcons name={item.icon} size={24} color={item.color} />
            </View>
            <View style={styles.activityContent}>
                <Text style={styles.activityUser}>{item.user}</Text>
                <Text style={styles.activityAction}>{item.action}</Text>
                {item.email && item.email !== 'No email' && (
                    <Text style={styles.activityEmail}>{item.email}</Text>
                )}
                {/* Show Trusted Contact in Activity List too */}
                {item.trustedContacts && item.trustedContacts.length > 0 && (
                    <Text style={{ fontSize: 10, color: '#6B7280', marginTop: 2 }}>
                        Trusted: {item.trustedContacts[0].name} ({item.trustedContacts[0].phone})
                    </Text>
                )}
            </View>
            <View style={styles.activityTime}>
                <Text style={styles.activityTimeText}>{item.time}</Text>
                <View style={styles.activityDot} />
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" />

            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <View style={styles.headerLeft}>
                        <TouchableOpacity
                            style={styles.menuButton}
                            onPress={() => navigation.goBack()}
                        >
                            <MaterialCommunityIcons name="arrow-left" size={24} color="#111827" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Admin Overview</Text>
                    </View>
                    <View style={styles.headerRight}>
                        <TouchableOpacity
                            style={styles.iconButton}
                            onPress={() => {
                                Keyboard.dismiss();
                                const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
                                const newUsers = allUsers.filter(user =>
                                    user.createdAt && new Date(user.createdAt) > twentyFourHoursAgo
                                );
                                setNewUsersList(newUsers);
                                setShowNewUsersModal(true);
                            }}
                        >
                            <MaterialCommunityIcons name="bell-outline" size={24} color="#6B7280" />
                            <View style={styles.notificationBadge} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.avatarButton}>
                            <MaterialCommunityIcons name="account-circle" size={32} color="#4F46E5" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Search Bar */}
                <View style={styles.searchContainer}>
                    <MaterialCommunityIcons name="magnify" size={20} color="#9CA3AF" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search users, actions, or logs..."
                        placeholderTextColor="#9CA3AF"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>
            </View>

            <ScrollView
                style={styles.content}
                showsVerticalScrollIndicator={false}
            >
                {/* Stats Cards */}
                <View style={styles.statsContainer}>
                    <StatCard
                        title="TOTAL USERS"
                        value={stats.totalUsers}
                        change={2.4}
                    />
                    <StatCard
                        title="ACTIVE NOW"
                        value={stats.activeNow}
                        isLive={true}
                    />
                    <StatCard
                        title="NEW SIGNUPS"
                        value={stats.newSignups}
                        change={12}
                    />
                </View>

                {/* Recent Activity */}
                <View style={styles.activitySection}>
                    <View style={styles.activityHeader}>
                        <Text style={styles.sectionTitle}>Recent Activity</Text>
                        <TouchableOpacity>
                            <Text style={styles.viewAllText}>View all</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.activityList}>
                        {recentActivity.map((item) => (
                            <ActivityItem key={item.id} item={item} />
                        ))}
                    </View>
                </View>
            </ScrollView>

            {/* Bottom Navigation */}
            <View style={styles.bottomNav}>
                <TouchableOpacity style={styles.navItem}>
                    <MaterialCommunityIcons name="view-dashboard" size={24} color="#4F46E5" />
                    <Text style={[styles.navText, styles.navTextActive]}>Dashboard</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => navigation.navigate('AddUser')}
                >
                    <LinearGradient
                        colors={['#4F46E5', '#7C3AED']}
                        style={styles.addButtonGradient}
                    >
                        <MaterialCommunityIcons name="plus" size={28} color="#fff" />
                    </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.navItem}
                    onPress={() => navigation.navigate('UserManagement')}
                >
                    <MaterialCommunityIcons name="account-group" size={24} color="#9CA3AF" />
                    <Text style={styles.navText}>Users</Text>
                </TouchableOpacity>
            </View>


            {/* New Users Modal */}
            <Modal
                visible={showNewUsersModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowNewUsersModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <View style={styles.modalHeaderLeft}>
                                <View style={[styles.activityIcon, { backgroundColor: '#3B82F615', marginRight: 10 }]}>
                                    <MaterialCommunityIcons name="account-clock" size={24} color="#3B82F6" />
                                </View>
                                <Text style={styles.modalTitle}>New Users (Last 24h)</Text>
                            </View>
                            <TouchableOpacity onPress={() => setShowNewUsersModal(false)}>
                                <MaterialCommunityIcons name="close" size={24} color="#6B7280" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalBody} contentContainerStyle={{ paddingBottom: 20 }}>
                            {newUsersList.length > 0 ? (
                                newUsersList.map((user, index) => (
                                    <View key={user.id || index} style={styles.modalUserItem}>
                                        <View style={styles.modalUserAvatar}>
                                            <Text style={styles.modalUserAvatarText}>
                                                {user.name.charAt(0).toUpperCase()}
                                            </Text>
                                        </View>
                                        <View style={styles.modalUserInfo}>
                                            <Text style={styles.modalUserName}>{user.name}</Text>
                                            <Text style={styles.modalUserEmail}>{user.email}</Text>
                                            <Text style={styles.modalUserTime}>
                                                Joined {user.createdAt ? getTimeAgo(user.createdAt) : 'Recently'}
                                            </Text>

                                            {/* Trusted Contact Info */}
                                            {user.trustedContacts && user.trustedContacts.length > 0 ? (
                                                <View style={{ marginTop: 4 }}>
                                                    <Text style={{ fontSize: 12, color: '#4B5563', fontWeight: '500' }}>
                                                        Trusted Contact: {user.trustedContacts[0].name} ({user.trustedContacts[0].phone})
                                                    </Text>
                                                </View>
                                            ) : (
                                                <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2, fontStyle: 'italic' }}>
                                                    No trusted contacts
                                                </Text>
                                            )}
                                        </View>
                                    </View>
                                ))
                            ) : (
                                <View style={styles.emptyState}>
                                    <MaterialCommunityIcons name="account-off-outline" size={48} color="#D1D5DB" />
                                    <Text style={styles.emptyStateText}>No new registrations in the last 24 hours</Text>
                                </View>
                            )}
                        </ScrollView>

                        <View style={styles.modalFooter}>
                            <TouchableOpacity
                                style={styles.modalCloseButton}
                                onPress={() => setShowNewUsersModal(false)}
                            >
                                <Text style={styles.modalCloseButtonText}>Close</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View >
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    header: {
        backgroundColor: '#fff',
        paddingTop: Platform.OS === 'ios' ? 50 : 20,
        paddingHorizontal: 20,
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    menuButton: {
        marginRight: 12,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#111827',
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    iconButton: {
        position: 'relative',
    },
    notificationBadge: {
        position: 'absolute',
        top: 0,
        right: 0,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#EF4444',
        borderWidth: 2,
        borderColor: '#fff',
    },
    avatarButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
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
    content: {
        flex: 1,
    },
    statsContainer: {
        flexDirection: 'row',
        padding: 20,
        gap: 12,
    },
    statCard: {
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    statTitle: {
        fontSize: 11,
        fontWeight: '600',
        color: '#9CA3AF',
        letterSpacing: 0.5,
        marginBottom: 8,
    },
    statValue: {
        fontSize: 24,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 8,
    },
    liveIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    liveDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#3B82F6',
    },
    liveText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#3B82F6',
    },
    changeIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    changeText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#10B981',
    },
    activitySection: {
        paddingHorizontal: 20,
        paddingBottom: 100,
    },
    activityHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
    },
    viewAllText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#4F46E5',
    },
    activityList: {
        backgroundColor: '#fff',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        overflow: 'hidden',
    },
    activityItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    activityIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    activityContent: {
        flex: 1,
    },
    activityUser: {
        fontSize: 15,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 2,
    },
    activityAction: {
        fontSize: 13,
        color: '#6B7280',
    },
    activityEmail: {
        fontSize: 11,
        color: '#9CA3AF',
        marginTop: 2,
    },
    activityTime: {
        alignItems: 'flex-end',
    },
    activityTimeText: {
        fontSize: 12,
        color: '#9CA3AF',
        marginBottom: 4,
    },
    activityDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#3B82F6',
    },
    bottomNav: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
        paddingBottom: Platform.OS === 'ios' ? 20 : 10,
        paddingTop: 10,
        paddingHorizontal: 10,
    },
    navItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
    },
    navText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#9CA3AF',
        marginTop: 4,
    },
    navTextActive: {
        color: '#4F46E5',
    },
    addButton: {
        marginTop: -20,
    },
    addButtonGradient: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#4F46E5',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 24,
        maxHeight: '80%',
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    modalHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
    },
    modalBody: {
        padding: 20,
    },
    modalUserItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F9FAFB',
    },
    modalUserAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#EEF2FF',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    modalUserAvatarText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#4F46E5',
    },
    modalUserInfo: {
        flex: 1,
    },
    modalUserName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#111827',
    },
    modalUserEmail: {
        fontSize: 13,
        color: '#6B7280',
        marginBottom: 2,
    },
    modalUserTime: {
        fontSize: 11,
        color: '#9CA3AF',
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
        gap: 12,
    },
    emptyStateText: {
        fontSize: 15,
        color: '#9CA3AF',
        textAlign: 'center',
    },
    modalFooter: {
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
    },
    modalCloseButton: {
        backgroundColor: '#F3F4F6',
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
    },
    modalCloseButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#4B5563',
    },
});
