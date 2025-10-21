import ChatMessageItem from '@/components/ChatMessageItem';
import ConnectionStatus from '@/components/ConnectionStatus';
import Header from '@/components/Header';
import SceneButton from '@/components/SceneButton';
import { useOBSProxy } from '@/hooks/useOBSProxy';
import { MaterialIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import React, { useRef } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ScenesScreen() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
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
    chatMessages,
    chatStatus,
    songQueue,
    songQueueError,
    isQueueActionLoading,
    removeSong,
    skipSong,
  } = useOBSProxy();

  const flatListRef = useRef<FlatList<any> | null>(null);

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

      <View
        style={[styles.responsiveRow, isLandscape ? styles.row : styles.column]}
      >
        <View
          style={[
            styles.primaryPanel,
            isLandscape ? styles.primaryLandscape : styles.primaryPortrait,
          ]}
        >
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
          {micError ? (
            <Text style={styles.micErrorText}>{micError}</Text>
          ) : null}
        </View>

        <View
          style={[
            styles.chatPanel,
            isLandscape ? styles.chatLandscape : styles.chatPortrait,
          ]}
        >
          {/* Top half: Chat */}
          <View style={styles.halfPanel}>
            <Text style={[styles.sectionTitle, styles.chatTitle]}>CHAT</Text>
            {chatStatus && (
              <Text style={styles.chatStatus}>
                {chatStatus.connected ? 'Connected' : 'Disconnected'}
                {chatStatus.channel ? ` · #${chatStatus.channel}` : ''}
              </Text>
            )}
            <FlatList
              data={chatMessages}
              keyExtractor={(item) =>
                item.id || `${item.timestamp}-${item.user?.username}`
              }
              renderItem={({ item }) => (
                <ChatMessageItem
                  id={item.id}
                  text={item.text}
                  channel={item.channel}
                  user={item.user}
                  timestamp={item.timestamp}
                  isAction={item.isAction}
                  isHighlighted={item.isHighlighted}
                />
              )}
              contentContainerStyle={styles.chatListContent}
              style={styles.chatList}
              showsVerticalScrollIndicator={false}
              onContentSizeChange={() => {
                try {
                  // Auto-scroll to last message
                  flatListRef?.current?.scrollToEnd({ animated: true });
                } catch {}
              }}
              ref={flatListRef}
            />
          </View>

          {/* Bottom half: Queue */}
          <View style={styles.halfPanel}>
            <View style={styles.queueHeaderRow}>
              <Text style={[styles.sectionTitle, styles.queueTitle]}>
                QUEUE
              </Text>
              <Text style={styles.queueSubTitle}>capacity 10</Text>
              <TouchableOpacity
                style={[
                  styles.skipButton,
                  !songQueue || songQueue.length === 0 || isQueueActionLoading
                    ? styles.actionDisabled
                    : null,
                ]}
                onPress={skipSong}
                disabled={
                  !songQueue || songQueue.length === 0 || isQueueActionLoading
                }
                activeOpacity={0.7}
              >
                {isQueueActionLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <MaterialIcons name="skip-next" size={16} color="#FFFFFF" />
                    <Text style={styles.skipButtonText}>Skip current</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
            {songQueueError ? (
              <Text style={styles.queueError}>{songQueueError}</Text>
            ) : null}
            <ScrollView
              style={styles.queueList}
              contentContainerStyle={styles.queueListContent}
            >
              {!songQueue || songQueue.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>Queue is empty</Text>
                </View>
              ) : (
                songQueue.slice(0, 10).map((item, idx) => (
                  <View
                    key={item.id}
                    style={[
                      styles.queueRow,
                      idx === 0 ? styles.queueRowFirst : null,
                    ]}
                  >
                    <Text style={styles.queueIndex}>{idx + 1}.</Text>
                    <View style={styles.queueMain}>
                      <Text style={styles.queueTitleText} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={styles.queueByText} numberOfLines={1}>
                        by {item.requestedBy}
                      </Text>
                    </View>
                    <View style={styles.queueActions}>
                      {item.matchStatus === 'matched' ? (
                        <Text style={{ color: '#03DAC6', marginRight: 8 }}>✓</Text>
                      ) : item.matchStatus === 'pending' ? (
                        <Text style={{ color: '#B0B0B0', marginRight: 8 }}>…</Text>
                      ) : item.matchStatus === 'error' ? (
                        <MaterialIcons name="error-outline" size={16} color="#FF6B6B" style={{ marginRight: 8 }} />
                      ) : null}
                      <TouchableOpacity
                        style={[
                          styles.removeButton,
                          isQueueActionLoading ? styles.actionDisabled : null,
                        ]}
                        onPress={() => removeSong(idx + 1)}
                        disabled={isQueueActionLoading}
                        activeOpacity={0.7}
                      >
                        <MaterialIcons
                          name="delete"
                          size={16}
                          color="#FFFFFF"
                        />
                        <Text style={styles.actionText}>Remove</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.rowSkipButton,
                          (item.matchStatus !== 'matched' || isQueueActionLoading)
                            ? styles.actionDisabled
                            : null,
                        ]}
                        onPress={async () => {
                          try {
                            await fetch(`${process.env.EXPO_PUBLIC_PROXY_BASE_URL || 'http://localhost:3001'}/api/spotify/queue`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ itemId: item.id }),
                            });
                          } catch {}
                        }}
                        disabled={item.matchStatus !== 'matched' || isQueueActionLoading}
                        activeOpacity={0.7}
                      >
                        <MaterialIcons name="play-arrow" size={16} color="#FFFFFF" />
                        <Text style={styles.actionText}>Play</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.rowSkipButton,
                          idx !== 0 || isQueueActionLoading
                            ? styles.actionDisabled
                            : null,
                        ]}
                        onPress={skipSong}
                        disabled={idx !== 0 || isQueueActionLoading}
                        activeOpacity={0.7}
                      >
                        <MaterialIcons
                          name="skip-next"
                          size={16}
                          color="#FFFFFF"
                        />
                        <Text style={styles.actionText}>Skip</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  responsiveRow: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
  },
  column: {
    flexDirection: 'column',
  },
  primaryPanel: {
    paddingHorizontal: 16,
  },
  primaryPortrait: {
    flex: 0,
  },
  primaryLandscape: {
    flex: 2,
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
  chatPanel: {
    paddingHorizontal: 16,
  },
  chatLandscape: {
    flex: 1,
    borderLeftWidth: 1,
    borderLeftColor: '#1F1F1F',
  },
  chatPortrait: {
    marginTop: 24,
  },
  halfPanel: {
    flex: 1,
    paddingBottom: 8,
  },
  chatTitle: {
    marginTop: 8,
  },
  chatStatus: {
    fontFamily: 'Roboto-Medium',
    fontSize: 12,
    color: '#B0B0B0',
    marginBottom: 8,
  },
  chatList: {
    flex: 1,
  },
  chatListContent: {
    gap: 8,
    paddingBottom: 16,
  },
  queueHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 8,
    marginBottom: 8,
  },
  queueTitle: {},
  queueSubTitle: {
    fontFamily: 'Roboto-Regular',
    fontSize: 12,
    color: '#B0B0B0',
    flex: 1,
  },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 4,
    backgroundColor: '#3A3A3A',
    gap: 6,
  },
  skipButtonText: {
    fontFamily: 'Roboto-Medium',
    color: '#FFFFFF',
    fontSize: 12,
  },
  queueError: {
    fontFamily: 'Roboto-Medium',
    fontSize: 12,
    color: '#FF6B6B',
    marginBottom: 6,
  },
  queueList: {
    flex: 1,
  },
  queueListContent: {
    gap: 8,
    paddingBottom: 12,
  },
  queueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#1D1D1D',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2C2C2C',
  },
  queueRowFirst: {
    borderColor: '#03DAC6',
    backgroundColor: 'rgba(3, 218, 198, 0.08)',
  },
  queueIndex: {
    width: 22,
    fontFamily: 'Orbitron-Bold',
    fontSize: 14,
    color: '#B0B0B0',
  },
  queueMain: {
    flex: 1,
    paddingHorizontal: 8,
  },
  queueTitleText: {
    fontFamily: 'Roboto-Medium',
    fontSize: 14,
    color: '#FFFFFF',
  },
  queueByText: {
    fontFamily: 'Roboto-Regular',
    fontSize: 12,
    color: '#B0B0B0',
    marginTop: 2,
  },
  queueActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
    backgroundColor: '#8A2B2B',
  },
  rowSkipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
    backgroundColor: '#2B5F8A',
  },
  actionText: {
    fontFamily: 'Roboto-Medium',
    fontSize: 12,
    color: '#FFFFFF',
  },
  actionDisabled: {
    opacity: 0.5,
  },
});
