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
    ActivityIndicator,
    Alert,
    Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';

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
    const [showAlertModal, setShowAlertModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [alertMessage, setAlertMessage] = useState('');
    const [showUserDropdown, setShowUserDropdown] = useState(false);
    const [showContactsModal, setShowContactsModal] = useState(false);
    const [usersWithContacts, setUsersWithContacts] = useState([]);
    const [fetchingContacts, setFetchingContacts] = useState(false);
    const [contactsSearchQuery, setContactsSearchQuery] = useState('');
    const [sendingAlert, setSendingAlert] = useState(false);
    const [showAdminProfileModal, setShowAdminProfileModal] = useState(false);
    const { user: adminUser, logout } = useAuth();

    const filteredSearchResults = searchQuery.trim() === ''
        ? []
        : allUsers.filter(user =>
            user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (user.phone && user.phone.includes(searchQuery))
        );

    useEffect(() => {
        loadDashboardData();
    }, []);

    const handleMakeCall = (phoneNumber) => {
        if (!phoneNumber) {
            Alert.alert('Error', 'No phone number available for this contact.');
            return;
        }

        const url = `tel:${phoneNumber}`;
        Linking.canOpenURL(url)
            .then((supported) => {
                if (supported) {
                    Linking.openURL(url);
                } else {
                    Alert.alert('Error', 'Telephone calls are not supported on this device or the number is invalid.');
                }
            })
            .catch((err) => console.error('An error occurred', err));
    };

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

            // Fetch real user data for dashboard and modals
            const allRegularUsers = [];
            usersSnapshot.forEach((doc) => {
                const userData = doc.data();
                if (userData.role === 'admin') return;

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

                allRegularUsers.push({
                    id: doc.id,
                    name: userData.username || userData.fullName || userData.email?.split('@')[0] || 'Unknown User',
                    email: userData.email || 'No email',
                    phone: userData.phone || '',
                    createdAt: createdDate,
                    isActive: userData.isActive !== false,
                });
            });

            // Store all regular users (sorted by date for the dashboard activity section)
            const sortedUsers = allRegularUsers.sort((a, b) => {
                if (!a.createdAt) return 1;
                if (!b.createdAt) return -1;
                return b.createdAt - a.createdAt;
            });

            setAllUsers(sortedUsers);

            // Convert to activity format (using top 5 most recent)
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

    const loadTrustedContacts = async () => {
        try {
            setFetchingContacts(true);
            setShowContactsModal(true);

            const usersAndContacts = [];

            // Only fetch for regular users
            const regularUsers = allUsers.filter(u => u.role !== 'admin');

            for (const user of regularUsers) {
                const contactsRef = collection(db, 'trusted_contacts');
                const contactsQuery = query(contactsRef, where('userId', '==', user.id));
                const contactsSnap = await getDocs(contactsQuery);
                const contacts = contactsSnap.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));

                // We show users even if they have no contacts for management visibility,
                // or we can filter it. The user asked to show users and their contacts.
                usersAndContacts.push({
                    ...user,
                    contacts
                });
            }

            setUsersWithContacts(usersAndContacts);
        } catch (error) {
            console.error('Error fetching trusted contacts:', error);
        } finally {
            setFetchingContacts(false);
        }
    };

    const handleSendAlert = async () => {
        if (!selectedUser || !alertMessage.trim()) {
            Alert.alert('Error', 'Please select a user and enter a message.');
            return;
        }

        if (!selectedUser.phone) {
            Alert.alert('Error', 'This user does not have a phone number registered.');
            return;
        }

        setSendingAlert(true);
        try {
            const apiToken = process.env.EXPO_PUBLIC_TEXTLK_API_TOKEN;
            const senderId = process.env.EXPO_PUBLIC_TEXTLK_SENDER_ID;

            const response = await fetch('https://app.text.lk/api/v3/sms/send', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiToken}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({
                    recipient: selectedUser.phone,
                    sender_id: senderId,
                    message: alertMessage,
                }),
            });

            const data = await response.json();

            if (response.ok) {
                Alert.alert('Success', `Alert sent successfully to ${selectedUser.name}!`);
                setShowAlertModal(false);
                setAlertMessage('');
                setSelectedUser(null);
            } else {
                throw new Error(data.message || 'Failed to send SMS');
            }
        } catch (error) {
            console.error('Error sending alert:', error);
            Alert.alert('Failure', `Error sending alert: ${error.message}`);
        } finally {
            setSendingAlert(false);
        }
    };

    const StatCard = ({ title, value, change, isLive, icon, color }) => (
        <View style={styles.statCard}>
            <View style={styles.statCardLeft}>
                <View style={[styles.statIconContainer, { backgroundColor: `${color}15` }]}>
                    <MaterialCommunityIcons name={icon} size={22} color={color} />
                </View>
                <Text style={styles.statTitle}>{title}</Text>
                <Text style={styles.statValue}>{value.toLocaleString()}</Text>
            </View>
            <View style={styles.statCardRight}>
                {isLive && (
                    <View style={styles.liveIndicatorPremium}>
                        <View style={styles.liveDotPremium} />
                        <Text style={styles.liveTextPremium}>LIVE</Text>
                    </View>
                )}
            </View>
        </View>
    );

    const ActivityItem = ({ item }) => (
        <TouchableOpacity
            style={styles.premiumActivityItem}
            onPress={() => navigation.navigate('UserManagement')}
            activeOpacity={0.7}
        >
            <View style={[styles.activityIconCircle, { backgroundColor: `${item.color}15` }]}>
                <MaterialCommunityIcons name={item.icon} size={22} color={item.color} />
            </View>
            <View style={styles.activityMainContent}>
                <View style={styles.activityMeta}>
                    <Text style={styles.activityUserPremium}>{item.user}</Text>
                    <Text style={styles.activityTimePremium}>{item.time}</Text>
                </View>
                <Text style={styles.activityActionPremium}>{item.action}</Text>
                {item.email && item.email !== 'No email' && (
                    <Text style={styles.activityEmailPremium}>{item.email}</Text>
                )}
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color="#CBD5E1" />
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />

            {/* Premium Header Design */}
            <View style={styles.premiumHeaderContainer}>
                <LinearGradient
                    colors={['#4F46E5', '#7C3AED', '#6366F1']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.premiumHeaderGradient}
                >
                    <View style={styles.headerSafeLayer}>
                        <View style={styles.headerTopNavigation}>
                            <View style={styles.greetingSection}>
                                <Text style={styles.greetingPrefix}>Welcome back,</Text>
                                <Text style={styles.adminDisplayName}>
                                    {adminUser?.displayName || 'Administrator'}
                                </Text>
                            </View>
                            <View style={styles.headerActionsBox}>
                                <TouchableOpacity
                                    style={styles.premiumHeaderIcon}
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
                                    <MaterialCommunityIcons name="bell-ring-outline" size={24} color="#fff" />
                                    <View style={styles.premiumBadge} />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.premiumAvatarBox}
                                    onPress={() => setShowAdminProfileModal(true)}
                                >
                                    <LinearGradient
                                        colors={['#fff', '#E0E7FF']}
                                        style={styles.avatarInnerGradient}
                                    >
                                        <MaterialCommunityIcons name="shield-check" size={20} color="#4F46E5" />
                                    </LinearGradient>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Search Bar Integration */}
                        <View style={styles.immersiveSearchBox}>
                            <MaterialCommunityIcons name="magnify" size={22} color="rgba(255,255,255,0.7)" />
                            <TextInput
                                style={styles.immersiveSearchInput}
                                placeholder="Search system resources..."
                                placeholderTextColor="rgba(255,255,255,0.6)"
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                            />
                        </View>
                    </View>
                </LinearGradient>
            </View>

            <ScrollView
                style={styles.content}
                showsVerticalScrollIndicator={false}
            >
                {searchQuery.trim() !== '' ? (
                    <View style={styles.searchResultsSection}>
                        <View style={styles.searchSectionHeader}>
                            <Text style={styles.sectionTitle}>Search Results</Text>
                            <TouchableOpacity onPress={() => setSearchQuery('')}>
                                <Text style={styles.clearSearchText}>Clear search</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.searchResultsList}>
                            {filteredSearchResults.length > 0 ? (
                                filteredSearchResults.map((user) => (
                                    <TouchableOpacity
                                        key={user.id}
                                        style={styles.searchResultItem}
                                        onPress={() => {
                                            Keyboard.dismiss();
                                            navigation.navigate('EditUser', { userId: user.id, user });
                                        }}
                                    >
                                        <View style={styles.searchResultAvatar}>
                                            <LinearGradient
                                                colors={['#4F46E5', '#7C3AED']}
                                                style={styles.searchAvatarGradient}
                                            >
                                                <Text style={styles.searchAvatarText}>
                                                    {user.name.charAt(0).toUpperCase()}
                                                </Text>
                                            </LinearGradient>
                                        </View>
                                        <View style={styles.searchResultInfo}>
                                            <Text style={styles.searchResultName}>{user.name}</Text>
                                            <Text style={styles.searchResultEmail}>{user.email}</Text>
                                            {user.phone ? (
                                                <Text style={styles.searchResultPhone}>{user.phone}</Text>
                                            ) : null}
                                        </View>
                                        <MaterialCommunityIcons name="chevron-right" size={24} color="#D1D5DB" />
                                    </TouchableOpacity>
                                ))
                            ) : (
                                <View style={styles.noResultsFound}>
                                    <MaterialCommunityIcons name="account-search-outline" size={64} color="#D1D5DB" />
                                    <Text style={styles.noResultsText}>No users found for "{searchQuery}"</Text>
                                </View>
                            )}
                        </View>
                    </View>
                ) : (
                    <>
                        <View style={styles.premiumStatsGrid}>
                            <StatCard
                                title="CORE USERS"
                                value={stats.totalUsers}
                                icon="account-multiple"
                                color="#4F46E5"
                            />
                            <StatCard
                                title="ONLINE NOW"
                                value={stats.activeNow}
                                isLive={true}
                                icon="pulse"
                                color="#10B981"
                            />
                        </View>

                        {/* Recent Activity */}
                        <View style={styles.activitySection}>
                            <View style={styles.activityHeader}>
                                <Text style={styles.sectionTitle}>Recent Activity</Text>
                                <TouchableOpacity onPress={() => navigation.navigate('UserManagement')}>
                                    <Text style={styles.viewAllText}>View all</Text>
                                </TouchableOpacity>
                            </View>

                            <View style={styles.activityList}>
                                {recentActivity.map((item) => (
                                    <ActivityItem key={item.id} item={item} />
                                ))}
                            </View>
                        </View>
                    </>
                )}
            </ScrollView>

            {/* Premium Floating Bottom Navigation */}
            <View style={styles.premiumBottomNavWrapper}>
                <View style={styles.premiumNavInner}>
                    <TouchableOpacity
                        style={styles.premiumNavItem}
                        onPress={() => navigation.navigate('AdminOverview')}
                    >
                        <MaterialCommunityIcons name="view-dashboard" size={24} color="#4F46E5" />
                        <Text style={[styles.premiumNavText, styles.premiumNavTextActive]}>Home</Text>
                        <View style={styles.activePill} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.premiumNavItem}
                        onPress={() => navigation.navigate('UserManagement')}
                    >
                        <MaterialCommunityIcons name="account-group" size={24} color="#94A3B8" />
                        <Text style={styles.premiumNavText}>Users</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.premiumAddButtonWrapper}
                        onPress={() => navigation.navigate('AddUser')}
                    >
                        <LinearGradient
                            colors={['#4F46E5', '#7C3AED']}
                            style={styles.premiumAddButtonGradient}
                        >
                            <MaterialCommunityIcons name="plus" size={32} color="#fff" />
                        </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.premiumNavItem}
                        onPress={loadTrustedContacts}
                    >
                        <MaterialCommunityIcons name="shield-account" size={24} color="#94A3B8" />
                        <Text style={styles.premiumNavText}>Contacts</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.premiumNavItem}
                        onPress={() => setShowAlertModal(true)}
                    >
                        <MaterialCommunityIcons name="bell-badge" size={24} color="#94A3B8" />
                        <Text style={styles.premiumNavText}>Alerts</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Send Alert Modal */}
            <Modal
                visible={showAlertModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => {
                    setShowAlertModal(false);
                    setShowUserDropdown(false);
                }}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.premiumAlertModal}>
                        <LinearGradient
                            colors={['#EF4444', '#991B1B']}
                            style={styles.modalPremiumHeader}
                        >
                            <View style={styles.modalHeaderTopRow}>
                                <View style={styles.modalHeaderTitleGroup}>
                                    <Text style={styles.modalHeaderTitleMain}>Safety Dispatch</Text>
                                    <Text style={styles.modalHeaderTitleSub}>Push urgent notifications to users</Text>
                                </View>
                                <TouchableOpacity
                                    style={styles.modalHeaderCloseCircle}
                                    onPress={() => {
                                        setShowAlertModal(false);
                                        setShowUserDropdown(false);
                                    }}
                                >
                                    <MaterialCommunityIcons name="close" size={20} color="#fff" />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.alertTypeIndicator}>
                                <MaterialCommunityIcons name="broadcast" size={16} color="rgba(255,255,255,0.8)" />
                                <Text style={styles.alertTypeText}>System Priority Alert</Text>
                            </View>
                        </LinearGradient>

                        <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                            <View style={styles.alertContentContainer}>
                                <Text style={styles.premiumInputLabel}>RECIPIENT USER</Text>
                                <TouchableOpacity
                                    style={styles.premiumDropdownSelector}
                                    onPress={() => setShowUserDropdown(!showUserDropdown)}
                                >
                                    <View style={styles.selectorLeftContent}>
                                        <MaterialCommunityIcons
                                            name="account-search"
                                            size={20}
                                            color={selectedUser ? "#EF4444" : "#94A3B8"}
                                        />
                                        <Text style={[styles.premiumSelectorText, !selectedUser && { color: '#94A3B8' }]}>
                                            {selectedUser ? selectedUser.name : 'Choose a target user...'}
                                        </Text>
                                    </View>
                                    <MaterialCommunityIcons
                                        name={showUserDropdown ? "chevron-up" : "chevron-down"}
                                        size={24}
                                        color="#94A3B8"
                                    />
                                </TouchableOpacity>

                                {showUserDropdown && (
                                    <View style={styles.premiumDropdownListContainer}>
                                        <ScrollView style={styles.premiumDropdownList} nestedScrollEnabled={true}>
                                            {allUsers.filter(u => u.role !== 'admin').map((user) => (
                                                <TouchableOpacity
                                                    key={user.id}
                                                    style={styles.premiumDropdownListItem}
                                                    onPress={() => {
                                                        setSelectedUser(user);
                                                        setShowUserDropdown(false);
                                                    }}
                                                >
                                                    <View style={styles.dropdownItemAvatar}>
                                                        <Text style={styles.dropdownAvatarText}>{user.name.charAt(0)}</Text>
                                                    </View>
                                                    <View style={styles.dropdownItemInfo}>
                                                        <Text style={styles.dropdownItemName}>{user.name}</Text>
                                                        <Text style={styles.dropdownItemEmail}>{user.email}</Text>
                                                    </View>
                                                    {selectedUser?.id === user.id && (
                                                        <MaterialCommunityIcons name="check-circle" size={20} color="#EF4444" />
                                                    )}
                                                </TouchableOpacity>
                                            ))}
                                        </ScrollView>
                                    </View>
                                )}

                                <Text style={[styles.premiumInputLabel, { marginTop: 24 }]}>ANNOUNCEMENT MESSAGE</Text>
                                <View style={styles.premiumTextInputWrapper}>
                                    <TextInput
                                        style={styles.premiumAlertTextInput}
                                        placeholder="Enter safety instructions or system alerts..."
                                        placeholderTextColor="#94A3B8"
                                        multiline
                                        numberOfLines={6}
                                        value={alertMessage}
                                        onChangeText={setAlertMessage}
                                        textAlignVertical="top"
                                    />
                                </View>

                                <View style={styles.alertGuideline}>
                                    <MaterialCommunityIcons name="information-outline" size={16} color="#64748B" />
                                    <Text style={styles.guidelineText}>This message will be sent via SMS and In-App notification.</Text>
                                </View>
                            </View>
                        </ScrollView>

                        <View style={styles.modalPremiumFooter}>
                            <TouchableOpacity
                                style={[styles.dispatchButton, (!selectedUser || !alertMessage.trim() || sendingAlert) && styles.disabledDispatchButton]}
                                disabled={!selectedUser || !alertMessage.trim() || sendingAlert}
                                onPress={handleSendAlert}
                            >
                                <LinearGradient
                                    colors={(!selectedUser || !alertMessage.trim() || sendingAlert) ? ['#CBD5E1', '#94A3B8'] : ['#EF4444', '#DC2626']}
                                    style={styles.dispatchGradient}
                                >
                                    {sendingAlert ? (
                                        <ActivityIndicator color="#fff" size="small" />
                                    ) : (
                                        <>
                                            <MaterialCommunityIcons name="send" size={20} color="#fff" />
                                            <Text style={styles.dispatchButtonText}>DISPATCH SYSTEM ALERT</Text>
                                        </>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>


            {/* Trusted Contacts Modal */}
            <Modal
                visible={showContactsModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowContactsModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.premiumContactsModal}>
                        <LinearGradient
                            colors={['#4F46E5', '#7C3AED']}
                            style={styles.modalPremiumHeader}
                        >
                            <View style={styles.modalHeaderTopRow}>
                                <View style={styles.modalHeaderTitleGroup}>
                                    <Text style={styles.modalHeaderTitleMain}>Trusted Networks</Text>
                                    <Text style={styles.modalHeaderTitleSub}>Monitoring user connections</Text>
                                </View>
                                <TouchableOpacity
                                    style={styles.modalHeaderCloseCircle}
                                    onPress={() => setShowContactsModal(false)}
                                >
                                    <MaterialCommunityIcons name="close" size={20} color="#fff" />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.modalSearchWrapper}>
                                <MaterialCommunityIcons name="magnify" size={20} color="rgba(255,255,255,0.7)" />
                                <TextInput
                                    style={styles.modalSearchInputPremium}
                                    placeholder="Search users..."
                                    placeholderTextColor="rgba(255,255,255,0.6)"
                                    value={contactsSearchQuery}
                                    onChangeText={setContactsSearchQuery}
                                />
                                {contactsSearchQuery !== '' && (
                                    <TouchableOpacity onPress={() => setContactsSearchQuery('')}>
                                        <MaterialCommunityIcons name="close-circle" size={18} color="#fff" />
                                    </TouchableOpacity>
                                )}
                            </View>
                        </LinearGradient>

                        {fetchingContacts ? (
                            <View style={styles.modalLoading}>
                                <ActivityIndicator size="large" color="#4F46E5" />
                                <Text style={styles.loadingText}>Synchronizing contacts...</Text>
                            </View>
                        ) : (
                            <ScrollView
                                style={styles.modalBody}
                                showsVerticalScrollIndicator={false}
                                contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
                            >
                                {usersWithContacts.filter(u =>
                                    u.name.toLowerCase().includes(contactsSearchQuery.toLowerCase())
                                ).length > 0 ? (
                                    usersWithContacts
                                        .filter(u => u.name.toLowerCase().includes(contactsSearchQuery.toLowerCase()))
                                        .map((userData, index) => (
                                            <View key={userData.id || index} style={styles.userContactsSectionPremium}>
                                                <View style={styles.userSectionHeaderPremium}>
                                                    <LinearGradient
                                                        colors={['#EEF2FF', '#E0E7FF']}
                                                        style={styles.userMiniAvatarPremium}
                                                    >
                                                        <Text style={styles.userMiniAvatarTextPremium}>
                                                            {userData.name.charAt(0).toUpperCase()}
                                                        </Text>
                                                    </LinearGradient>
                                                    <View style={styles.userSectionTitleInfo}>
                                                        <Text style={styles.userSectionNamePremium}>{userData.name}</Text>
                                                        <Text style={styles.userContactCount}>{userData.contacts?.length || 0} Contacts</Text>
                                                    </View>
                                                </View>

                                                <View style={styles.contactsListPremium}>
                                                    {userData.contacts && userData.contacts.length > 0 ? (
                                                        userData.contacts.map((contact, cIndex) => (
                                                            <View key={contact.id || cIndex} style={styles.contactCardPremium}>
                                                                <View style={styles.contactCardIconBox}>
                                                                    <MaterialCommunityIcons name="account-outline" size={22} color="#4F46E5" />
                                                                </View>
                                                                <View style={styles.contactCardInfoPremium}>
                                                                    <Text style={styles.contactCardNamePremium}>{contact.name}</Text>
                                                                    <Text style={styles.contactCardPhonePremium}>{contact.phone}</Text>
                                                                    <View style={styles.contactRelationBadge}>
                                                                        <Text style={styles.contactRelationText}>{contact.relationship || 'Emergency'}</Text>
                                                                    </View>
                                                                </View>
                                                                <TouchableOpacity
                                                                    style={styles.contactCallAction}
                                                                    onPress={() => handleMakeCall(contact.phone)}
                                                                >
                                                                    <MaterialCommunityIcons name="phone" size={18} color="#10B981" />
                                                                </TouchableOpacity>
                                                            </View>
                                                        ))
                                                    ) : (
                                                        <View style={styles.noContactsPlaceholder}>
                                                            <MaterialCommunityIcons name="account-off-outline" size={24} color="#D1D5DB" />
                                                            <Text style={styles.noContactsTextPremium}>No trusted contacts found for this user.</Text>
                                                        </View>
                                                    )}
                                                </View>
                                            </View>
                                        ))
                                ) : (
                                    <View style={styles.emptyStateContainer}>
                                        <MaterialCommunityIcons name="account-search-outline" size={80} color="#F3F4F6" />
                                        <Text style={styles.emptyStateTextMain}>No Matching Users</Text>
                                        <Text style={styles.emptyStateTextSub}>Try checking for a different name or spelling.</Text>
                                    </View>
                                )}
                            </ScrollView>
                        )}

                        <View style={styles.modalPremiumFooter}>
                            <TouchableOpacity
                                style={styles.modalDoneButton}
                                onPress={() => setShowContactsModal(false)}
                            >
                                <LinearGradient
                                    colors={['#4F46E5', '#3730A3']}
                                    style={styles.modalDoneGradient}
                                >
                                    <Text style={styles.modalDoneText}>DISMISS</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
            <Modal
                visible={showNewUsersModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowNewUsersModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.premiumNotificationModal}>
                        <LinearGradient
                            colors={['#4F46E5', '#3730A3']}
                            style={styles.notificationModalHeader}
                        >
                            <View style={styles.modalHeaderTopRow}>
                                <View style={styles.modalHeaderTitleGroup}>
                                    <Text style={styles.modalHeaderTitleMain}>System Logs</Text>
                                    <Text style={styles.modalHeaderTitleSub}>Recent user registrations (24h)</Text>
                                </View>
                                <TouchableOpacity
                                    style={styles.modalHeaderCloseCircle}
                                    onPress={() => setShowNewUsersModal(false)}
                                >
                                    <MaterialCommunityIcons name="close" size={18} color="#fff" />
                                </TouchableOpacity>
                            </View>
                        </LinearGradient>

                        <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                            {newUsersList.length > 0 ? (
                                <View style={{ gap: 4 }}>
                                    {newUsersList.map((user, index) => (
                                        <View key={user.id || index} style={styles.notificationCard}>
                                            <View style={styles.notificationCardAvatar}>
                                                <Text style={styles.notificationCardAvatarText}>
                                                    {user.name.charAt(0).toUpperCase()}
                                                </Text>
                                            </View>
                                            <View style={styles.notificationCardBody}>
                                                <Text style={styles.notificationCardName}>{user.name}</Text>
                                                <Text style={styles.notificationCardEmail}>{user.email}</Text>
                                                <View style={styles.notificationCardTimeBox}>
                                                    <MaterialCommunityIcons name="clock-outline" size={12} color="#94A3B8" />
                                                    <Text style={styles.notificationCardTime}>
                                                        {user.createdAt ? getTimeAgo(user.createdAt) : 'Registered recently'}
                                                    </Text>
                                                </View>
                                            </View>
                                            <MaterialCommunityIcons name="check-decagram" size={20} color="#10B981" />
                                        </View>
                                    ))}
                                </View>
                            ) : (
                                <View style={styles.noSignupsContainer}>
                                    <View style={styles.noSignupsIconBox}>
                                        <MaterialCommunityIcons name="account-search" size={48} color="#CBD5E1" />
                                    </View>
                                    <Text style={styles.noSignupsTextMain}>No New Signups</Text>
                                    <Text style={styles.noSignupsTextSub}>The system hasn't recorded any new user accounts in the past 24 hours.</Text>
                                </View>
                            )}
                        </ScrollView>

                        <View style={styles.modalPremiumFooter}>
                            <TouchableOpacity
                                style={styles.modalDoneButton}
                                onPress={() => setShowNewUsersModal(false)}
                            >
                                <LinearGradient
                                    colors={['#4F46E5', '#3730A3']}
                                    style={styles.modalDoneGradient}
                                >
                                    <Text style={styles.modalDoneText}>DISMISS</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Admin Profile Modal */}
            <Modal
                visible={showAdminProfileModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowAdminProfileModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.premiumProfileModal}>
                        {/* Header Image/Pattern Area */}
                        <LinearGradient
                            colors={['#4F46E5', '#7C3AED']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.profileModalHeader}
                        >
                            <TouchableOpacity
                                style={styles.modalHeaderClose}
                                onPress={() => setShowAdminProfileModal(false)}
                            >
                                <MaterialCommunityIcons name="close" size={22} color="#fff" />
                            </TouchableOpacity>
                            <View style={styles.centralAvatarContainer}>
                                <View style={styles.largeCentralAvatar}>
                                    <Text style={styles.largeAvatarText}>
                                        {adminUser?.displayName?.charAt(0).toUpperCase() || 'A'}
                                    </Text>
                                </View>
                                <View style={styles.onlineBadge} />
                            </View>
                        </LinearGradient>

                        <View style={styles.profileInfoBody}>
                            <View style={styles.adminTitleArea}>
                                <Text style={styles.adminPremiumName}>{adminUser?.displayName || 'Administrator'}</Text>
                                <View style={styles.premiumRoleTag}>
                                    <MaterialCommunityIcons name="shield-crown" size={14} color="#4F46E5" />
                                    <Text style={styles.premiumRoleText}>SYSTEM ADMINISTRATOR</Text>
                                </View>
                            </View>

                            <ScrollView showsVerticalScrollIndicator={false} style={styles.profileDetailsList}>
                                <View style={styles.detailTile}>
                                    <View style={[styles.detailIconBox, { backgroundColor: '#EEF2FF' }]}>
                                        <MaterialCommunityIcons name="email-outline" size={20} color="#4F46E5" />
                                    </View>
                                    <View style={styles.detailTextContent}>
                                        <Text style={styles.detailLabel}>Email Address</Text>
                                        <Text style={styles.detailValue}>{adminUser?.email || 'admin@safewalk.lk'}</Text>
                                    </View>
                                </View>

                                <View style={styles.detailTile}>
                                    <View style={[styles.detailIconBox, { backgroundColor: '#F0FDF4' }]}>
                                        <MaterialCommunityIcons name="identifier" size={20} color="#10B981" />
                                    </View>
                                    <View style={styles.detailTextContent}>
                                        <Text style={styles.detailLabel}>Admin Identifier</Text>
                                        <Text style={styles.detailValue}>ID-{adminUser?.uid?.substring(0, 8).toUpperCase()}</Text>
                                    </View>
                                </View>

                                <View style={styles.detailTile}>
                                    <View style={[styles.detailIconBox, { backgroundColor: '#FFF7ED' }]}>
                                        <MaterialCommunityIcons name="clock-check-outline" size={20} color="#F97316" />
                                    </View>
                                    <View style={styles.detailTextContent}>
                                        <Text style={styles.detailLabel}>Session Started</Text>
                                        <Text style={styles.detailValue}>Active since {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                                    </View>
                                </View>
                            </ScrollView>

                            <View style={styles.profileActionFooter}>
                                <TouchableOpacity
                                    style={styles.premiumSignOutButton}
                                    onPress={async () => {
                                        setShowAdminProfileModal(false);
                                        const result = await logout();
                                        if (result.success) {
                                            navigation.reset({
                                                index: 0,
                                                routes: [{ name: 'SignIn' }],
                                            });
                                        }
                                    }}
                                >
                                    <LinearGradient
                                        colors={['#EF4444', '#B91C1C']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={styles.signOutGradientFull}
                                    >
                                        <MaterialCommunityIcons name="logout-variant" size={20} color="#fff" />
                                        <Text style={styles.signOutTextPremium}>SIGN OUT</Text>
                                    </LinearGradient>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.minimalBackButton}
                                    onPress={() => setShowAdminProfileModal(false)}
                                >
                                    <Text style={styles.minimalBackText}>Return to Dashboard</Text>
                                </TouchableOpacity>
                            </View>
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
        backgroundColor: '#F8FAFC',
    },
    premiumHeaderContainer: {
        width: '100%',
    },
    premiumHeaderGradient: {
        paddingTop: Platform.OS === 'ios' ? 50 : 30,
        paddingBottom: 24,
        borderBottomLeftRadius: 35,
        borderBottomRightRadius: 35,
    },
    headerSafeLayer: {
        paddingHorizontal: 24,
    },
    headerTopNavigation: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    greetingSection: {
        flex: 1,
    },
    greetingPrefix: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.7)',
        fontWeight: '500',
    },
    adminDisplayName: {
        fontSize: 22,
        fontWeight: '800',
        color: '#fff',
        letterSpacing: -0.5,
    },
    headerActionsBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    premiumHeaderIcon: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    premiumBadge: {
        position: 'absolute',
        top: 12,
        right: 12,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#F43F5E',
        borderWidth: 1.5,
        borderColor: '#4F46E5',
    },
    premiumAvatarBox: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: '#fff',
        padding: 2,
    },
    avatarInnerGradient: {
        flex: 1,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    immersiveSearchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: 18,
        paddingHorizontal: 16,
        height: 52,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    immersiveSearchInput: {
        flex: 1,
        marginLeft: 12,
        fontSize: 16,
        color: '#fff',
        fontWeight: '500',
    },
    content: {
        flex: 1,
    },
    premiumStatsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        padding: 24,
        justifyContent: 'space-between',
        gap: 12,
    },
    statCard: {
        backgroundColor: '#fff',
        width: (width - 60) / 2,
        padding: 16,
        borderRadius: 24,
        flexDirection: 'row',
        justifyContent: 'space-between',
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 3,
        marginBottom: 4,
    },
    statCardLeft: {
        flex: 1,
    },
    statIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    statTitle: {
        fontSize: 11,
        fontWeight: '800',
        color: '#1E293B',
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    statValue: {
        fontSize: 22,
        fontWeight: '800',
        color: '#1E293B',
    },
    statCardRight: {
        alignItems: 'flex-end',
    },
    liveIndicatorPremium: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#10B98115',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        gap: 4,
    },
    liveDotPremium: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#10B981',
    },
    liveTextPremium: {
        fontSize: 10,
        fontWeight: '800',
        color: '#10B981',
    },
    changeIndicatorPremium: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        gap: 2,
    },
    changeTextPremium: {
        fontSize: 11,
        fontWeight: '700',
    },
    activitySection: {
        paddingHorizontal: 24,
        paddingBottom: 100,
    },
    activityHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#1E293B',
    },
    viewAllText: {
        fontSize: 14,
        color: '#4F46E5',
        fontWeight: '700',
    },
    activityList: {
        gap: 12,
    },
    premiumActivityItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 20,
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 1,
    },
    activityIconCircle: {
        width: 44,
        height: 44,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    activityMainContent: {
        flex: 1,
    },
    activityMeta: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 2,
    },
    activityUserPremium: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1E293B',
    },
    activityTimePremium: {
        fontSize: 11,
        color: '#1E293B',
        fontWeight: '500',
    },
    activityActionPremium: {
        fontSize: 13,
        color: '#1E293B',
        marginBottom: 2,
    },
    activityEmailPremium: {
        fontSize: 11,
        color: '#1E293B',
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
        color: '#111827',
    },
    activityEmail: {
        fontSize: 11,
        color: '#111827',
        marginTop: 2,
    },
    activityTime: {
        alignItems: 'flex-end',
    },
    activityTimeText: {
        fontSize: 12,
        color: '#111827',
        marginBottom: 4,
    },
    activityDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#3B82F6',
    },
    premiumBottomNavWrapper: {
        position: 'absolute',
        bottom: 20,
        left: 20,
        right: 20,
        backgroundColor: 'transparent',
    },
    premiumNavInner: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderRadius: 24,
        height: 70,
        alignItems: 'center',
        justifyContent: 'space-around',
        paddingHorizontal: 10,
        shadowColor: '#1E293B',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
    },
    premiumNavItem: {
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
    },
    premiumNavText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#1E293B',
        marginTop: 4,
    },
    premiumNavTextActive: {
        color: '#4F46E5',
    },
    activePill: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#4F46E5',
        marginTop: 2,
    },
    premiumAddButtonWrapper: {
        marginTop: -35,
        shadowColor: '#4F46E5',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 12,
    },
    premiumAddButtonGradient: {
        width: 64,
        height: 64,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
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
        flex: 1,
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
        color: '#111827',
        marginBottom: 2,
    },
    modalUserTime: {
        fontSize: 11,
        color: '#111827',
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
    // Send Alert Modal Styles
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 8,
    },
    dropdownSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderBottomWidth: 1.5,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        padding: 12,
        marginBottom: 4,
    },
    dropdownSelectorText: {
        fontSize: 15,
        color: '#111827',
    },
    dropdownListContainer: {
        maxHeight: 200,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        overflow: 'hidden',
        marginTop: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 3,
    },
    dropdownList: {
        maxHeight: 200,
    },
    dropdownListItem: {
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    dropdownListItemText: {
        fontSize: 15,
        fontWeight: '500',
        color: '#111827',
    },
    dropdownListItemEmail: {
        fontSize: 12,
        color: '#6B7280',
    },
    alertTextInput: {
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderBottomWidth: 1.5,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        padding: 12,
        fontSize: 15,
        color: '#111827',
        minHeight: 120,
    },
    sendAlertButton: {
        marginTop: 24,
        marginBottom: 10,
        borderRadius: 12,
        overflow: 'hidden',
        shadowColor: '#EF4444',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    sendAlertGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
    },
    sendAlertButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    disabledButton: {
        opacity: 0.5,
    },
    // Trusted Contacts Styles
    modalLoading: {
        padding: 40,
        alignItems: 'center',
    },
    loadingText: {
        fontSize: 15,
        color: '#6B7280',
    },
    userContactsSection: {
        marginBottom: 20,
        backgroundColor: '#F9FAFB',
        borderRadius: 16,
        padding: 12,
    },
    userSectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
        paddingBottom: 8,
    },
    userMiniAvatar: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#4F46E5',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8,
    },
    userMiniAvatarText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '700',
    },
    userSectionName: {
        fontSize: 15,
        fontWeight: '700',
        color: '#111827',
    },
    contactsList: {
        gap: 8,
    },
    contactCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#fff',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    contactCardInfo: {
        flex: 1,
    },
    contactCardName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
    },
    contactCardPhone: {
        fontSize: 12,
        color: '#6B7280',
    },
    contactCardRelation: {
        fontSize: 11,
        color: '#4F46E5',
        fontWeight: '500',
        textTransform: 'uppercase',
    },
    noContactsText: {
        fontSize: 13,
        color: '#9CA3AF',
        fontStyle: 'italic',
        textAlign: 'center',
        paddingVertical: 4,
    },
    modalSearchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
        paddingHorizontal: 12,
        marginHorizontal: 20,
        marginBottom: 16,
        marginTop: 4,
        height: 44,
    },
    modalSearchIcon: {
        marginRight: 8,
    },
    modalSearchInput: {
        flex: 1,
        fontSize: 15,
        color: '#111827',
        paddingVertical: 8,
    },
    // Premium Contacts Modal Styles
    premiumContactsModal: {
        backgroundColor: '#fff',
        borderRadius: 30,
        height: '85%',
        width: '100%',
        maxWidth: 400,
        alignSelf: 'center',
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
        elevation: 10,
    },
    modalPremiumHeader: {
        padding: 24,
        paddingTop: 30,
    },
    modalHeaderTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalHeaderTitleGroup: {
        flex: 1,
    },
    modalHeaderTitleMain: {
        fontSize: 22,
        fontWeight: '800',
        color: '#fff',
    },
    modalHeaderTitleSub: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.7)',
        fontWeight: '500',
    },
    modalHeaderCloseCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalSearchWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: 14,
        paddingHorizontal: 16,
        height: 48,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    modalSearchInputPremium: {
        flex: 1,
        marginLeft: 12,
        fontSize: 15,
        color: '#fff',
    },
    userContactsSectionPremium: {
        marginBottom: 24,
    },
    userSectionHeaderPremium: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    userMiniAvatarPremium: {
        width: 44,
        height: 44,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    userMiniAvatarTextPremium: {
        fontSize: 18,
        fontWeight: '800',
        color: '#4F46E5',
    },
    userSectionTitleInfo: {
        flex: 1,
    },
    userSectionNamePremium: {
        fontSize: 17,
        fontWeight: '700',
        color: '#111827',
    },
    userContactCount: {
        fontSize: 12,
        color: '#6B7280',
        fontWeight: '500',
    },
    contactsListPremium: {
        gap: 12,
    },
    contactCardPremium: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 18,
        padding: 16,
        borderWidth: 1,
        borderColor: '#F3F4F6',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 1,
    },
    contactCardIconBox: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#F5F7FF',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    contactCardInfoPremium: {
        flex: 1,
    },
    contactCardNamePremium: {
        fontSize: 15,
        fontWeight: '700',
        color: '#334155',
    },
    contactCardPhonePremium: {
        fontSize: 13,
        color: '#64748B',
        marginTop: 1,
    },
    contactRelationBadge: {
        alignSelf: 'flex-start',
        backgroundColor: '#EEF2FF',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
        marginTop: 4,
    },
    contactRelationText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#4F46E5',
        textTransform: 'uppercase',
    },
    contactCallAction: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#F0FDF4',
        alignItems: 'center',
        justifyContent: 'center',
    },
    noContactsPlaceholder: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        padding: 16,
        borderRadius: 16,
        gap: 12,
    },
    noContactsTextPremium: {
        fontSize: 13,
        color: '#94A3B8',
        fontWeight: '500',
    },
    emptyStateContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    emptyStateTextMain: {
        fontSize: 18,
        fontWeight: '800',
        color: '#CBD5E1',
        marginTop: 16,
    },
    emptyStateTextSub: {
        fontSize: 13,
        color: '#94A3B8',
        textAlign: 'center',
        marginTop: 4,
    },
    modalPremiumFooter: {
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
    },
    modalDoneButton: {
        borderRadius: 16,
        overflow: 'hidden',
    },
    modalDoneGradient: {
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalDoneText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '800',
        letterSpacing: 1,
    },
    adminProfileModalContent: {
        backgroundColor: '#fff',
        width: '90%',
        maxHeight: '80%',
        borderRadius: 24,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 5,
    },
    premiumAlertModal: {
        backgroundColor: '#fff',
        borderRadius: 30,
        height: '85%',
        width: '100%',
        maxWidth: 400,
        alignSelf: 'center',
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
        elevation: 10,
    },
    alertTypeIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        alignSelf: 'flex-start',
        gap: 6,
    },
    alertTypeText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    alertContentContainer: {
        paddingTop: 8,
    },
    premiumInputLabel: {
        fontSize: 12,
        fontWeight: '800',
        color: '#94A3B8',
        letterSpacing: 1,
        marginBottom: 10,
    },
    premiumDropdownSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#F8FAFC',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    selectorLeftContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    premiumSelectorText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1E293B',
    },
    premiumDropdownListContainer: {
        backgroundColor: '#fff',
        borderRadius: 16,
        marginTop: 8,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        maxHeight: 250,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
    },
    premiumDropdownList: {
        padding: 8,
    },
    premiumDropdownListItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        gap: 12,
    },
    dropdownItemAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#F1F5F9',
        alignItems: 'center',
        justifyContent: 'center',
    },
    dropdownAvatarText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#64748B',
    },
    dropdownItemInfo: {
        flex: 1,
    },
    dropdownItemName: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1E293B',
    },
    dropdownItemEmail: {
        fontSize: 12,
        color: '#64748B',
    },
    premiumTextInputWrapper: {
        backgroundColor: '#F8FAFC',
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    premiumAlertTextInput: {
        fontSize: 15,
        color: '#1E293B',
        minHeight: 120,
        lineHeight: 22,
    },
    alertGuideline: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 16,
        backgroundColor: '#F1F5F9',
        padding: 12,
        borderRadius: 12,
    },
    guidelineText: {
        fontSize: 12,
        color: '#64748B',
        fontWeight: '500',
        flex: 1,
    },
    dispatchButton: {
        borderRadius: 16,
        overflow: 'hidden',
    },
    dispatchGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 18,
        gap: 10,
    },
    dispatchButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '800',
        letterSpacing: 1,
    },
    disabledDispatchButton: {
        opacity: 0.7,
    },
    premiumProfileModal: {
        backgroundColor: '#fff',
        width: '85%',
        borderRadius: 30,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.2,
        shadowRadius: 30,
        elevation: 15,
    },
    profileModalHeader: {
        paddingTop: 40,
        paddingBottom: 20,
        alignItems: 'center',
        position: 'relative',
    },
    modalHeaderClose: {
        position: 'absolute',
        top: 15,
        right: 15,
        padding: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 20,
    },
    centralAvatarContainer: {
        position: 'relative',
    },
    largeCentralAvatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 4,
        borderColor: 'rgba(255, 255, 255, 0.5)',
    },
    largeAvatarText: {
        fontSize: 40,
        fontWeight: '800',
        color: '#fff',
    },
    onlineBadge: {
        position: 'absolute',
        bottom: 5,
        right: 5,
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: '#10B981',
        borderWidth: 3,
        borderColor: '#4F46E5',
    },
    profileInfoBody: {
        padding: 24,
        alignItems: 'center',
    },
    adminTitleArea: {
        alignItems: 'center',
        marginBottom: 24,
    },
    adminPremiumName: {
        fontSize: 22,
        fontWeight: '800',
        color: '#111827',
        marginBottom: 6,
    },
    premiumRoleTag: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#EEF2FF',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 6,
    },
    premiumRoleText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#4F46E5',
        letterSpacing: 1,
    },
    profileDetailsList: {
        width: '100%',
        marginBottom: 20,
    },
    detailTile: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        backgroundColor: '#F9FAFB',
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    detailIconBox: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    detailTextContent: {
        flex: 1,
    },
    detailLabel: {
        fontSize: 11,
        color: '#94A3B8',
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    detailValue: {
        fontSize: 14,
        fontWeight: '700',
        color: '#334155',
        marginTop: 1,
    },
    profileActionFooter: {
        width: '100%',
        gap: 12,
    },
    premiumSignOutButton: {
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#EF4444',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 6,
    },
    signOutGradientFull: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        gap: 10,
    },
    signOutTextPremium: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '800',
        letterSpacing: 1,
    },
    minimalBackButton: {
        paddingVertical: 12,
        alignItems: 'center',
    },
    minimalBackText: {
        fontSize: 14,
        color: '#94A3B8',
        fontWeight: '600',
    },
    adminProfileBody: {
        padding: 24,
    },
    adminProfileCard: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 32,
        backgroundColor: '#F9FAFB',
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    adminAvatarGradient: {
        width: 64,
        height: 64,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    adminAvatarText: {
        color: '#fff',
        fontSize: 24,
        fontWeight: '800',
    },
    adminDetails: {
        flex: 1,
    },
    adminName: {
        fontSize: 18,
        fontWeight: '800',
        color: '#111827',
        marginBottom: 2,
    },
    adminEmail: {
        fontSize: 14,
        color: '#6B7280',
        marginBottom: 8,
    },
    adminRoleBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#EEF2FF',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        alignSelf: 'flex-start',
        gap: 4,
    },
    adminRoleText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#4F46E5',
        textTransform: 'uppercase',
    },
    infoSection: {
        marginBottom: 32,
        gap: 20,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    infoContent: {
        flex: 1,
    },
    infoLabel: {
        fontSize: 12,
        color: '#9CA3AF',
        fontWeight: '600',
        marginBottom: 2,
    },
    infoValue: {
        fontSize: 14,
        color: '#111827',
        fontWeight: '600',
    },
    actionSection: {
        gap: 12,
    },
    backToDashboardButton: {
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F3F4F6',
        borderRadius: 14,
    },
    backButtonText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#374151',
    },
    signOutButton: {
        borderRadius: 14,
        overflow: 'hidden',
    },
    signOutGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        gap: 8,
    },
    signOutText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '800',
    },
    searchResultsSection: {
        padding: 20,
    },
    searchSectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    clearSearchText: {
        fontSize: 14,
        color: '#4F46E5',
        fontWeight: '600',
    },
    searchResultsList: {
        gap: 12,
    },
    searchResultItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    searchResultAvatar: {
        marginRight: 16,
    },
    searchAvatarGradient: {
        width: 50,
        height: 50,
        borderRadius: 25,
        alignItems: 'center',
        justifyContent: 'center',
    },
    searchAvatarText: {
        color: '#fff',
        fontSize: 20,
        fontWeight: '800',
    },
    searchResultInfo: {
        flex: 1,
    },
    searchResultName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 2,
    },
    searchResultEmail: {
        fontSize: 13,
        color: '#111827',
        marginBottom: 2,
    },
    searchResultPhone: {
        fontSize: 12,
        color: '#9CA3AF',
        fontWeight: '500',
    },
    noResultsFound: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    noResultsText: {
        fontSize: 16,
        color: '#9CA3AF',
        marginTop: 16,
        textAlign: 'center',
    },
    // Notification Modal Specific Styles
    premiumNotificationModal: {
        backgroundColor: '#fff',
        borderRadius: 30,
        width: '100%',
        height: '85%',
        overflow: 'hidden',
        shadowColor: '#4F46E5',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
        elevation: 10,
    },
    notificationModalHeader: {
        paddingTop: 24,
        paddingBottom: 24,
        paddingHorizontal: 24,
    },
    notificationCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        padding: 18,
        borderRadius: 22,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    notificationCardAvatar: {
        width: 48,
        height: 48,
        borderRadius: 16,
        backgroundColor: '#EEF2FF',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
        borderWidth: 1,
        borderColor: '#C7D2FE',
    },
    notificationCardAvatarText: {
        fontSize: 18,
        fontWeight: '800',
        color: '#4F46E5',
    },
    notificationCardBody: {
        flex: 1,
    },
    notificationCardName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1E293B',
        marginBottom: 2,
    },
    notificationCardEmail: {
        fontSize: 13,
        color: '#1E293B',
        marginBottom: 4,
    },
    notificationCardTimeBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    notificationCardTime: {
        fontSize: 11,
        fontWeight: '600',
        color: '#1E293B',
    },
    noSignupsContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 100,
    },
    noSignupsIconBox: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#F8FAFC',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    noSignupsTextMain: {
        fontSize: 18,
        fontWeight: '800',
        color: '#1E293B',
        marginBottom: 8,
    },
    noSignupsTextSub: {
        fontSize: 14,
        color: '#1E293B',
        textAlign: 'center',
    },
});
