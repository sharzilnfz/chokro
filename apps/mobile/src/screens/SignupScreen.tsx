import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert } from 'react-native';

export function SignupScreen({ onSignupSuccess }: { onSignupSuccess: (token: string) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role: 'INDIVIDUAL' }),
      });
      const data = await res.json();
      if (res.ok && data.token) {
        onSignupSuccess(data.token);
      } else {
        Alert.alert('Signup Failed', data.error || 'Could not create account');
      }
    } catch (err) {
      Alert.alert('Error', 'Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Join Chokro</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#64748B"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#64748B"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <TouchableOpacity style={styles.button} onPress={handleSignup} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Creating Account...' : 'Sign Up'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center', backgroundColor: '#0F172A' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#F8FAFC', marginBottom: 24, textAlign: 'center' },
  input: { backgroundColor: '#1E293B', color: '#F8FAFC', padding: 14, borderRadius: 8, marginBottom: 16 },
  button: { backgroundColor: '#10B981', padding: 16, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#0F172A', fontWeight: 'bold', fontSize: 16 },
});
