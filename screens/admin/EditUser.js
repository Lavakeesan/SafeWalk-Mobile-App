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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';

export default function EditUser({ navigation, route }) {
    const { userId, user } = route.params;

    const [formData, setFormData] = useState({
        fullName: user?.name || '',
        email: user?.email || '',
        phone: user?.phone || '',
        status: user?.status === 'active',
    });
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        // Validation
        if (!formData.fullName.trim()) {
            Alert.alert('Error', 'Please enter a name');
            return;
        }

        if (!formData.email.trim()) {
            Alert.alert('Error', 'Please enter an email address');
            return;
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            Alert.alert('Error', 'Please enter a valid email address');
            return;
        }

        setLoading(true);
        try {
            // Prepare update data
            const updateData = {
                username: formData.fullName.trim(),
                email: formData.email.trim().toLowerCase(),
                isActive: formData.status,
                updatedAt: new Date(),
            };

            // Add phone if provided
            if (formData.phone && formData.phone.trim()) {
                updateData.phone = formData.phone.trim();
            }

            // Update user in Firestore
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
                <Text style={styles.headerTitle}>Edit User Details</Text>
            </View>

            <ScrollView
                style={styles.content}
                showsVerticalScrollIndicator={false}
            >
                {/* Profile Picture */}
                <View style={styles.profileSection}>
                    <View style={styles.avatarContainer}>
                        <View style={styles.avatar}>
                            <MaterialCommunityIcons name="account" size={60} color="#6B7280" />
                        </View>
                        <TouchableOpacity style={styles.cameraButton}>
                            <MaterialCommunityIcons name="camera" size={18} color="#fff" />
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.profileName}>{formData.fullName || 'User Name'}</Text>
                    <Text style={styles.profileId}>User ID: #{userId.substring(0, 6)}</Text>

                    {/* User Stats */}
                    {user && (
                        <View style={styles.profileStats}>
                            {user.createdAt && (
                                <View style={styles.statItem}>
                                    <MaterialCommunityIcons name="calendar" size={16} color="#6B7280" />
                                    <Text style={styles.statText}>
                                        Joined {new Date(user.createdAt.seconds ? user.createdAt.seconds * 1000 : user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                                    </Text>
                                </View>
                            )}
                            <View style={styles.profileStatsRow}>
                                <View style={styles.miniStat}>
                                    <MaterialCommunityIcons name="account-group" size={16} color="#4F46E5" />
                                    <Text style={styles.miniStatText}>{user.trustedContactsCount || 0} contacts</Text>
                                </View>
                                <View style={styles.miniStat}>
                                    <MaterialCommunityIcons name="map-marker-path" size={16} color="#10B981" />
                                    <Text style={styles.miniStatText}>{user.walkSessionsCount || 0} walks</Text>
                                </View>
                            </View>
                        </View>
                    )}
                </View>

                {/* Personal Info Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>PERSONAL INFO</Text>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Full Name</Text>
                        <View style={styles.inputWrapper}>
                            <TextInput
                                style={styles.input}
                                value={formData.fullName}
                                onChangeText={(text) => setFormData({ ...formData, fullName: text })}
                                placeholder="Enter full name"
                                placeholderTextColor="#9CA3AF"
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Email Address</Text>
                        <View style={styles.inputWrapper}>
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
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Phone Number</Text>
                        <View style={styles.inputWrapper}>
                            <TextInput
                                style={styles.input}
                                value={formData.phone}
                                onChangeText={(text) => setFormData({ ...formData, phone: text })}
                                placeholder="Enter phone number (optional)"
                                placeholderTextColor="#9CA3AF"
                                keyboardType="phone-pad"
                            />
                        </View>
                    </View>
                </View>

                {/* Account Status Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>ACCOUNT STATUS</Text>

                    <View style={styles.inputGroup}>
                        <View style={styles.switchRow}>
                            <View>
                                <Text style={styles.switchLabel}>Status</Text>
                                <Text style={styles.switchDescription}>
                                    {formData.status ? 'Account is active' : 'Account is suspended'}
                                </Text>
                            </View>
                            <Switch
                                value={formData.status}
                                onValueChange={(value) => setFormData({ ...formData, status: value })}
                                trackColor={{ false: '#D1D5DB', true: '#93C5FD' }}
                                thumbColor={formData.status ? '#3B82F6' : '#F3F4F6'}
                                ios_backgroundColor="#D1D5DB"
                            />
                        </View>
                    </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                    <TouchableOpacity
                        style={styles.saveButton}
                        onPress={handleSave}
                        disabled={loading}
                    >
                        <LinearGradient
                            colors={['#4F46E5', '#7C3AED']}
                            style={styles.saveButtonGradient}
                        >
                            <Text style={styles.saveButtonText}>
                                {loading ? 'Saving...' : 'Save Changes'}
                            </Text>
                        </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Text style={styles.cancelButtonText}>Cancel</Text>
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
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#111827',
    },
    content: {
        flex: 1,
    },
    profileSection: {
        alignItems: 'center',
        paddingVertical: 32,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    avatarContainer: {
        position: 'relative',
        marginBottom: 16,
    },
    avatar: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 4,
        borderColor: '#fff',
    },
    cameraButton: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#4F46E5',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
        borderColor: '#fff',
    },
    profileName: {
        fontSize: 24,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 4,
    },
    profileId: {
        fontSize: 14,
        color: '#6B7280',
    },
    section: {
        paddingHorizontal: 20,
        paddingVertical: 24,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: '#9CA3AF',
        letterSpacing: 0.5,
        marginBottom: 16,
    },
    inputGroup: {
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 8,
    },
    inputWrapper: {
        backgroundColor: '#fff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        paddingHorizontal: 16,
        height: 52,
        justifyContent: 'center',
    },
    input: {
        fontSize: 15,
        color: '#111827',
    },
    switchRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        padding: 16,
    },
    switchLabel: {
        fontSize: 15,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 4,
    },
    switchDescription: {
        fontSize: 13,
        color: '#6B7280',
    },
    actionButtons: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    saveButton: {
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 12,
        shadowColor: '#4F46E5',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    saveButtonGradient: {
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    saveButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
    },
    cancelButton: {
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#6B7280',
    },
});
