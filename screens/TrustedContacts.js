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
      // Update existing
      const updated = {
        ...editingContact,
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
      };
      await updateContact(updated);
      Alert.alert('Success', 'Contact updated successfully!');
    } else {
      // Add new
      const newContact = {
        id: Date.now().toString(),
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
      };
      await addContact(newContact);
      Alert.alert('Success', 'Contact added successfully!');
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
    Alert.alert(
      'Start Walk Session',
      `Start walk session with ${contact.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start',
          onPress: () => {
            start(contact);
            navigation.navigate('Observer', { contact });
          },
        },
      ]
    );
  };

  const renderContact = ({ item }) => (
    <View style={styles.contactCard}>
      <TouchableOpacity
        style={styles.contactMain}
        onPress={() => handleStartWalk(item)}
        activeOpacity={0.7}
      >
        <View style={styles.contactAvatar}>
          <Text style={styles.contactAvatarText}>
            {item.name?.charAt(0)?.toUpperCase() || 'C'}
          </Text>
        </View>
        <View style={styles.contactInfo}>
          <Text style={styles.contactName}>{item.name}</Text>
          <View style={styles.contactDetail}>
            <MaterialCommunityIcons name="phone" size={14} color="#6B7280" />
            <Text style={styles.contactDetailText}>{item.phone}</Text>
          </View>
          {item.email && (
            <View style={styles.contactDetail}>
              <MaterialCommunityIcons name="email-outline" size={14} color="#6B7280" />
              <Text style={styles.contactDetailText}>{item.email}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
      <View style={styles.contactActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleOpenEdit(item)}
        >
          <MaterialCommunityIcons name="pencil-outline" size={22} color="#4F46E5" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleStartWalk(item)}
        >
          <MaterialCommunityIcons name="play-circle" size={24} color="#10B981" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleDeleteContact(item)}
        >
          <MaterialCommunityIcons name="trash-can-outline" size={22} color="#EF4444" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <LinearGradient
        colors={['#3B82F6', '#2563EB']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Trusted Contacts</Text>
          <View style={{ width: 40 }} />
        </View>
        <Text style={styles.headerSubtitle}>
          {contacts.length} {contacts.length === 1 ? 'contact' : 'contacts'}
        </Text>
      </LinearGradient>

      {/* Content */}
      <View style={styles.content}>
        {contacts.length > 0 ? (
          <FlatList
            data={contacts}
            renderItem={renderContact}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <ScrollView
            contentContainerStyle={styles.emptyScroll}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="account-multiple-outline" size={80} color="#E5E7EB" />
              <Text style={styles.emptyTitle}>No Contacts Yet</Text>
              <Text style={styles.emptyText}>
                Add trusted contacts who can track your location during walks
              </Text>
            </View>
          </ScrollView>
        )}
      </View>

      {/* Add Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={handleOpenAdd}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={['#3B82F6', '#2563EB']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fabGradient}
        >
          <MaterialCommunityIcons name="plus" size={28} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>

      {/* Add/Edit Contact Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowModal(false)}
          />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingContact ? 'Edit Contact' : 'Add Contact'}</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalForm}>
              <View style={styles.inputWrapper}>
                <MaterialCommunityIcons name="account-outline" size={20} color="#6B7280" />
                <TextInput
                  style={styles.input}
                  placeholder="Full Name *"
                  placeholderTextColor="#9CA3AF"
                  value={name}
                  onChangeText={setName}
                />
              </View>

              <View style={styles.inputWrapper}>
                <MaterialCommunityIcons name="phone-outline" size={20} color="#6B7280" />
                <TextInput
                  style={styles.input}
                  placeholder="Phone Number *"
                  placeholderTextColor="#9CA3AF"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.inputWrapper}>
                <MaterialCommunityIcons name="email-outline" size={20} color="#6B7280" />
                <TextInput
                  style={styles.input}
                  placeholder="Email (Optional)"
                  placeholderTextColor="#9CA3AF"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <TouchableOpacity
                style={styles.addButton}
                onPress={handleSaveContact}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#3B82F6', '#2563EB']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.addButtonGradient}
                >
                  <MaterialCommunityIcons name={editingContact ? "content-save" : "check"} size={20} color="#fff" />
                  <Text style={styles.addButtonText}>{editingContact ? 'Update Contact' : 'Add Contact'}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  listContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  contactCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  contactMain: {
    flexDirection: 'row',
    padding: 16,
  },
  contactAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactAvatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#3B82F6',
  },
  contactInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  contactName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  contactDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 6,
  },
  contactDetailText: {
    fontSize: 13,
    color: '#6B7280',
  },
  contactActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: 'flex-end',
    gap: 16,
  },
  actionButton: {
    padding: 8,
  },
  emptyScroll: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
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
    lineHeight: 20,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    borderRadius: 28,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  fabGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
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
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
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
  modalForm: {
    padding: 20,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 14,
    height: 56,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    marginLeft: 12,
  },
  addButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  addButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
