import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../theme';

export default function SafetyBanner() {
  return (
    <View style={styles.wrap}>
      <MaterialCommunityIcons name="alert-circle-outline" size={18} color={theme.colors.warning} />
      <Text style={styles.text}>
        Safety Features — Automatic alerts for sudden stops, no movement, or unusual activity
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: theme.colors.warningBg,
    borderColor: '#FED7AA',
    borderWidth: 1,
    borderRadius: theme.round,
    padding: 12,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  text: { color: theme.colors.warning, flex: 1, fontSize: 12, lineHeight: 16 },
});
