import ConnectionStatus from '@/components/ConnectionStatus';
import Header from '@/components/Header';
import SceneButton from '@/components/SceneButton';
import { useOBSProxy } from '@/hooks/useOBSProxy';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ScenesScreen() {
  const insets = useSafeAreaInsets();
  const {
    isConnected,
    currentScene,
    scenes,
    connect,
    disconnect,
    switchScene,
    connectionError,
    isConnecting,
    isReconnecting,
    toggleMic,
    isMicMuted,
    isMicLoading,
    micError,
  } = useOBSProxy();

  const handleNatural1 = async () => {
    if (isConnected) {
      // TODO: Implement through proxy
      console.log('Natural 1 effect not implemented in proxy yet');
    }
  };

  const handleNatural20 = async () => {
    if (isConnected) {
      // TODO: Implement through proxy
      console.log('Natural 20 effect not implemented in proxy yet');
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="light" />
      <Header title="OBS Scene Control" />

      <ConnectionStatus
        isConnected={isConnected}
        isConnecting={isConnecting}
        isReconnecting={isReconnecting}
        error={connectionError}
        onConnect={connect}
        onDisconnect={disconnect}
      />
      <Text style={[styles.sectionTitle, styles.scenesTitle]}>
        AVAILABLE SCENES
      </Text>
      <ScrollView
        style={styles.sceneList}
        contentContainerStyle={styles.sceneListContent}
        showsVerticalScrollIndicator={false}
      >
        {scenes.length > 0 ? (
          scenes.map((scene, index) => (
            <SceneButton
              key={scene.sceneName}
              name={scene.sceneName}
              isActive={scene.sceneName === currentScene}
              onPress={() => switchScene(scene.sceneName)}
              isLast={index === scenes.length - 1}
            />
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              No scenes available.{'\n'}
              {isConnected
                ? 'Try refreshing the connection.'
                : 'Connect to OBS to see scenes.'}
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.sectionDivider} />

      <Text style={[styles.sectionTitle, styles.audioTitle]}>
        AUDIO CONTROLS
      </Text>
      <TouchableOpacity
        style={[
          styles.micButton,
          isMicMuted === false ? styles.micButtonOn : styles.micButtonOff,
          !isConnected || isMicLoading ? styles.micButtonDisabled : null,
        ]}
        onPress={toggleMic}
        disabled={!isConnected || isMicLoading}
        activeOpacity={0.7}
      >
        {isMicLoading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.micButtonText}>
            {isMicMuted === false
              ? 'Mic Live — tap to mute'
              : isMicMuted === true
              ? 'Mic Muted — tap to unmute'
              : 'Mic status unavailable'}
          </Text>
        )}
      </TouchableOpacity>
      {micError ? <Text style={styles.micErrorText}>{micError}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  sectionTitle: {
    fontFamily: 'Orbitron-Bold',
    fontSize: 14,
    color: '#B0B0B0',
    marginBottom: 16,
    letterSpacing: 1.5,
  },
  scenesTitle: {
    marginTop: 24,
  },
  audioTitle: {
    marginTop: 24,
  },
  sceneList: {
    flex: 1,
  },
  sceneListContent: {
    paddingBottom: 24,
  },
  emptyState: {
    padding: 24,
    backgroundColor: '#1D1D1D',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  emptyStateText: {
    fontFamily: 'Roboto-Medium',
    fontSize: 16,
    color: '#B0B0B0',
    textAlign: 'center',
    lineHeight: 24,
  },
  effectButtons: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  effectButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  natural1Button: {
    backgroundColor: '#1E1E1E',
    borderColor: '#FF4444',
  },
  natural20Button: {
    backgroundColor: '#1E1E1E',
    borderColor: '#44FF44',
  },
  effectButtonText: {
    fontFamily: 'Orbitron-Bold',
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  sectionDivider: {
    height: 1,
    backgroundColor: '#1F1F1F',
    marginTop: 24,
    marginBottom: 24,
  },
  micButton: {
    paddingVertical: 18,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2C2C2C',
  },
  micButtonOn: {
    backgroundColor: 'rgba(68, 255, 68, 0.1)',
  },
  micButtonOff: {
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
  },
  micButtonDisabled: {
    opacity: 0.6,
  },
  micButtonText: {
    fontFamily: 'Orbitron-Bold',
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  micErrorText: {
    marginTop: 12,
    fontFamily: 'Roboto-Medium',
    fontSize: 13,
    color: '#FF6B6B',
    textAlign: 'center',
  },
});
