import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../theme';

export default function ContactRow({ name, phone, onPress }) {
  return (
    <TouchableOpacity style={styles.row} activeOpacity={0.85} onPress={onPress}>
      <View style={styles.left}>
        <View style={styles.iconWrap}>
          <MaterialCommunityIcons name="account" size={20} color={theme.colors.primary} />
        </View>
        <View>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.phone}>{phone}</Text>
        </View>
      </View>
      <MaterialCommunityIcons name="map-marker-outline" size={22} color="#94A3B8" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.round,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  left: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  iconWrap: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#E9F0FF', alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 16, fontWeight: '600', color: theme.colors.text },
  phone: { fontSize: 12, color: theme.colors.subtitle, marginTop: 2 },
});
