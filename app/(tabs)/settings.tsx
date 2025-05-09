import React, { useState } from 'react';
import { View, StyleSheet, Text, TextInput, TouchableOpacity, ScrollView, Switch, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';
import Header from '@/components/Header';
import Colors from '@/constants/Colors';
import { useOBSWebSocket } from '@/hooks/useOBSWebSocket';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const {
    websocketUrl,
    websocketPassword,
    setWebsocketUrl,
    setWebsocketPassword,
    autoConnect,
    setAutoConnect,
    connect
  } = useOBSWebSocket();

  const [url, setUrl] = useState(websocketUrl);
  const [password, setPassword] = useState(websocketPassword);

  const handleSave = () => {
    setWebsocketUrl(url);
    setWebsocketPassword(password);

    // Try to connect with new settings if autoConnect is enabled
    if (autoConnect) {
      connect();
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar style="light" />
        <Header title="Settings" />

        <ScrollView
          style={styles.content}
          contentContainerStyle={{ paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>CONNECTION SETTINGS</Text>

            <View style={styles.formGroup}>
              <Text style={styles.label}>WebSocket URL</Text>
              <TextInput
                style={styles.input}
                value={url}
                onChangeText={setUrl}
                placeholder="ws://127.0.0.1:4456"
                placeholderTextColor={Colors.textSecondary}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Text style={styles.hint}>Example: ws://192.168.1.100:4456</Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholder="Enter password"
                placeholderTextColor={Colors.textSecondary}
              />
              <Text style={styles.hint}>Leave empty if no password is set</Text>
            </View>

            <View style={styles.formGroup}>
              <View style={styles.switchContainer}>
                <Text style={styles.switchLabel}>Auto-connect on startup</Text>
                <Switch
                  value={autoConnect}
                  onValueChange={setAutoConnect}
                  trackColor={{ false: Colors.backgroundLight, true: Colors.primaryDark }}
                  thumbColor={autoConnect ? Colors.primary : Colors.textSecondary}
                />
              </View>
            </View>

            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <MaterialIcons name="save" size={20} color={Colors.text} />
              <Text style={styles.saveButtonText}>Save Settings</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ABOUT</Text>
            <View style={styles.card}>
              <Text style={styles.aboutTitle}>OBS Scene Controller</Text>
              <Text style={styles.aboutVersion}>Version 1.0.0</Text>
              <Text style={styles.aboutDescription}>
                A minimalist application for controlling OBS scenes remotely through the WebSocket API.
              </Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontFamily: 'Orbitron-Bold',
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 16,
    letterSpacing: 1.5,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontFamily: 'Roboto-Medium',
    fontSize: 14,
    color: Colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.backgroundLight,
    borderRadius: 8,
    padding: 16,
    color: Colors.text,
    fontFamily: 'Roboto-Regular',
    fontSize: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  hint: {
    fontFamily: 'Roboto-Regular',
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 8,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  switchLabel: {
    fontFamily: 'Roboto-Medium',
    fontSize: 16,
    color: Colors.text,
  },
  saveButton: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
  },
  saveButtonText: {
    fontFamily: 'Roboto-Bold',
    fontSize: 16,
    color: Colors.text,
    marginLeft: 8,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  aboutTitle: {
    fontFamily: 'Orbitron-Bold',
    fontSize: 18,
    color: Colors.text,
    marginBottom: 4,
  },
  aboutVersion: {
    fontFamily: 'Roboto-Regular',
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  aboutDescription: {
    fontFamily: 'Roboto-Regular',
    fontSize: 16,
    color: Colors.text,
    lineHeight: 24,
  },
});