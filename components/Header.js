import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../theme';

export default function Header() {
  return (
    <LinearGradient
      colors={[theme.colors.primary, theme.colors.primaryDark]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.wrap}
    >
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>SafeWalk</Text>
          <Text style={styles.sub}>Share your journey with trusted contacts</Text>
        </View>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>D</Text>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingTop: 56, paddingBottom: 20, paddingHorizontal: 16 },
  row: { flexDirection: 'row', alignItems: 'center' },
  title: { color: 'white', fontSize: 22, fontWeight: '700' },
  sub: { color: 'white', opacity: 0.9, marginTop: 4 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#ffffff33', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: 'white', fontWeight: '700' },
});
