import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { theme } from '../theme';
import { useAuth } from '../context/AuthContext';

export default function Register({ navigation }) {
  const { register } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    // Validation
    if (!fullName.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    const result = await register(email.trim(), password, fullName.trim());
    setLoading(false);

    if (result.success) {
      Alert.alert('Success', 'Account created successfully!', [
        { text: 'OK', onPress: () => navigation.navigate('SignIn') }
      ]);
    } else {
      Alert.alert('Registration Failed', result.error || 'Please try again');
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: theme.colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View style={{ flex: 1, padding: 16, gap: 16 }}>
          <Text style={{ fontSize: 24, fontWeight: '700' }}>Create Account</Text>
          <Text style={{ color: '#64748b' }}>Join SafeWalk to stay connected</Text>

          <View style={{ gap: 12, marginTop: 12 }}>
            <View style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 }}>
              <Text style={{ fontWeight: '600', marginBottom: 4 }}>Full Name</Text>
              <TextInput
                placeholder="Jane Doe"
                value={fullName}
                onChangeText={setFullName}
                style={{ paddingVertical: 6 }}
                placeholderTextColor="#94a3b8"
              />
            </View>

            <View style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 }}>
              <Text style={{ fontWeight: '600', marginBottom: 4 }}>Email</Text>
              <TextInput
                placeholder="you@example.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                style={{ paddingVertical: 6 }}
                placeholderTextColor="#94a3b8"
              />
            </View>

            <View style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 }}>
              <Text style={{ fontWeight: '600', marginBottom: 4 }}>Password</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TextInput
                  placeholder="••••••••"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  style={{ flex: 1, paddingVertical: 6 }}
                  placeholderTextColor="#94a3b8"
                />
                <TouchableOpacity onPress={() => setShowPassword((s) => !s)}>
                  <Text style={{ color: theme.colors.primary, fontWeight: '600' }}>{showPassword ? 'Hide' : 'Show'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 }}>
              <Text style={{ fontWeight: '600', marginBottom: 4 }}>Confirm Password</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TextInput
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirm}
                  style={{ flex: 1, paddingVertical: 6 }}
                  placeholderTextColor="#94a3b8"
                />
                <TouchableOpacity onPress={() => setShowConfirm((s) => !s)}>
                  <Text style={{ color: theme.colors.primary, fontWeight: '600' }}>{showConfirm ? 'Hide' : 'Show'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              onPress={handleRegister}
              disabled={loading}
              style={{ backgroundColor: theme.colors.primary, paddingVertical: 12, borderRadius: 12, alignItems: 'center', marginTop: 4 }}
            >
              <Text style={{ color: '#fff', fontWeight: '700' }}>{loading ? 'Creating…' : 'Create Account'}</Text>
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection: 'row', marginTop: 16 }}>
            <Text style={{ color: '#64748b' }}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation && navigation.navigate('SignIn')}>
              <Text style={{ color: theme.colors.primary, fontWeight: '700' }}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
