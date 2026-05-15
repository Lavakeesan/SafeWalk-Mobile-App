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
  Platform,
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

      {/* Modern Header */}
      <View style={styles.header}>
        <Text style={styles.logoText}>SafeWalk</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.iconButton}>
            <MaterialCommunityIcons name="bell-outline" size={24} color="#F8FAFC" />
            <View style={styles.notifBadge} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.headerAvatar}
            onPress={() => navigation.navigate('Profile')}
          >
            <View style={styles.avatarGlow} />
            <Text style={styles.avatarInitial}>
              {user?.displayName?.charAt(0)?.toUpperCase() || 'U'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        {/* System Status Card */}
        <View style={styles.statusCardWrapper}>
          <LinearGradient
            colors={['rgba(16, 185, 129, 0.1)', 'rgba(0, 242, 255, 0.05)']}
            style={styles.statusCard}
          >
            <View style={styles.statusIconBox}>
              <MaterialCommunityIcons name="shield-check" size={24} color="#10B981" />
            </View>
            <View style={styles.statusInfo}>
              <Text style={styles.statusTitle}>System Secure</Text>
              <Text style={styles.statusSubtitle}>GPS and Guardian network active</Text>
            </View>
            <View style={styles.pulseContainer}>
              <View style={styles.pulseCircle} />
              <View style={styles.pulseCircleInner} />
            </View>
          </LinearGradient>
        </View>

        {/* Primary Start Walk Button */}
        <TouchableOpacity
          style={styles.mainStartButton}
          onPress={() => {
            if (contacts.length === 0) {
              navigation.navigate('TrustedContacts');
            } else {
              setShowContactModal(true);
            }
          }}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#1E3A8A', '#0D9488']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.mainStartGradient}
          >
            <MaterialCommunityIcons name="navigation-variant-outline" size={24} color="#fff" style={styles.startIcon} />
            <Text style={styles.mainStartText}>Start Walk</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Trusted Contacts Horizontal List */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Trusted Contacts</Text>
            <TouchableOpacity onPress={() => navigation.navigate('TrustedContacts')}>
              <Text style={styles.seeAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalContacts}>
            {contacts.map((contact) => (
              <TouchableOpacity key={contact.id} style={styles.contactCircleItem}>
                <View style={[styles.contactCircleAvatar, { borderColor: '#0D9488' }]}>
                  <Text style={styles.contactInitialText}>{contact.name?.charAt(0)}</Text>
                </View>
                <Text style={styles.contactCircleName}>{contact.name.split(' ')[0]}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity 
              style={styles.contactCircleItem}
              onPress={() => navigation.navigate('TrustedContacts')}
            >
              <View style={styles.addContactCircle}>
                <MaterialCommunityIcons name="plus" size={24} color="#F8FAFC" />
              </View>
              <Text style={styles.contactCircleName}>Add</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Recent Activity Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.titleWithIcon}>
              <MaterialCommunityIcons name="clock-outline" size={22} color="#818CF8" />
              <Text style={styles.sectionTitle}>Recent Activity</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('History')}>
              <Text style={styles.seeAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.activityList}>
            {history.length > 0 ? (
              history.slice(0, 10).map((item) => (
                <TouchableOpacity key={item.id} style={styles.activityCard}>
                  <View style={styles.activityIconBox}>
                    <MaterialCommunityIcons name="history" size={20} color="#818CF8" />
                  </View>
                  <View style={styles.activityInfo}>
                    <Text style={styles.activityTitle}>{item.contact?.name || 'Walk Session'}</Text>
                    <Text style={styles.activitySubtitle}>
                      {new Date(item.startedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} • {item.distance || '0.0'} km
                    </Text>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={20} color="#475569" />
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyActivityBox}>
                <Text style={styles.emptyActivityText}>No recent sessions</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* SOS Button */}
      <TouchableOpacity style={styles.sosButton} activeOpacity={0.9}>
        <LinearGradient
          colors={['#FF4B2B', '#FF416C']}
          style={styles.sosGradient}
        >
          <Text style={styles.sosText}>SOS</Text>
          <Text style={styles.sosSubText}>HOLD</Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* Bottom Tab Bar (Simulated) */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('TrustedContacts')}>
          <MaterialCommunityIcons name="account-group-outline" size={24} color="#94A3B8" />
          <Text style={styles.navText}>Contacts</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('History')}>
          <MaterialCommunityIcons name="history" size={24} color="#94A3B8" />
          <Text style={styles.navText}>History</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItemActive}>
          <View style={styles.navActiveCircle}>
            <MaterialCommunityIcons name="walk" size={28} color="#0D9488" />
          </View>
          <Text style={[styles.navText, { color: '#0D9488' }]}>Start Walk</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <MaterialCommunityIcons name="cog-outline" size={24} color="#94A3B8" />
          <Text style={styles.navText}>Settings</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Profile')}>
          <MaterialCommunityIcons name="account-outline" size={24} color="#94A3B8" />
          <Text style={styles.navText}>Profile</Text>
        </TouchableOpacity>
      </View>

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
    backgroundColor: '#010A1A',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
  },
  logoText: {
    fontSize: 26,
    fontWeight: '900',
    color: '#F8FAFC',
    letterSpacing: -1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notifBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0D9488',
    borderWidth: 2,
    borderColor: '#010A1A',
  },
  headerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarGlow: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#0D9488',
    opacity: 0.5,
  },
  avatarInitial: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0D9488',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 120,
  },
  statusCardWrapper: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 255, 0.3)',
  },
  statusIconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusInfo: {
    flex: 1,
    marginLeft: 16,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: 0.5,
  },
  statusSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  pulseContainer: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseCircle: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
    opacity: 0.3,
    transform: [{ scale: 1.5 }],
  },
  pulseCircleInner: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  mainStartButton: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  mainStartGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 30,
    gap: 12,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  mainStartText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 0.5,
  },
  startIcon: {
    transform: [{ rotate: '45deg' }],
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#F8FAFC',
    marginLeft: 8,
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0D9488',
  },
  horizontalContacts: {
    paddingLeft: 24,
  },
  contactCircleItem: {
    alignItems: 'center',
    marginRight: 20,
    width: 70,
  },
  contactCircleAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F172A',
    marginBottom: 8,
  },
  addContactCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 8,
  },
  contactInitialText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  contactCircleName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  activityList: {
    paddingHorizontal: 24,
    gap: 12,
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  activityIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(129, 140, 248, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityInfo: {
    flex: 1,
    marginLeft: 16,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  activitySubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  emptyActivityBox: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyActivityText: {
    color: '#475569',
    fontSize: 14,
  },
  sosButton: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
    shadowColor: '#FF4B2B',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 10,
  },
  sosGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sosText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#fff',
  },
  sosSubText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#fff',
    opacity: 0.8,
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: 'rgba(1, 10, 26, 0.95)',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: Platform.OS === 'ios' ? 20 : 0,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  navItemActive: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -20,
  },
  navActiveCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#0D9488',
    marginBottom: 4,
    shadowColor: '#0D9488',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 5,
  },
  navText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    marginTop: 4,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalContent: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    maxHeight: '70%',
    paddingBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#94A3B8',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  modalList: {
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  modalContactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    padding: 16,
    borderRadius: 20,
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  modalContactAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(0, 242, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContactAvatarText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0D9488',
  },
  modalContactInfo: {
    flex: 1,
    marginLeft: 12,
  },
  modalContactName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 4,
  },
  modalContactPhone: {
    fontSize: 14,
    color: '#94A3B8',
  },
});
