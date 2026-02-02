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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';

const { width } = Dimensions.get('window');

export default function EditUser({ navigation, route }) {
    const { userId, user } = route.params;

    const [formData, setFormData] = useState({
        fullName: user?.name || '',
        email: user?.email || '',
        phone: user?.phone || '',
        status: user?.status === 'active' || user?.isActive === true,
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

        setLoading(true);
        try {
            const updateData = {
                username: formData.fullName.trim(),
                email: formData.email.trim().toLowerCase(),
                isActive: formData.status,
                updatedAt: new Date(),
            };

            if (formData.phone && formData.phone.trim()) {
                updateData.phone = formData.phone.trim();
            }

            const userRef = doc(db, 'users', userId);
            await updateDoc(userRef, updateData);

            Alert.alert('Success', 'User information updated successfully', [
                { text: 'OK', onPress: () => navigation.goBack() },
            ]);
        } catch (error) {
            console.error('Error updating user:', error);
            Alert.alert('Error', `Failed to update user: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const InfoCard = ({ icon, label, value, color }) => (
        <View style={styles.infoCard}>
            <View style={[styles.infoIconContainer, { backgroundColor: `${color}15` }]}>
                <MaterialCommunityIcons name={icon} size={22} color={color} />
            </View>
            <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>{label}</Text>
                <Text style={styles.infoValue}>{value}</Text>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <MaterialCommunityIcons name="chevron-left" size={32} color="#111827" />
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                    <Text style={styles.headerTitle}>Edit User</Text>
                    <Text style={styles.headerSubtitle}>Management Console</Text>
                </View>
                <TouchableOpacity
                    style={styles.saveIconButton}
                    onPress={handleSave}
                    disabled={loading}
                >
                    <MaterialCommunityIcons
                        name={loading ? "loading" : "check-circle"}
                        size={28}
                        color="#4F46E5"
                    />
                </TouchableOpacity>
            </View>

            <ScrollView
                style={styles.content}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {/* Profile Overview Card */}
                <View style={styles.profileCard}>
                    <LinearGradient
                        colors={['#4F46E5', '#7C3AED']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.profileGradient}
                    >
                        <View style={styles.avatarContainer}>
                            <View style={styles.avatar}>
                                <Text style={styles.avatarText}>
                                    {formData.fullName.charAt(0).toUpperCase()}
                                </Text>
                            </View>
                            <TouchableOpacity style={styles.editAvatarButton}>
                                <MaterialCommunityIcons name="camera" size={16} color="#4F46E5" />
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.userName}>{formData.fullName}</Text>
                        <Text style={styles.userRoleText}>SafeWalk User • ID: {userId.substring(0, 8)}</Text>
                    </LinearGradient>

                    <View style={styles.quickStats}>
                        <View style={styles.statBox}>
                            <Text style={styles.statNumber}>{user.trustedContactsCount || 0}</Text>
                            <Text style={styles.statLabel}>Contacts</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statBox}>
                            <Text style={styles.statNumber}>{user.walkSessionsCount || 0}</Text>
                            <Text style={styles.statLabel}>Walks</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statBox}>
                            <View style={[styles.statusBadge, { backgroundColor: formData.status ? '#10B98120' : '#EF444420' }]}>
                                <Text style={[styles.statusBadgeText, { color: formData.status ? '#10B981' : '#EF4444' }]}>
                                    {formData.status ? 'ACTIVE' : 'SUSPENDED'}
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Form Section */}
                <View style={styles.formContainer}>
                    <Text style={styles.sectionHeading}>Account Details</Text>

                    <View style={styles.inputGroup}>
                        <View style={styles.inputLabelRow}>
                            <MaterialCommunityIcons name="account-outline" size={18} color="#6B7280" />
                            <Text style={styles.inputLabel}>Full Name</Text>
                        </View>
                        <TextInput
                            style={styles.input}
                            value={formData.fullName}
                            onChangeText={(text) => setFormData({ ...formData, fullName: text })}
                            placeholder="Enter full name"
                            placeholderTextColor="#9CA3AF"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <View style={styles.inputLabelRow}>
                            <MaterialCommunityIcons name="email-outline" size={18} color="#6B7280" />
                            <Text style={styles.inputLabel}>Email Address</Text>
                        </View>
                        <TextInput
                            style={styles.input}
                            value={formData.email}
                            onChangeText={(text) => setFormData({ ...formData, email: text })}
                            placeholder="Enter email address"
                            placeholderTextColor="#9CA3AF"
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <View style={styles.inputLabelRow}>
                            <MaterialCommunityIcons name="phone-outline" size={18} color="#6B7280" />
                            <Text style={styles.inputLabel}>Phone Number</Text>
                        </View>
                        <TextInput
                            style={styles.input}
                            value={formData.phone}
                            onChangeText={(text) => setFormData({ ...formData, phone: text })}
                            placeholder="Not provided"
                            placeholderTextColor="#9CA3AF"
                            keyboardType="phone-pad"
                        />
                    </View>

                    <Text style={[styles.sectionHeading, { marginTop: 10 }]}>Privileges & Status</Text>

                    <View style={styles.statusCard}>
                        <View style={styles.statusInfo}>
                            <Text style={styles.statusTitle}>Academic Access</Text>
                            <Text style={styles.statusDesc}>Toggle user's ability to use the app</Text>
                        </View>
                        <Switch
                            value={formData.status}
                            onValueChange={(value) => setFormData({ ...formData, status: value })}
                            trackColor={{ false: '#E5E7EB', true: '#C7D2FE' }}
                            thumbColor={formData.status ? '#4F46E5' : '#9CA3AF'}
                            ios_backgroundColor="#E5E7EB"
                        />
                    </View>

                    <TouchableOpacity
                        style={styles.primaryActionButton}
                        onPress={handleSave}
                        disabled={loading}
                    >
                        <LinearGradient
                            colors={['#4F46E5', '#7C3AED']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.actionGradient}
                        >
                            <Text style={styles.actionButtonText}>
                                {loading ? 'UPDATING USER...' : 'UPDATE PROFILE'}
                            </Text>
                            {!loading && <MaterialCommunityIcons name="arrow-right" size={20} color="#fff" />}
                        </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.secondaryButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Text style={styles.secondaryButtonText}>Discard Changes</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
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
        paddingTop: Platform.OS === 'ios' ? 60 : 30,
        paddingHorizontal: 20,
        paddingBottom: 20,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: -10,
    },
    headerTitleContainer: {
        flex: 1,
        marginLeft: 10,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#111827',
    },
    headerSubtitle: {
        fontSize: 12,
        color: '#6B7280',
        fontWeight: '500',
    },
    saveIconButton: {
        padding: 5,
    },
    content: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 40,
    },
    profileCard: {
        margin: 20,
        backgroundColor: '#fff',
        borderRadius: 24,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 5,
    },
    profileGradient: {
        padding: 30,
        alignItems: 'center',
    },
    avatarContainer: {
        position: 'relative',
        marginBottom: 15,
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
        borderColor: 'rgba(255, 255, 255, 0.5)',
    },
    avatarText: {
        fontSize: 32,
        fontWeight: '800',
        color: '#fff',
    },
    editAvatarButton: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#fff',
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
    },
    userName: {
        fontSize: 22,
        fontWeight: '800',
        color: '#fff',
        marginBottom: 5,
    },
    userRoleText: {
        fontSize: 13,
        color: 'rgba(255, 255, 255, 0.8)',
        fontWeight: '500',
    },
    quickStats: {
        flexDirection: 'row',
        paddingVertical: 20,
        alignItems: 'center',
        justifyContent: 'space-around',
    },
    statBox: {
        alignItems: 'center',
        flex: 1,
    },
    statNumber: {
        fontSize: 18,
        fontWeight: '800',
        color: '#111827',
    },
    statLabel: {
        fontSize: 11,
        color: '#6B7280',
        fontWeight: '600',
        marginTop: 2,
    },
    statDivider: {
        width: 1,
        height: 30,
        backgroundColor: '#F3F4F6',
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    statusBadgeText: {
        fontSize: 10,
        fontWeight: '800',
    },
    formContainer: {
        paddingHorizontal: 20,
    },
    sectionHeading: {
        fontSize: 12,
        fontWeight: '800',
        color: '#9CA3AF',
        textTransform: 'uppercase',
        letterSpacing: 1.5,
        marginBottom: 20,
        marginTop: 10,
    },
    inputGroup: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#F3F4F6',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.02,
        shadowRadius: 10,
    },
    inputLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    inputLabel: {
        fontSize: 13,
        fontWeight: '700',
        color: '#374151',
        marginLeft: 8,
    },
    input: {
        fontSize: 16,
        color: '#111827',
        fontWeight: '600',
        paddingVertical: 5,
    },
    statusCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 16,
        marginBottom: 30,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    statusInfo: {
        flex: 1,
    },
    statusTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 2,
    },
    statusDesc: {
        fontSize: 12,
        color: '#6B7280',
    },
    primaryActionButton: {
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#4F46E5',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
        elevation: 8,
    },
    actionGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 18,
    },
    actionButtonText: {
        fontSize: 15,
        fontWeight: '800',
        color: '#fff',
        marginRight: 10,
        letterSpacing: 1,
    },
    secondaryButton: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 20,
        marginTop: 10,
    },
    secondaryButtonText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#EF4444',
    }
});
