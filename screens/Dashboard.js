import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  StatusBar,
  Dimensions,
  ScrollView,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useWalk } from '../context/WalkContext';
import { useAuth } from '../context/AuthContext';
import * as Location from 'expo-location';

const { width } = Dimensions.get('window');

export default function Dashboard({ navigation }) {
  const { contacts, history, start } = useWalk();
  const { user } = useAuth();
  const [showContactModal, setShowContactModal] = useState(false);

  const handleStartWalk = async (contact) => {
    setShowContactModal(false);

    let startLoc = null;
    try {
      // Try to get current location to set as start location
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (loc) {
          startLoc = {
            lat: loc.coords.latitude,
            lng: loc.coords.longitude,
            speed: loc.coords.speed ?? 0,
            accuracy: loc.coords.accuracy,
            ts: Date.now(),
          };
        }
      }
    } catch (error) {
      console.log('Error getting start location:', error);
    }

    start(contact, startLoc);
    navigation.navigate('Observer', { contact });
  };

  const quickActions = [
    {
      id: '1',
      title: 'Trusted Contacts',
      subtitle: `${contacts.length} contacts`,
      icon: 'account-multiple',
      color: ['#3B82F6', '#2563EB'],
      screen: 'TrustedContacts',
    },
    {
      id: '2',
      title: 'Walking History',
      subtitle: `${history.length} sessions`,
      icon: 'history',
      color: ['#8B5CF6', '#7C3AED'],
      screen: 'History',
    },
    {
      id: '3',
      title: 'Profile',
      subtitle: 'View account',
      icon: 'account-circle',
      color: ['#10B981', '#059669'],
      screen: 'Profile',
    },
  ];

  const renderQuickAction = ({ item }) => (
    <TouchableOpacity
      style={styles.actionCard}
      onPress={() => item.screen && navigation.navigate(item.screen)}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={item.color}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.actionGradient}
      >
        <View style={styles.actionIcon}>
          <MaterialCommunityIcons name={item.icon} size={28} color="#fff" />
        </View>
        <View style={styles.actionContent}>
          <Text style={styles.actionTitle}>{item.title}</Text>
          <Text style={styles.actionSubtitle}>{item.subtitle}</Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={24} color="rgba(255,255,255,0.8)" />
      </LinearGradient>
    </TouchableOpacity>
  );

  const renderContact = ({ item }) => (
    <TouchableOpacity
      style={styles.contactCard}
      onPress={() => handleStartWalk(item)}
      activeOpacity={0.9}
    >
      <View style={styles.contactAvatar}>
        <Text style={styles.contactAvatarText}>
          {item.name?.charAt(0)?.toUpperCase() || 'C'}
        </Text>
      </View>
      <View style={styles.contactInfo}>
        <Text style={styles.contactName}>{item.name}</Text>
        <Text style={styles.contactPhone}>{item.phone}</Text>
      </View>
      <View style={styles.startButton}>
        <MaterialCommunityIcons name="play-circle" size={32} color="#3B82F6" />
      </View>
    </TouchableOpacity>
  );

  const renderHistoryItem = ({ item }) => (
    <View style={styles.historyCard}>
      <View style={styles.historyIcon}>
        <MaterialCommunityIcons name="walk" size={20} color="#8B5CF6" />
      </View>
      <View style={styles.historyContent}>
        <Text style={styles.historyName}>{item.contact?.name || 'Contact'}</Text>
        <Text style={styles.historyTime}>
          {new Date(item.startedAt).toLocaleDateString()} at{' '}
          {new Date(item.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
      <View style={styles.historyStatus}>
        <MaterialCommunityIcons
          name={item.status === 'ended' ? 'check-circle' : 'clock-outline'}
          size={20}
          color={item.status === 'ended' ? '#10B981' : '#F59E0B'}
        />
      </View>
    </View>
  );

  const renderModalContact = ({ item }) => (
    <TouchableOpacity
      style={styles.modalContactCard}
      onPress={() => handleStartWalk(item)}
      activeOpacity={0.7}
    >
      <View style={styles.modalContactAvatar}>
        <Text style={styles.modalContactAvatarText}>
          {item.name?.charAt(0)?.toUpperCase() || 'C'}
        </Text>
      </View>
      <View style={styles.modalContactInfo}>
        <Text style={styles.modalContactName}>{item.name}</Text>
        <Text style={styles.modalContactPhone}>{item.phone}</Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={24} color="#9CA3AF" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <LinearGradient
        colors={['#4F46E5', '#7C3AED']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.userName}>{user?.displayName || 'User'}</Text>
          </View>
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => navigation.navigate('Profile')}
          >
            <View style={styles.profileAvatar}>
              <Text style={styles.profileAvatarText}>
                {user?.displayName?.charAt(0)?.toUpperCase() || 'U'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Start Walk Button */}
        <TouchableOpacity
          style={styles.startWalkButton}
          onPress={() => {
            if (contacts.length === 0) {
              navigation.navigate('TrustedContacts');
            } else {
              setShowContactModal(true);
            }
          }}
          activeOpacity={0.9}
        >
          <View style={styles.startWalkButtonContent}>
            <View style={styles.startWalkIcon}>
              <MaterialCommunityIcons name="walk" size={32} color="#4F46E5" />
            </View>
            <View style={styles.startWalkText}>
              <Text style={styles.startWalkTitle}>Start Walk</Text>
              <Text style={styles.startWalkSubtitle}>
                {contacts.length === 0 ? 'Add a contact first' : 'Select a trusted contact'}
              </Text>
            </View>
            <MaterialCommunityIcons name="arrow-right-circle" size={40} color="#4F46E5" />
          </View>
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <FlatList
            data={quickActions}
            renderItem={renderQuickAction}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
          />
        </View>

        {/* Recent Contacts */}
        {contacts.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Contacts</Text>
              <TouchableOpacity onPress={() => navigation.navigate('TrustedContacts')}>
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={contacts.slice(0, 3)}
              renderItem={renderContact}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
          </View>
        )}

        {/* Recent History */}
        {history.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Sessions</Text>
            </View>
            <FlatList
              data={history.slice(0, 5)}
              renderItem={renderHistoryItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
          </View>
        )}

        {/* Empty State */}
        {contacts.length === 0 && (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="account-group-outline" size={80} color="#E5E7EB" />
            <Text style={styles.emptyTitle}>No Contacts Yet</Text>
            <Text style={styles.emptyText}>Add trusted contacts to start walk sessions</Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => navigation.navigate('TrustedContacts')}
            >
              <Text style={styles.emptyButtonText}>Add Contact</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Select Contact Modal */}
      <Modal
        visible={showContactModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowContactModal(false)}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowContactModal(false)}
          />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Trusted Contact</Text>
              <TouchableOpacity onPress={() => setShowContactModal(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>
              Who will be monitoring your walk?
            </Text>
            <FlatList
              data={contacts}
              renderItem={renderModalContact}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.modalList}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      </Modal>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  greeting: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  userName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    marginTop: 4,
  },
  profileButton: {
    padding: 2,
  },
  profileAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  profileAvatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  startWalkButton: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  startWalkButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  startWalkIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  startWalkText: {
    flex: 1,
    marginLeft: 16,
  },
  startWalkTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  startWalkSubtitle: {
    fontSize: 13,
    color: '#6B7280',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 40,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4F46E5',
  },
  actionCard: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  actionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionContent: {
    flex: 1,
    marginLeft: 16,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  contactAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactAvatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#4F46E5',
  },
  contactInfo: {
    flex: 1,
    marginLeft: 12,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  contactPhone: {
    fontSize: 13,
    color: '#6B7280',
  },
  startButton: {
    padding: 4,
  },
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  historyIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyContent: {
    flex: 1,
    marginLeft: 12,
  },
  historyName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  historyTime: {
    fontSize: 12,
    color: '#6B7280',
  },
  historyStatus: {
    padding: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  modalList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  modalContactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  modalContactAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContactAvatarText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#4F46E5',
  },
  modalContactInfo: {
    flex: 1,
    marginLeft: 12,
  },
  modalContactName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  modalContactPhone: {
    fontSize: 14,
    color: '#6B7280',
  },
});
