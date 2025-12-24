import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '../theme';
import { useWalk } from '../context/WalkContext';

const STORAGE_KEY = 'trusted_contacts_v1';

export default function TrustedContacts({ navigation }) {
  const [contacts, setContacts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const { addContact: addContactToStore, contacts: storeContacts, removeContact: removeContactFromStore, start } = useWalk();

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          setContacts(parsed);
          // sync stored trusted contacts into WalkContext (avoid duplicates)
          parsed.forEach((c) => {
            if (!storeContacts.find((s) => s.id === c.id)) {
              addContactToStore(c);
            }
          });
        }
      } catch {}
    })();
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(contacts)).catch(() => {});
  }, [contacts]);

  function addContact() {
    if (!name.trim() || !phone.trim()) {
      Alert.alert('Missing info', 'Please enter name and phone');
      return;
    }
    const newItem = { id: Date.now().toString(), name: name.trim(), email: email.trim(), phone: phone.trim() };
    // update local list + shared store
    setContacts([newItem, ...contacts]);
    try { addContactToStore(newItem); } catch (e) {}
    setName(''); setEmail(''); setPhone(''); setShowForm(false);
  }

  function removeContact(id) {
    setContacts(contacts.filter(c => c.id !== id));
    if (removeContactFromStore) removeContactFromStore(id);
  }

  const handleStartFor = (contact) => {
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

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.card} activeOpacity={0.85} onPress={() => handleStartFor(item)}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{item.name?.charAt(0)?.toUpperCase() || '?'}</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{item.name}</Text>
          <View style={styles.row}><MaterialCommunityIcons name="phone" size={14} color={theme.colors.subtitle} /><Text style={styles.meta}>{item.phone}</Text></View>
          {item.email ? (<View style={styles.row}><MaterialCommunityIcons name="email-outline" size={14} color={theme.colors.subtitle} /><Text style={styles.meta}>{item.email}</Text></View>) : null}
        </View>
      </View>
      <TouchableOpacity onPress={() => removeContact(item.id)}>
        <MaterialCommunityIcons name="trash-can-outline" size={20} color="#94A3B8" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Trusted Contacts</Text>
        <TouchableOpacity onPress={() => setShowForm(!showForm)} style={styles.addBtn}>
          <MaterialCommunityIcons name="plus" size={18} color="#fff" />
          <Text style={styles.addText}>Add Contact</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.subtitle}>People who can track your location during a safe walk</Text>

      {showForm && (
        <View style={styles.form}>
          <TextInput placeholder="Name" value={name} onChangeText={setName} style={styles.input} />
          <TextInput placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" style={styles.input} />
          <TextInput placeholder="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" style={styles.input} />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity style={styles.primary} onPress={addContact}><Text style={styles.primaryText}>Save</Text></TouchableOpacity>
            <TouchableOpacity style={styles.secondary} onPress={() => { setShowForm(false); setName(''); setEmail(''); setPhone(''); }}><Text style={styles.secondaryText}>Cancel</Text></TouchableOpacity>
          </View>
        </View>
      )}

      <FlatList
        contentContainerStyle={{ padding: 16, gap: 12 }}
        data={contacts}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={<Text style={styles.empty}>No trusted contacts yet. Tap "Add Contact".</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingTop: 12, paddingBottom: 8, gap: 8, backgroundColor: theme.colors.background },
  iconBtn: { padding: 8 },
  topTitle: { flex: 1, textAlign: 'left', fontSize: 20, fontWeight: '700', color: theme.colors.text, marginLeft: 4 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: theme.colors.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
  addText: { color: '#fff', fontWeight: '600' },
  subtitle: { color: theme.colors.subtitle, paddingHorizontal: 16, marginBottom: 8 },
  form: { backgroundColor: theme.colors.surface, marginHorizontal: 16, marginBottom: 8, padding: 12, borderRadius: 12, borderColor: theme.colors.border, borderWidth: 1, gap: 8 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: theme.colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  primary: { backgroundColor: theme.colors.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  primaryText: { color: '#fff', fontWeight: '600' },
  secondary: { backgroundColor: '#F3F4F6', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  secondaryText: { color: theme.colors.text },
  card: { backgroundColor: theme.colors.surface, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: theme.colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#E9F0FF', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: theme.colors.primary, fontWeight: '700' },
  name: { fontSize: 16, fontWeight: '600', color: theme.colors.text },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  meta: { color: theme.colors.subtitle, fontSize: 12 },
  empty: { color: theme.colors.subtitle, textAlign: 'center', marginTop: 24 },
});
