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
    Platform,
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
                <View style={[styles.avatarContainer, { backgroundColor: item.contact?.name === 'Abinayan' ? '#3B1F4D' : '#1E293B' }]}>
                    <Text style={[styles.avatarText, { color: item.contact?.name === 'Abinayan' ? '#A855F7' : '#3B82F6' }]}>
                        {item.contact?.name?.charAt(0)?.toUpperCase() || 'C'}
                    </Text>
                </View>
                
                <View style={styles.nameSection}>
                    <Text style={styles.contactName}>{item.contact?.name || 'Unknown Contact'}</Text>
                    <Text style={styles.sessionDate}>
                        {new Date(item.startedAt).toLocaleDateString(undefined, {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                        }).toUpperCase()}
                    </Text>
                </View>

                <View style={styles.badgeActions}>
                    <View style={styles.endedBadge}>
                        <Text style={styles.endedBadgeText}>ENDED</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.deleteIconBtn}
                        onPress={() => handleDelete(item.id)}
                    >
                        <MaterialCommunityIcons name="delete-outline" size={20} color="#475569" />
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.cardDivider} />

            <View style={styles.cardFooter}>
                <View style={styles.footerRow}>
                    <View style={styles.footerItem}>
                        <MaterialCommunityIcons name="clock-outline" size={18} color="#94A3B8" />
                        <Text style={styles.footerText}>
                            {`${new Date(item.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })} - ${item.endedAt ? new Date(item.endedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : 'Ongoing'}`}
                        </Text>
                    </View>
                    <Text style={styles.durationNote}>Duration: {formatDuration(item.startedAt, item.endedAt)}</Text>
                </View>

                {item.startLocation && (
                    <View style={styles.footerItem}>
                        <MaterialCommunityIcons name="map-marker-outline" size={18} color="#94A3B8" />
                        <Text style={styles.footerText}>
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
            
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <MaterialCommunityIcons name="chevron-left" size={28} color="#F8FAFC" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Walking History</Text>
            </View>

            <View style={styles.mainContent}>
                <LinearGradient
                    colors={['#1E3A8A', '#0D9488']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.statsCard}
                >
                    <View style={styles.statGroup}>
                        <Text style={styles.statLabel}>TOTAL WALKS</Text>
                        <Text style={styles.statValue}>{history.length}</Text>
                    </View>
                    <View style={styles.statVerticalDivider} />
                    <View style={styles.statGroup}>
                        <Text style={styles.statLabel}>COMPLETED</Text>
                        <Text style={styles.statValue}>
                            {history.filter(h => h.status === 'ended').length}
                        </Text>
                    </View>
                </LinearGradient>

                {history.length > 0 ? (
                    <FlatList
                        data={history}
                        renderItem={renderHistoryItem}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={styles.listContainer}
                        showsVerticalScrollIndicator={false}
                    />
                ) : (
                    <View style={styles.emptyContainer}>
                        <MaterialCommunityIcons name="history" size={80} color="#1E293B" />
                        <Text style={styles.emptyTitle}>No History Yet</Text>
                        <Text style={styles.emptySubtitle}>Your completed walks will appear here.</Text>
                    </View>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#010A1A',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(30, 41, 59, 0.5)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '900',
        color: '#F8FAFC',
    },
    mainContent: {
        flex: 1,
        paddingHorizontal: 20,
    },
    statsCard: {
        flexDirection: 'row',
        padding: 24,
        borderRadius: 32,
        marginBottom: 24,
        alignItems: 'center',
    },
    statGroup: {
        flex: 1,
        alignItems: 'center',
    },
    statLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: 'rgba(255, 255, 255, 0.6)',
        letterSpacing: 1,
    },
    statValue: {
        fontSize: 40,
        fontWeight: '900',
        color: '#fff',
        marginTop: 4,
    },
    statVerticalDivider: {
        width: 1,
        height: 40,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
    },
    listContainer: {
        paddingBottom: 40,
    },
    historyCard: {
        backgroundColor: '#0B1526',
        borderRadius: 28,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatarContainer: {
        width: 52,
        height: 52,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    avatarText: {
        fontSize: 22,
        fontWeight: '900',
    },
    nameSection: {
        flex: 1,
        marginLeft: 16,
    },
    contactName: {
        fontSize: 18,
        fontWeight: '800',
        color: '#F8FAFC',
    },
    sessionDate: {
        fontSize: 10,
        fontWeight: '700',
        color: '#64748B',
        marginTop: 2,
        letterSpacing: 0.5,
    },
    badgeActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    endedBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 10,
        backgroundColor: 'rgba(16, 185, 129, 0.05)',
        borderWidth: 1,
        borderColor: 'rgba(16, 185, 129, 0.3)',
        marginRight: 12,
    },
    endedBadgeText: {
        fontSize: 10,
        fontWeight: '900',
        color: '#10B981',
    },
    deleteIconBtn: {
        padding: 4,
    },
    cardDivider: {
        height: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        marginVertical: 16,
    },
    cardFooter: {
        gap: 12,
    },
    footerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    footerItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    footerText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#94A3B8',
    },
    durationNote: {
        fontSize: 12,
        fontWeight: '700',
        color: '#475569',
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingBottom: 100,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#F8FAFC',
        marginTop: 16,
    },
    emptySubtitle: {
        fontSize: 14,
        color: '#64748B',
        marginTop: 8,
    },
});
