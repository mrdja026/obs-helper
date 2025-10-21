import Header from '@/components/Header';
import Colors from '@/constants/Colors';
import { useOBSProxy } from '@/hooks/useOBSProxy';
import { MaterialIcons } from '@expo/vector-icons';
import * as Crypto from 'expo-crypto';
import * as Linking from 'expo-linking';
import * as Random from 'expo-random';
import { StatusBar } from 'expo-status-bar';
import * as WebBrowser from 'expo-web-browser';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const {
    obsUrl,
    obsPassword,
    autoConnect,
    setAutoConnect,
    connect,
    setObsPassword,
    setObsUrl,
  } = useOBSProxy();

  const [url, setUrl] = useState(obsUrl);
  const [password, setPassword] = useState(obsPassword);
  const handleSave = () => {
    // Update the OBS URL and password in the context
    setObsUrl(url);
    setObsPassword(password);

    // Try to connect with new settings if autoConnect is enabled
    if (autoConnect) {
      connect();
    }
  };

  const base64Url = (input: string) =>
    input.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const makeVerifier = async (): Promise<string> => {
    const bytes = await Random.getRandomBytesAsync(64);
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    let out = '';
    for (let i = 0; i < bytes.length; i++)
      out += chars[bytes[i] % chars.length];
    return out; // 43-128 chars per RFC 7636
  };

  const handleSpotifyConnect = async () => {
    try {
      const redirectUri =
        Platform.OS === 'web'
          ? 'https://127.0.0.1:8443/oauthredirect'
          : 'obshelper://oauthredirect';
      const clientId =
        process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID ||
        // fallback to app config extra if provided
        (require('expo-constants').default.expoConfig?.extra
          ?.spotifyClientId as string) ||
        '';
      const scopes = ['user-modify-playback-state', 'user-read-playback-state'];
      const verifier = await makeVerifier();
      const digest = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        verifier,
        { encoding: Crypto.CryptoEncoding.BASE64 }
      );
      const challenge = base64Url(digest);
      const params = new URLSearchParams({
        client_id: clientId,
        response_type: 'code',
        redirect_uri: redirectUri,
        code_challenge_method: 'S256',
        code_challenge: challenge,
        scope: scopes.join(' '),
      });
      const authUrl = `https://accounts.spotify.com/authorize?${params.toString()}`;
      if (Platform.OS === 'web') {
        try {
          sessionStorage.setItem('spotify_pkce_verifier', verifier);
          sessionStorage.setItem('spotify_redirect_uri', redirectUri);
          try {
            localStorage.setItem('spotify_pkce_verifier', verifier);
          } catch {}
          try {
            localStorage.setItem('spotify_redirect_uri', redirectUri);
          } catch {}
        } catch {}
        window.location.href = authUrl; // go to Spotify, then back to /oauthredirect
        return;
      } else {
        const result = await WebBrowser.openAuthSessionAsync(
          authUrl,
          redirectUri
        );
        if (result.type === 'success' && result.url) {
          const parsed = Linking.parse(result.url);
          const code = parsed.queryParams?.code as string | undefined;
          if (code) {
            const proxyBase =
              process.env.EXPO_PUBLIC_PROXY_BASE_URL ||
              (require('expo-constants').default.expoConfig?.extra
                ?.proxyBaseUrl as string) ||
              'http://localhost:3001';
            await fetch(`${proxyBase}/api/spotify/auth/exchange`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                code,
                codeVerifier: verifier,
                redirectUri,
              }),
            });
          }
        }
      }
    } catch (e) {
      // swallow for now
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
                  trackColor={{
                    false: Colors.backgroundLight,
                    true: Colors.primaryDark,
                  }}
                  thumbColor={
                    autoConnect ? Colors.primary : Colors.textSecondary
                  }
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
                A minimalist application for controlling OBS scenes remotely
                through the WebSocket API.
              </Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>SPOTIFY</Text>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSpotifyConnect}
            >
              <MaterialIcons name="link" size={20} color={Colors.text} />
              <Text style={styles.saveButtonText}>Connect Spotify</Text>
            </TouchableOpacity>
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
