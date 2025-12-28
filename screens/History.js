import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    StatusBar,
    Dimensions,
    Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useWalk } from '../context/WalkContext';

const { width } = Dimensions.get('window');

export default function History({ navigation }) {
    const { history, deleteHistorySession } = useWalk();

    const handleDelete = (id) => {
        Alert.alert(
            "Delete Session",
            "Are you sure you want to remove this walk from your history?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => deleteHistorySession(id)
                }
            ]
        );
    };

    const formatDuration = (start, end) => {
        if (!start || !end) return 'N/A';
        const seconds = Math.floor((end - start) / 1000);
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        if (hrs > 0) {
            return `${hrs}h ${mins}m ${secs}s`;
        }
        return `${mins}m ${secs}s`;
    };

    const renderHistoryItem = ({ item }) => (
        <View style={styles.historyCard}>
            <View style={styles.cardHeader}>
                <View style={styles.contactAvatar}>
                    <Text style={styles.avatarText}>
                        {item.contact?.name?.charAt(0)?.toUpperCase() || 'C'}
                    </Text>
                </View>
                <View style={styles.headerInfo}>
                    <Text style={styles.contactName}>{item.contact?.name || 'Unknown Contact'}</Text>
                    <Text style={styles.sessionDate}>
                        {new Date(item.startedAt).toLocaleDateString(undefined, {
                            weekday: 'short',
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                        })}
                    </Text>
                </View>
                <View style={styles.headerActions}>
                    <View style={[styles.statusBadge, item.status === 'ended' ? styles.statusEnded : styles.statusActive]}>
                        <Text style={styles.statusText}>{String(item.status || 'unknown').toUpperCase()}</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => handleDelete(item.id)}
                    >
                        <MaterialCommunityIcons name="delete-outline" size={22} color="#EF4444" />
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.cardBody}>
                <View style={styles.detailItem}>
                    <MaterialCommunityIcons name="clock-outline" size={18} color="#6B7280" />
                    <Text style={styles.detailText}>
                        {`${new Date(item.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${item.endedAt ? new Date(item.endedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Ongoing'}`}
                    </Text>
                </View>
                <View style={styles.detailItem}>
                    <MaterialCommunityIcons name="timer-outline" size={18} color="#6B7280" />
                    <Text style={styles.detailText}>
                        {`Duration: ${formatDuration(item.startedAt, item.endedAt)}`}
                    </Text>
                </View>
                {item.startLocation && (
                    <View style={styles.detailItem}>
                        <MaterialCommunityIcons name="map-marker-radius" size={18} color="#6B7280" />
                        <Text style={styles.detailText} numberOfLines={1}>
                            {`Started at: ${item.startLocation.lat.toFixed(4)}, ${item.startLocation.lng.toFixed(4)}`}
                        </Text>
                    </View>
                )}
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <LinearGradient
                colors={['#8B5CF6', '#6D28D9']}
                style={styles.header}
            >
                <View style={styles.headerContent}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                    >
                        <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Walking History</Text>
                    <View style={{ width: 40 }} />
                </View>
                <View style={styles.statsRow}>
                    <View style={styles.statBox}>
                        <Text style={styles.statValue}>{history.length}</Text>
                        <Text style={styles.statLabel}>Total Walks</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statBox}>
                        <Text style={styles.statValue}>
                            {history.filter(h => h.status === 'ended').length}
                        </Text>
                        <Text style={styles.statLabel}>Completed</Text>
                    </View>
                </View>
            </LinearGradient>

            {history.length > 0 ? (
                <FlatList
                    data={history.slice().reverse()}
                    renderItem={renderHistoryItem}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                />
            ) : (
                <View style={styles.emptyContainer}>
                    <MaterialCommunityIcons name="history" size={80} color="#E5E7EB" />
                    <Text style={styles.emptyTitle}>No History Yet</Text>
                    <Text style={styles.emptySubtitle}>Your completed walks will appear here.</Text>
                    <TouchableOpacity
                        style={styles.startButton}
                        onPress={() => navigation.navigate('Dashboard')}
                    >
                        <Text style={styles.startButtonText}>Back to Dashboard</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    header: {
        paddingTop: 60,
        paddingBottom: 24,
        paddingHorizontal: 20,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#fff',
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        borderRadius: 20,
        paddingVertical: 15,
    },
    statBox: {
        flex: 1,
        alignItems: 'center',
    },
    statValue: {
        fontSize: 22,
        fontWeight: '800',
        color: '#fff',
    },
    statLabel: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.8)',
        marginTop: 2,
    },
    statDivider: {
        width: 1,
        height: '60%',
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
    },
    listContent: {
        padding: 20,
        paddingBottom: 40,
    },
    historyCard: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    contactAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#F3E8FF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        fontSize: 20,
        fontWeight: '700',
        color: '#7C3AED',
    },
    headerInfo: {
        flex: 1,
        marginLeft: 12,
    },
    contactName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#111827',
    },
    sessionDate: {
        fontSize: 13,
        color: '#6B7280',
        marginTop: 2,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    statusEnded: {
        backgroundColor: '#D1FAE5',
    },
    statusActive: {
        backgroundColor: '#FEF3C7',
    },
    statusText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#065F46',
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    deleteButton: {
        marginLeft: 8,
        padding: 4,
    },
    cardBody: {
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
        paddingTop: 12,
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    detailText: {
        fontSize: 14,
        color: '#4B5563',
        marginLeft: 8,
        fontWeight: '500',
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#111827',
        marginTop: 16,
    },
    emptySubtitle: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
        marginTop: 8,
        marginBottom: 24,
    },
    startButton: {
        backgroundColor: '#7C3AED',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
    },
    startButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
});
