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
    Modal,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { collection, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';

export default function UserManagement({ navigation }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState('all');
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [userToDelete, setUserToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

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

    const handleDeleteUser = (userId, userName) => {
        setUserToDelete({ id: userId, name: userName });
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        if (!userToDelete) return;

        setIsDeleting(true);
        try {
            const userRef = doc(db, 'users', userToDelete.id);
            await deleteDoc(userRef);

            setUsers((prevUsers) => prevUsers.filter(u => u.id !== userToDelete.id));
            setShowDeleteModal(false);
            setUserToDelete(null);
            Alert.alert('Success', 'User deleted successfully');
        } catch (error) {
            console.error('Error deleting user:', error);
            Alert.alert('Error', 'Failed to delete user: ' + error.message);
        } finally {
            setIsDeleting(false);
        }
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
            <StatusBar barStyle="light-content" />

            {/* Immersive Premium Header */}
            <View style={styles.premiumHeaderWrapper}>
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
                        <View style={styles.headerTitleLayer}>
                            <Text style={styles.premiumTitleMain}>Member Directory</Text>
                            <Text style={styles.premiumTitleSub}>Manage and monitor community users</Text>
                        </View>
                        <View style={styles.headerStatsBadge}>
                            <Text style={styles.statBadgeValue}>{users.length}</Text>
                            <Text style={styles.statBadgeLabel}>USERS</Text>
                        </View>
                    </View>

                    {/* Integrated Search Box */}
                    <View style={styles.integratedSearchBox}>
                        <MaterialCommunityIcons name="magnify" size={22} color="rgba(255,255,255,0.7)" />
                        <TextInput
                            style={styles.searchInputElement}
                            placeholder="Find member by name or email..."
                            placeholderTextColor="rgba(255,255,255,0.6)"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                        {searchQuery !== '' && (
                            <TouchableOpacity onPress={() => setSearchQuery('')}>
                                <MaterialCommunityIcons name="close-circle" size={18} color="#fff" />
                            </TouchableOpacity>
                        )}
                    </View>
                </LinearGradient>
            </View>

            {/* Filter Ribbons */}
            <View style={styles.filterSection}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.filterScrollContent}
                >
                    <FilterButton label="All Accounts" value="all" />
                    <FilterButton label="Active" value="active" />
                    <FilterButton label="Suspended" value="inactive" />
                </ScrollView>
            </View>

            {/* Data Feed */}
            {loading ? (
                <View style={styles.premiumLoadingContainer}>
                    <ActivityIndicator size="large" color="#4F46E5" />
                    <Text style={styles.premiumLoadingText}>Syncing Directory...</Text>
                </View>
            ) : (
                <ScrollView
                    style={styles.directoryList}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 100 }}
                >
                    {filteredUsers.map((user) => (
                        <TouchableOpacity
                            key={user.id}
                            style={styles.premiumUserCard}
                            activeOpacity={0.9}
                            onPress={() => navigation.navigate('EditUser', { userId: user.id, user })}
                        >
                            <View style={styles.userCardInfo}>
                                <View style={styles.userAvatarBox}>
                                    <LinearGradient
                                        colors={['#EEF2FF', '#E0E7FF']}
                                        style={styles.avatarInnerBox}
                                    >
                                        <Text style={styles.avatarLetter}>{user.name.charAt(0).toUpperCase()}</Text>
                                    </LinearGradient>
                                    <View style={[styles.statusIndicator, { backgroundColor: user.status === 'active' ? '#10B981' : '#EF4444' }]} />
                                </View>

                                <View style={styles.userMainContent}>
                                    <View style={styles.userHeadRow}>
                                        <Text style={styles.premiumUserName}>{user.name}</Text>
                                        <View style={[styles.premiumStatusBadge, { backgroundColor: user.status === 'active' ? '#ECFDF5' : '#FEF2F2' }]}>
                                            <Text style={[styles.premiumStatusText, { color: user.status === 'active' ? '#059669' : '#DC2626' }]}>
                                                {user.status.toUpperCase()}
                                            </Text>
                                        </View>
                                    </View>
                                    <Text style={styles.premiumUserEmail}>{user.email}</Text>

                                    <View style={styles.premiumUserMetaRow}>
                                        <View style={styles.premiumMetaItem}>
                                            <MaterialCommunityIcons name="shield-account-outline" size={14} color="#94A3B8" />
                                            <Text style={styles.premiumMetaText}>{user.trustedContactsCount} Contacts</Text>
                                        </View>
                                        <View style={styles.premiumMetaDivider} />
                                        <View style={styles.premiumMetaItem}>
                                            <MaterialCommunityIcons name="walk" size={14} color="#94A3B8" />
                                            <Text style={styles.premiumMetaText}>{user.walkSessionsCount} Walks</Text>
                                        </View>
                                    </View>
                                </View>
                            </View>

                            <View style={styles.userActionArea}>
                                <TouchableOpacity
                                    style={styles.userActionIcon}
                                    onPress={() => navigation.navigate('EditUser', { userId: user.id, user })}
                                >
                                    <MaterialCommunityIcons name="pencil" size={18} color="#4F46E5" />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.userActionIcon, { backgroundColor: '#FEF2F2' }]}
                                    onPress={() => handleDeleteUser(user.id, user.name)}
                                >
                                    <MaterialCommunityIcons name="trash-can-outline" size={18} color="#EF4444" />
                                </TouchableOpacity>
                            </View>
                        </TouchableOpacity>
                    ))}

                    {filteredUsers.length === 0 && (
                        <View style={styles.premiumEmptyState}>
                            <View style={styles.emptyIllustrationBox}>
                                <MaterialCommunityIcons name="account-search-outline" size={80} color="#E2E8F0" />
                            </View>
                            <Text style={styles.emptyStateMainText}>No Members Found</Text>
                            <Text style={styles.emptyStateSubText}>Try adjusting your search or filters to find a member.</Text>
                        </View>
                    )}
                </ScrollView>
            )}

            {/* Premium Add FAB */}
            <TouchableOpacity
                style={styles.premiumFab}
                onPress={() => navigation.navigate('AddUser')}
            >
                <LinearGradient
                    colors={['#4F46E5', '#7C3AED']}
                    style={styles.fabGradientInner}
                >
                    <MaterialCommunityIcons name="plus" size={30} color="#fff" />
                </LinearGradient>
            </TouchableOpacity>

            {/* Delete Confirmation Modal */}
            <Modal
                visible={showDeleteModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowDeleteModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.deleteModalContent}>
                        <View style={styles.warningIconBadge}>
                            <MaterialCommunityIcons name="alert-outline" size={40} color="#EF4444" />
                        </View>

                        <Text style={styles.deleteModalTitle}>Delete User?</Text>
                        <Text style={styles.deleteModalMessage}>
                            Are you sure you want to delete <Text style={styles.highlightText}>{userToDelete?.name}</Text>?
                            All associated data will be permanently removed. This action cannot be undone.
                        </Text>

                        <View style={styles.deleteModalActions}>
                            <TouchableOpacity
                                style={styles.cancelModalButton}
                                onPress={() => {
                                    setShowDeleteModal(false);
                                    setUserToDelete(null);
                                }}
                                disabled={isDeleting}
                            >
                                <Text style={styles.cancelModalButtonText}>Cancel</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.confirmDeleteButton}
                                onPress={confirmDelete}
                                disabled={isDeleting}
                            >
                                {isDeleting ? (
                                    <ActivityIndicator color="#fff" size="small" />
                                ) : (
                                    <View style={styles.confirmDeleteContent}>
                                        <MaterialCommunityIcons name="delete-forever" size={18} color="#fff" />
                                        <Text style={styles.confirmDeleteButtonText}>Delete</Text>
                                    </View>
                                )}
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
        backgroundColor: '#F8FAFC',
    },
    premiumHeaderWrapper: {
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
        marginBottom: 20,
    },
    premiumBackButton: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitleLayer: {
        flex: 1,
        marginLeft: 16,
    },
    premiumTitleMain: {
        fontSize: 22,
        fontWeight: '800',
        color: '#fff',
        letterSpacing: -0.5,
    },
    premiumTitleSub: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.7)',
        fontWeight: '500',
    },
    headerStatsBadge: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        alignItems: 'center',
    },
    statBadgeValue: {
        fontSize: 16,
        fontWeight: '800',
        color: '#fff',
    },
    statBadgeLabel: {
        fontSize: 8,
        fontWeight: '800',
        color: '#fff',
        opacity: 0.8,
    },
    integratedSearchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: 18,
        marginHorizontal: 20,
        paddingHorizontal: 16,
        height: 52,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    searchInputElement: {
        flex: 1,
        marginLeft: 12,
        fontSize: 15,
        color: '#fff',
        fontWeight: '500',
    },
    filterSection: {
        marginTop: 20,
        marginBottom: 8,
    },
    filterScrollContent: {
        paddingHorizontal: 24,
        gap: 10,
    },
    filterButton: {
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: 14,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    filterButtonActive: {
        backgroundColor: '#4F46E5',
        borderColor: '#4F46E5',
        shadowColor: '#4F46E5',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    filterButtonText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#64748B',
    },
    filterButtonTextActive: {
        color: '#fff',
    },
    directoryList: {
        flex: 1,
        paddingHorizontal: 24,
    },
    premiumUserCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    userCardInfo: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    userAvatarBox: {
        position: 'relative',
        marginRight: 16,
    },
    avatarInnerBox: {
        width: 52,
        height: 52,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarLetter: {
        fontSize: 18,
        fontWeight: '800',
        color: '#4F46E5',
    },
    statusIndicator: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        width: 14,
        height: 14,
        borderRadius: 7,
        borderWidth: 2.5,
        borderColor: '#fff',
    },
    userMainContent: {
        flex: 1,
    },
    userHeadRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 2,
        gap: 8,
    },
    premiumUserName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1E293B',
    },
    premiumStatusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
    },
    premiumStatusText: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.2,
    },
    premiumUserEmail: {
        fontSize: 13,
        color: '#64748B',
        marginBottom: 8,
    },
    premiumUserMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    premiumMetaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    premiumMetaDivider: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#E2E8F0',
    },
    premiumMetaText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#94A3B8',
    },
    userActionArea: {
        marginLeft: 12,
        gap: 8,
    },
    userActionIcon: {
        width: 36,
        height: 36,
        borderRadius: 12,
        backgroundColor: '#EEF2FF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    premiumLoadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    premiumLoadingText: {
        marginTop: 12,
        fontSize: 14,
        fontWeight: '600',
        color: '#64748B',
    },
    premiumEmptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 80,
    },
    emptyIllustrationBox: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#F8FAFC',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    emptyStateMainText: {
        fontSize: 18,
        fontWeight: '800',
        color: '#1E293B',
        marginBottom: 8,
    },
    emptyStateSubText: {
        fontSize: 14,
        color: '#94A3B8',
        textAlign: 'center',
        paddingHorizontal: 40,
        lineHeight: 20,
    },
    premiumFab: {
        position: 'absolute',
        bottom: 30,
        right: 24,
        shadowColor: '#4F46E5',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
    },
    fabGradientInner: {
        width: 60,
        height: 60,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    deleteModalContent: {
        backgroundColor: '#fff',
        width: '100%',
        borderRadius: 30,
        padding: 28,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.15,
        shadowRadius: 30,
        elevation: 10,
    },
    warningIconBadge: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#FEF2F2',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    deleteModalTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: '#1E293B',
        marginBottom: 10,
    },
    deleteModalMessage: {
        fontSize: 15,
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 30,
    },
    highlightText: {
        color: '#1E293B',
        fontWeight: '800',
    },
    deleteModalActions: {
        flexDirection: 'row',
        width: '100%',
        gap: 12,
    },
    cancelModalButton: {
        flex: 1,
        height: 56,
        borderRadius: 16,
        backgroundColor: '#F1F5F9',
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelModalButtonText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#64748B',
    },
    confirmDeleteButton: {
        flex: 1,
        height: 56,
        borderRadius: 16,
        backgroundColor: '#EF4444',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#EF4444',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
    },
    confirmDeleteContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    confirmDeleteButtonText: {
        fontSize: 15,
        fontWeight: '800',
        color: '#fff',
    },
});
