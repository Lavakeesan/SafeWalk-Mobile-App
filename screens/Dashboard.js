import React from 'react';
import { View, Text, TouchableOpacity, Alert, FlatList, Platform } from 'react-native';
import { useWalk } from '../context/WalkContext';
import Header from '../components/Header';
import SectionCard from '../components/SectionCard';
import SafetyBanner from '../components/SafetyBanner';
import { theme } from '../theme';

export default function Dashboard({ navigation }) {
  const { contacts, addContact, start, history } = useWalk();

  const handleStartFor = (contact) => {
    if (Platform.OS === 'web') {
      const confirmed = typeof window !== 'undefined' ? window.confirm(`Start walk with ${contact.name}?`) : true;
      if (confirmed) {
        start(contact);
        navigation.navigate('Observer', { contact });
      }
      return;
    }
    Alert.alert(
      'Start walk?',
      `Start observing ${contact.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes',
          onPress: () => {
            start(contact);
            navigation.navigate('Observer', { contact });
          },
        },
      ],
      { cancelable: true }
    );
  };

  // example: calling addContact({ name: 'New Person' }) will add and it will show here
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Header />
      <View style={{ flex: 1, padding: 16 }}>
        <Text style={{ fontWeight: '700', marginBottom: 12 }}>Contacts</Text>

        <FlatList
          data={contacts}
          keyExtractor={(i) => i.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={{ paddingVertical: 12 }}
              onPress={() => handleStartFor(item)}
            >
              <Text>{item.name}</Text>
            </TouchableOpacity>
          )}
        />

        {/* Example button to add a new contact (use in your UI where appropriate) */}
        <TouchableOpacity
          onPress={() => {
            const c = addContact({ name: `New ${Date.now() % 1000}` });
            // optionally auto-start after create:
            // start(c);
            // navigation.navigate('Observer', { contact: c });
          }}
          style={{ marginTop: 20 }}
        >
          <Text></Text>
        </TouchableOpacity>
      </View>
      <SectionCard
        title="Trusted Contacts"
        subtitle={`${contacts.length} contacts`}
        icon="account-multiple-outline"
        onPress={() => navigation.navigate('TrustedContacts')}
      />
      <SectionCard title="Session History" subtitle={`${history.length} sessions`} icon="history" />
      <SectionCard
        title="Profile"
        subtitle="View your account"
        icon="account-circle-outline"
        onPress={() => navigation.navigate('Profile')}
      />
      {history.length > 0 && (
        <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
          {history
            .slice()
            .reverse()
            .slice(0, 5)
            .map((s) => (
              <View key={s.id} style={{ paddingVertical: 8, borderBottomWidth: 1, borderColor: theme.colors.border }}>
                <Text style={{ fontWeight: '600' }}>{s.contact?.name || 'Contact'}</Text>
                <Text style={{ color: '#64748b' }}>
                  {new Date(s.startedAt).toLocaleString()} → {s.endedAt ? new Date(s.endedAt).toLocaleTimeString() : '—'}
                </Text>
              </View>
            ))}
        </View>
      )}
      <SafetyBanner />
    </View>
  );
}
