import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
  StyleSheet,
  StatusBar,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useWalk } from '../context/WalkContext';

export default function TrustedContacts({ navigation }) {
  const { contacts, addContact, removeContact, updateContact, start } = useWalk();
  const [showModal, setShowModal] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const handleOpenAdd = () => {
    setEditingContact(null);
    setName('');
    setEmail('');
    setPhone('');
    setShowModal(true);
  };

  const handleOpenEdit = (contact) => {
    setEditingContact(contact);
    setName(contact.name);
    setEmail(contact.email || '');
    setPhone(contact.phone);
    setShowModal(true);
  };

  const handleSaveContact = async () => {
    if (!name.trim() || !phone.trim()) {
      Alert.alert('Error', 'Please enter name and phone number');
      return;
    }

    if (editingContact) {
      const updated = {
        ...editingContact,
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
      };
      await updateContact(updated);
    } else {
      const newContact = {
        id: Date.now().toString(),
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
      };
      await addContact(newContact);
    }

    setName('');
    setEmail('');
    setPhone('');
    setEditingContact(null);
    setShowModal(false);
  };

  const handleDeleteContact = (contact) => {
    Alert.alert(
      'Delete Contact',
      `Are you sure you want to remove ${contact.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => removeContact(contact.id),
        },
      ]
    );
  };

  const handleStartWalk = (contact) => {
    start(contact);
    navigation.navigate('Observer', { contact });
  };

  const renderContact = ({ item }) => (
    <View style={styles.contactCard}>
      <View style={styles.cardMain}>
        <View style={styles.avatarWrapper}>
          <Text style={styles.avatarText}>{item.name?.charAt(0)?.toUpperCase() || 'C'}</Text>
        </View>
        <View style={styles.contactDetails}>
          <Text style={styles.contactName}>{item.name}</Text>
          <View style={styles.detailRow}>
            <MaterialCommunityIcons name="phone-outline" size={16} color="#94A3B8" />
            <Text style={styles.detailText}>{item.phone}</Text>
          </View>
          {item.email && (
            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="email-outline" size={16} color="#94A3B8" />
              <Text style={styles.detailText}>{item.email}</Text>
            </View>
          )}
        </View>
      </View>
      
      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.iconActionBtn} onPress={() => handleOpenEdit(item)}>
          <MaterialCommunityIcons name="pencil-outline" size={22} color="#94A3B8" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconActionBtn} onPress={() => handleStartWalk(item)}>
          <MaterialCommunityIcons name="play" size={24} color="#10B981" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconActionBtn} onPress={() => handleDeleteContact(item)}>
          <MaterialCommunityIcons name="delete-outline" size={22} color="#EF4444" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#F8FAFC" />
        </TouchableOpacity>
        <View style={styles.headerTitles}>
          <Text style={styles.headerMainTitle}>Trusted Contacts</Text>
          <Text style={styles.headerSubTitle}>{contacts.length} CONTACTS SAVED</Text>
        </View>
      </View>

      <FlatList
        data={contacts}
        renderItem={renderContact}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="account-multiple-outline" size={80} color="#1E293B" />
            <Text style={styles.emptyText}>No contacts saved yet.</Text>
          </View>
        }
      />

      <TouchableOpacity style={styles.fab} onPress={handleOpenAdd}>
        <MaterialCommunityIcons name="plus" size={32} color="#fff" />
      </TouchableOpacity>

      <Modal visible={showModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editingContact ? 'Edit Contact' : 'New Contact'}</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Name"
              placeholderTextColor="#64748B"
              value={name}
              onChangeText={setName}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Phone"
              placeholderTextColor="#64748B"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Email"
              placeholderTextColor="#64748B"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setShowModal(false)}>
                <Text style={styles.modalBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnSave} onPress={handleSaveContact}>
                <Text style={styles.modalBtnText}>Save</Text>
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
    backgroundColor: '#010A1A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  backBtn: {
    padding: 8,
    marginRight: 12,
  },
  headerTitles: {
    flex: 1,
  },
  headerMainTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#F8FAFC',
  },
  headerSubTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 2,
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  contactCard: {
    backgroundColor: '#0B1526',
    borderRadius: 24,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  cardMain: {
    flexDirection: 'row',
    padding: 20,
    alignItems: 'center',
  },
  avatarWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.2)',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#3B82F6',
  },
  contactDetails: {
    flex: 1,
    marginLeft: 16,
  },
  contactName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
    marginBottom: 6,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  detailText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    gap: 24,
  },
  iconActionBtn: {
    padding: 4,
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 100,
  },
  emptyText: {
    color: '#64748B',
    marginTop: 16,
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#0B1526',
    borderRadius: 32,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#F8FAFC',
    marginBottom: 24,
  },
  modalInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    padding: 16,
    color: '#F8FAFC',
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalBtnCancel: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  modalBtnSave: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    backgroundColor: '#2563EB',
  },
  modalBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
});
