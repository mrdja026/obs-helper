import React from 'react';
import { View, StyleSheet, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Header from '@/components/Header';
import SceneButton from '@/components/SceneButton';
import ConnectionStatus from '@/components/ConnectionStatus';
import { useOBSProxy } from '@/hooks/useOBSProxy';

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
    isReconnecting
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

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>D&D ROLL EFFECTS</Text>
        <View style={styles.effectButtons}>
          <TouchableOpacity
            style={[styles.effectButton, styles.natural1Button]}
            onPress={handleNatural1}
          >
            <Text style={styles.effectButtonText}>Natural 1!</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.effectButton, styles.natural20Button]}
            onPress={handleNatural20}
          >
            <Text style={styles.effectButtonText}>Natural 20!</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.sectionTitle, styles.scenesTitle]}>AVAILABLE SCENES</Text>
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
                {isConnected ? 'Try refreshing the connection.' : 'Connect to OBS to see scenes.'}
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
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
});