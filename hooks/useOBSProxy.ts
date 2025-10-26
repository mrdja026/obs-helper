import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Crypto from 'expo-crypto';
import * as Linking from 'expo-linking';
import * as Random from 'expo-random';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

// Define the scene interface
interface OBSScene {
  sceneName: string;
  sceneIndex: number;
}

// Minimal chat types matching backend payloads
interface ChatUser {
  id: string;
  username: string;
  displayName: string;
  color?: string;
  badges?: Array<{ id: string; version?: string }>;
  isMod?: boolean;
  isSubscriber?: boolean;
  isVip?: boolean;
}

interface ChatMessageItem {
  id: string;
  text: string;
  channel: string;
  user: ChatUser;
  timestamp: string;
  isAction?: boolean;
  isHighlighted?: boolean;
}

interface ChatConnectionStatus {
  connected: boolean;
  channel?: string;
  username?: string;
  connectionType?: string;
  lastConnected?: string | null;
  lastDisconnected?: string | null;
  reconnectAttempts?: number;
  error?: string | null;
}

// Song queue types
interface SongQueueItem {
  id: string;
  title: string;
  requestedBy: string;
  requestedAt: number;
  matchStatus?: 'pending' | 'matched' | 'error';
  spotify?: {
    id: string;
    uri: string;
    name: string;
    artists: string[];
    confidence?: number;
  } | null;
  matchError?: string | null;
}

// Storage keys
const STORAGE_KEY_URL = 'obs_websocket_url';
const STORAGE_KEY_PASSWORD = 'obs_websocket_password';
const STORAGE_KEY_AUTO_CONNECT = 'obs_websocket_auto_connect';
const STORAGE_KEY_PASSWORD_PROMPTED = 'obs_websocket_password_prompted';

// Backend proxy configuration
// - On web, use same-origin ('') to avoid mixed-content; proxy handles /api
// - On native, use configured LAN/localhost proxyBaseUrl
const PROXY_BASE_URL =
  Platform.OS === 'web'
    ? ''
    : Constants.expoConfig?.extra?.proxyBaseUrl || 'http://localhost:3001';
const PROXY_WS_URL =
  Platform.OS === 'web'
    ? typeof window !== 'undefined'
      ? window.location.protocol.replace('http', 'ws') +
        '//' +
        window.location.host +
        '/ws'
      : 'ws://127.0.0.1:8443/ws'
    : PROXY_BASE_URL.replace('http', 'ws');
const PROXY_WS_TOKEN: string | undefined = (Constants.expoConfig as any)?.extra
  ?.proxyWsToken;
const DEFAULT_OBS_URL =
  Constants.expoConfig?.extra?.defaultObsUrl || 'ws://127.0.0.1:4456';
const DEFAULT_OBS_PASSWORD =
  Constants.expoConfig?.extra?.defaultObsPassword || '$$$$';

export const useOBSProxy = () => {
  // Connection settings
  const [obsUrl, setObsUrl] = useState(DEFAULT_OBS_URL);
  const [obsPassword, setObsPassword] = useState(DEFAULT_OBS_PASSWORD);
  const [autoConnect, setAutoConnect] = useState(true);

  // Connection state
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Password prompt state
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [passwordPromptError, setPasswordPromptError] = useState<string | null>(
    null
  );

  // OBS data
  const [scenes, setScenes] = useState<OBSScene[]>([]);
  const [currentScene, setCurrentScene] = useState<string>('');
  const [isMicMuted, setIsMicMuted] = useState<boolean | null>(null);
  const [micInputName, setMicInputName] = useState<string | null>(null);
  const [isMicLoading, setIsMicLoading] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessageItem[]>([]);
  const [chatStatus, setChatStatus] = useState<ChatConnectionStatus | null>(
    null
  );
  // Song queue state
  const [songQueue, setSongQueue] = useState<SongQueueItem[]>([]);
  const [songQueueError, setSongQueueError] = useState<string | null>(null);
  const [isQueueActionLoading, setIsQueueActionLoading] = useState(false);

  // Auth guard UI state
  const [authSyncing, setAuthSyncing] = useState(false);
  const [needsReauthKind, setNeedsReauthKind] = useState<
    'none' | 'spotify' | 'twitch'
  >('none');

  // Spotify playback polling state
  const [nowPlaying, setNowPlaying] = useState<{
    name: string;
    uri: string;
    artists: string[];
    durationMs: number | null;
  } | null>(null);
  const [progressMs, setProgressMs] = useState<number | null>(null);
  const [remainingMs, setRemainingMs] = useState<number | null>(null);
  const [hiddenItemId, setHiddenItemId] = useState<string | null>(null);

  // Reconnection timer
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Polling timer for current scene
  const pollingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // WebSocket ref
  const wsRef = useRef<WebSocket | null>(null);

  // Add a ref to track actual connection state
  const isActuallyConnectedRef = useRef(false);
  // Ref to hold latest connect function to avoid TDZ/cycles
  const connectRef = useRef<() => Promise<void>>(async () => {});
  // Guard to auto-skip only once per head item
  const autoSkipHeadIdRef = useRef<string | null>(null);

  // Load saved connection settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const savedUrl = await AsyncStorage.getItem(STORAGE_KEY_URL);
        const savedPassword = await AsyncStorage.getItem(STORAGE_KEY_PASSWORD);
        const savedAutoConnect = await AsyncStorage.getItem(
          STORAGE_KEY_AUTO_CONNECT
        );
        const wasPasswordPrompted = await AsyncStorage.getItem(
          STORAGE_KEY_PASSWORD_PROMPTED
        );

        if (savedUrl) setObsUrl(savedUrl);
        if (savedPassword) setObsPassword(savedPassword);
        if (savedAutoConnect !== null)
          setAutoConnect(savedAutoConnect === 'true');

        // Show password prompt if no password is set and we haven't prompted yet
        if (!savedPassword && wasPasswordPrompted !== 'true') {
          setShowPasswordPrompt(true);
          return; // Don't auto-connect if we need a password
        }

        // Auto connect if enabled
        if (savedAutoConnect === 'true' && Platform.OS !== 'web') {
          setTimeout(() => {
            connect();
          }, 1000);
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    };

    loadSettings();

    // Cleanup function
    return () => {
      disconnect();
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      if (pollingTimerRef.current) {
        clearInterval(pollingTimerRef.current);
      }
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch {}
        wsRef.current = null;
      }
    };
  }, []);

  // Poll Spotify playback progress every 2s and derive remaining time
  useEffect(() => {
    const POLL_INTERVAL_MS = 2000;
    const END_GRACE_MS = 1500;
    let isMounted = true;
    let failureCount = 0;

    const tick = async () => {
      try {
        const response = await fetch(`${PROXY_BASE_URL}/api/spotify/debug`);
        if (!response.ok) throw new Error(`debug ${response.status}`);
        const data = await response.json();
        const playback = data?.playback || null;
        const item = playback?.item || null;
        const progress =
          typeof playback?.progressMs === 'number' ? playback.progressMs : null;
        const duration =
          typeof item?.durationMs === 'number' ? item.durationMs : null;

        if (!isMounted) return;

        if (!item || duration === null || progress === null) {
          setProgressMs(null);
          setRemainingMs(null);
          setHiddenItemId(null);
          failureCount = 0;
          return;
        }

        const rem = Math.max(0, duration - progress);
        setNowPlaying({
          name: typeof item.name === 'string' ? item.name : 'Unknown',
          uri: typeof item.uri === 'string' ? item.uri : '',
          artists: Array.isArray(item.artists) ? item.artists : [],
          durationMs: duration,
        });
        setProgressMs(progress);
        setRemainingMs(rem);

        const head = Array.isArray(songQueue) ? songQueue[0] : undefined;
        const headUri = head?.spotify?.uri;
        const matchesHead = !!headUri && headUri === item.uri;
        setHiddenItemId(
          matchesHead && rem <= END_GRACE_MS ? head?.id ?? null : null
        );

        // Auto-remove from server when head track finishes
        const currentHeadId = head?.id ?? null;
        if (matchesHead && rem <= END_GRACE_MS && currentHeadId) {
          if (autoSkipHeadIdRef.current !== currentHeadId) {
            try {
              const r = await fetch(`${PROXY_BASE_URL}/api/song-queue/skip`, {
                method: 'POST',
              });
              if (r.ok) {
                autoSkipHeadIdRef.current = currentHeadId;
                // Optimistically remove head locally to avoid flicker/mismatch
                setSongQueue((prev) =>
                  Array.isArray(prev) &&
                  prev.length > 0 &&
                  prev[0]?.id === currentHeadId
                    ? prev.slice(1)
                    : prev
                );
                setHiddenItemId(null);
              } else {
                const txt = await r.text().catch(() => '');
                setSongQueueError(
                  `Auto-skip failed: ${r.status}${txt ? ` ${txt}` : ''}`
                );
              }
            } catch {}
          }
        } else {
          // Reset guard when head changes or track not ending
          if (!currentHeadId) {
            autoSkipHeadIdRef.current = null;
          } else if (
            autoSkipHeadIdRef.current &&
            autoSkipHeadIdRef.current !== currentHeadId
          ) {
            autoSkipHeadIdRef.current = null;
          }
        }

        failureCount = 0;
      } catch {
        if (!isMounted) return;
        failureCount += 1;
        if (failureCount > 3) {
          setNowPlaying(null);
          setProgressMs(null);
          setRemainingMs(null);
          setHiddenItemId(null);
        }
      }
    };

    const timer = setInterval(tick, POLL_INTERVAL_MS);
    void tick();
    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, [songQueue]);

  const getProxyBase = useCallback(() => {
    if (Platform.OS === 'web') return '';
    return (
      process.env.EXPO_PUBLIC_PROXY_BASE_URL ||
      (Constants.expoConfig?.extra?.proxyBaseUrl as string) ||
      'http://localhost:3001'
    );
  }, []);
  const connectWebSocket = useCallback(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      // Web uses secure WS via the HTTPS proxy at /ws
    }
    try {
      const wsUrl = PROXY_WS_TOKEN
        ? `${PROXY_WS_URL}?token=${encodeURIComponent(PROXY_WS_TOKEN)}`
        : PROXY_WS_URL;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        // Ask for status to prime state
        ws.send(
          JSON.stringify({
            v: 1,
            type: 'getStatus',
            data: null,
            timestamp: new Date().toISOString(),
          })
        );
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (typeof msg?.type !== 'string') return;
          switch (msg.type) {
            case 'sceneChanged':
              if (msg.data?.sceneName) setCurrentScene(msg.data.sceneName);
              break;
            case 'obsConnectionStatus':
              if (typeof msg.data?.connected === 'boolean') {
                isActuallyConnectedRef.current = msg.data.connected;
                setIsConnected(msg.data.connected);
                if (!msg.data.connected) {
                  // fall back to polling reconnect logic
                  if (autoConnect && !isReconnecting) {
                    setIsReconnecting(true);
                    reconnectTimerRef.current = setTimeout(() => {
                      void connectRef.current();
                    }, 3001);
                  }
                }
              }
              break;
            case 'chatMessage': {
              const message: ChatMessageItem | undefined = msg?.data;
              if (message && typeof message.text === 'string') {
                // Filter out command messages starting with '!'
                const trimmed = message.text.trim();
                if (trimmed.startsWith('!')) {
                  break;
                }
                setChatMessages((prev) => {
                  const next = [...prev, message];
                  return next.length > 200 ? next.slice(-200) : next;
                });
              }
              break;
            }
            case 'chatConnectionStatus': {
              const status: ChatConnectionStatus | undefined = msg?.data;
              if (status && typeof status.connected === 'boolean') {
                setChatStatus(status);
              }
              break;
            }
            case 'chatError': {
              // Optionally surface chat errors in connectionError for visibility
              if (msg?.data?.message && typeof msg.data.message === 'string') {
                setConnectionError((prev) => prev ?? msg.data.message);
              }
              break;
            }
            case 'chatSentMessage': {
              // Optionally reflect sent messages; skip for now or append as self if desired
              break;
            }
            case 'songQueueUpdated': {
              const queue: SongQueueItem[] | undefined = msg?.data?.queue;
              if (Array.isArray(queue)) {
                // Ensure we only keep up to 10 as per backend capacity
                setSongQueue(queue.slice(0, 10));
              }
              break;
            }
            case 'twitchFollow': {
              const name = msg?.data?.displayName || 'Follower';
              try {
                (global as any).__pushOverlayNotification?.({
                  kind: 'follow',
                  name,
                });
              } catch {}
              break;
            }
            case 'twitchSubscribe': {
              const name = msg?.data?.displayName || 'Subscriber';
              try {
                (global as any).__pushOverlayNotification?.({
                  kind: 'sub',
                  name,
                });
              } catch {}
              break;
            }
            default:
              break;
          }
        } catch {}
      };

      ws.onclose = () => {
        wsRef.current = null;
      };
    } catch {}
  }, [autoConnect, isReconnecting]);

  // Save settings when they change
  //Wodo magic this is not how it should be done.
  useEffect(() => {
    let saveTimeout: ReturnType<typeof setTimeout>;
    let isMounted = true;

    const saveSettings = async () => {
      try {
        // Debounce the save operation
        if (saveTimeout) {
          clearTimeout(saveTimeout);
        }

        saveTimeout = setTimeout(async () => {
          if (!isMounted) return;

          try {
            // Save settings in sequence to prevent race conditions
            await AsyncStorage.setItem(STORAGE_KEY_URL, obsUrl);
            await AsyncStorage.setItem(STORAGE_KEY_PASSWORD, obsPassword);
            await AsyncStorage.setItem(
              STORAGE_KEY_AUTO_CONNECT,
              autoConnect.toString()
            );
            console.log('Settings saved successfully');
          } catch (error) {
            console.error('Failed to save settings:', error);
            // Show error to user
            setConnectionError('Failed to save settings. Please try again.');
          }
        }, 500); // 500ms debounce
      } catch (error) {
        console.error('Failed to setup save settings:', error);
        if (isMounted) {
          setConnectionError(
            'Failed to setup settings save. Please try again.'
          );
        }
      }
    };

    saveSettings();

    // Cleanup function
    return () => {
      isMounted = false;
      if (saveTimeout) {
        clearTimeout(saveTimeout);
      }
    };
  }, [obsUrl, obsPassword, autoConnect]);

  // Function declarations
  const fetchScenes = useCallback(async () => {
    if (!isActuallyConnectedRef.current) {
      console.log('Not actually connected, skipping fetchScenes');
      return;
    }

    try {
      console.log('Fetching scenes...');
      const response = await fetch(`${PROXY_BASE_URL}/api/obs/scenes`);
      console.log('Scenes response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to fetch scenes:', errorText);
        throw new Error(
          `HTTP error! status: ${response.status}, body: ${errorText}`
        );
      }

      const data = await response.json();
      console.log('Scenes fetched successfully:', data);
      setScenes(data.scenes);
    } catch (error) {
      console.error('Error fetching scenes:', error);
      if (error instanceof Error) {
        console.error('Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack,
        });
      }
    }
  }, []);

  const fetchSongQueue = useCallback(async () => {
    try {
      setSongQueueError(null);
      const response = await fetch(`${PROXY_BASE_URL}/api/song-queue`);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `HTTP error! status: ${response.status}, body: ${errorText}`
        );
      }
      const data = await response.json();
      const queue: SongQueueItem[] = Array.isArray(data?.queue)
        ? data.queue
        : [];
      setSongQueue(queue.slice(0, 10));
    } catch (error) {
      const message = getErrorMessage(error);
      setSongQueueError(message);
      console.error('Failed to fetch song queue:', message);
    }
  }, []);

  const fetchCurrentScene = useCallback(async () => {
    if (!isActuallyConnectedRef.current) {
      console.log('Not actually connected, skipping fetchCurrentScene');
      return;
    }

    try {
      console.log('Fetching current scene...');
      const response = await fetch(`${PROXY_BASE_URL}/api/obs/scene/current`);
      console.log('Current scene response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to fetch current scene:', errorText);
        throw new Error(
          `HTTP error! status: ${response.status}, body: ${errorText}`
        );
      }

      const data = await response.json();
      console.log('Current scene fetched successfully:', data);
      setCurrentScene(data.currentScene);
    } catch (error) {
      console.error('Error fetching current scene:', error);
      if (error instanceof Error) {
        console.error('Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack,
        });
      }
    }
  }, []);

  const fetchMicStatus = useCallback(async () => {
    if (!isActuallyConnectedRef.current) {
      console.log('Not actually connected, skipping fetchMicStatus');
      return;
    }

    setIsMicLoading(true);
    setMicError(null);

    try {
      console.log('Fetching mic status...');
      const response = await fetch(`${PROXY_BASE_URL}/api/obs/mic/status`);
      console.log('Mic status response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to fetch mic status:', errorText);
        throw new Error(
          `HTTP error! status: ${response.status}, body: ${errorText}`
        );
      }

      const data = await response.json();
      console.log('Mic status fetched successfully:', data);
      setIsMicMuted(
        typeof data.inputMuted === 'boolean' ? data.inputMuted : null
      );
      setMicInputName(
        typeof data.inputName === 'string' ? data.inputName : null
      );
    } catch (error) {
      console.error('Error fetching mic status:', error);
      if (error instanceof Error) {
        setMicError(error.message);
      } else {
        setMicError('Failed to fetch microphone status.');
      }
    } finally {
      setIsMicLoading(false);
    }
  }, []);

  const connect = useCallback(async () => {
    if (isConnected || isConnecting) {
      console.log(
        'Already connected or connecting, skipping connection attempt'
      );
      return;
    }

    setIsConnecting(true);
    setConnectionError(null);

    try {
      // Format the WebSocket URL properly for OBS
      const obsWsUrl = obsUrl.startsWith('ws://') ? obsUrl : `ws://${obsUrl}`;

      console.log('Attempting to connect to OBS proxy...');
      console.log('Proxy URL:', `${PROXY_BASE_URL}/api/obs/connect`);
      console.log('Connection settings:', {
        host: obsWsUrl,
        password: obsPassword,
      });

      const response = await fetch(`${PROXY_BASE_URL}/api/obs/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          host: obsWsUrl,
          password: obsPassword,
        }),
      });

      console.log('Connection response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Connection failed with response:', errorText);

        // Handle specific error cases
        if (response.status === 401 || response.status === 403) {
          setShowPasswordPrompt(true);
          setPasswordPromptError('Invalid password. Please try again.');
          throw new Error('Authentication failed');
        }

        throw new Error(`Connection failed: ${errorText}`);
      }

      console.log('Connection successful');

      // Set both the state and the ref
      setIsConnected(true);
      isActuallyConnectedRef.current = true;

      // Add a small delay to ensure OBS is ready
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Open WS for live updates
      connectWebSocket();

      // Fetch initial data immediately after connection
      try {
        console.log('Fetching initial scenes...');
        await fetchScenes();
        console.log('Fetching initial current scene...');
        await fetchCurrentScene();
        console.log('Fetching initial mic status...');
        await fetchMicStatus();
        console.log('Fetching initial song queue...');
        await fetchSongQueue();
      } catch (error) {
        console.error('Error fetching initial data:', error);
        // Don't disconnect on fetch error, just log it
        // The polling will retry automatically
      }

      // Start polling for current scene
      console.log('Starting scene polling...');
      pollingTimerRef.current = setInterval(fetchCurrentScene, 1000);
    } catch (error) {
      console.error('Connection failed with error:', error);
      if (error instanceof Error) {
        console.error('Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack,
        });
      }

      // Set a more user-friendly error message
      let errorMessage = 'Failed to connect to OBS. ';
      if (error instanceof Error) {
        if (error.message.includes('ECONNREFUSED')) {
          errorMessage +=
            'Please check if OBS is running and the WebSocket server is enabled.';
        } else if (error.message.includes('ETIMEDOUT')) {
          errorMessage +=
            'Connection timed out. Please check your network connection.';
        } else if (error.message.includes('Invalid URL')) {
          errorMessage +=
            'Invalid OBS WebSocket URL. Please check your settings.';
        } else {
          errorMessage += error.message;
        }
      }
      setConnectionError(errorMessage);
      setIsConnected(false);
      isActuallyConnectedRef.current = false;
      setIsMicMuted(null);
      setMicInputName(null);
      setMicError(
        error instanceof Error
          ? error.message
          : 'Failed to connect to microphone.'
      );
      setIsMicLoading(false);

      if (autoConnect && !isReconnecting) {
        console.log('Auto-connect enabled, scheduling reconnection...');
        setIsReconnecting(true);
        reconnectTimerRef.current = setTimeout(() => {
          connect();
        }, 3001);
      }
    } finally {
      setIsConnecting(false);
      setIsReconnecting(false);
    }
  }, [
    obsUrl,
    obsPassword,
    isConnected,
    isConnecting,
    autoConnect,
    isReconnecting,
    fetchScenes,
    fetchCurrentScene,
    fetchMicStatus,
  ]);

  // Keep ref updated with latest connect function
  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  const handlePasswordSave = useCallback(
    async (password: string, remember: boolean) => {
      setObsPassword(password);
      setShowPasswordPrompt(false);
      setPasswordPromptError(null);

      if (remember) {
        await AsyncStorage.setItem(STORAGE_KEY_PASSWORD, password);
      }
      await AsyncStorage.setItem(STORAGE_KEY_PASSWORD_PROMPTED, 'true');

      // Try to connect with the new password
      connect();
    },
    [connect]
  );

  const handlePasswordCancel = useCallback(() => {
    setShowPasswordPrompt(false);
    setPasswordPromptError(null);
  }, []);

  const disconnect = useCallback(() => {
    console.log('Disconnecting from OBS...');
    if (pollingTimerRef.current) {
      clearInterval(pollingTimerRef.current);
      pollingTimerRef.current = null;
    }
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    setIsConnected(false);
    isActuallyConnectedRef.current = false;
    setConnectionError(null);
    setIsMicMuted(null);
    setMicInputName(null);
    setMicError(null);
    setIsMicLoading(false);
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {}
      wsRef.current = null;
    }
  }, []);

  const toggleMic = useCallback(async () => {
    if (!isActuallyConnectedRef.current) {
      console.log('Not actually connected, skipping toggleMic');
      return;
    }

    setIsMicLoading(true);
    setMicError(null);

    try {
      console.log('Toggling mic...');
      const response = await fetch(`${PROXY_BASE_URL}/api/obs/mic/toggle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('Mic toggle response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to toggle mic:', errorText);
        throw new Error(
          `HTTP error! status: ${response.status}, body: ${errorText}`
        );
      }

      const data = await response.json();
      console.log('Mic toggled successfully:', data);
      setIsMicMuted(
        typeof data.inputMuted === 'boolean' ? data.inputMuted : null
      );
      setMicInputName(
        typeof data.inputName === 'string' ? data.inputName : null
      );
    } catch (error) {
      console.error('Error toggling mic:', error);
      if (error instanceof Error) {
        setMicError(error.message);
      } else {
        setMicError('Failed to toggle microphone.');
      }
    } finally {
      setIsMicLoading(false);
    }
  }, []);

  const switchScene = useCallback(
    async (sceneName: string) => {
      if (!isConnected) {
        console.log('Not connected, skipping scene switch');
        return;
      }

      try {
        console.log('Switching to scene:', sceneName);
        const response = await fetch(`${PROXY_BASE_URL}/api/obs/scene/change`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ sceneName }),
        });

        console.log('Scene switch response status:', response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Failed to switch scene:', errorText);
          throw new Error(
            `HTTP error! status: ${response.status}, body: ${errorText}`
          );
        }

        console.log('Scene switched successfully');
        await fetchCurrentScene();
      } catch (error) {
        console.error('Error switching scene:', error);
        if (error instanceof Error) {
          console.error('Error details:', {
            name: error.name,
            message: error.message,
            stack: error.stack,
          });
        }
      }
    },
    [isConnected, fetchCurrentScene]
  );

  const removeSong = useCallback(async (index1Based: number) => {
    if (!Number.isFinite(index1Based) || index1Based < 1) return;
    setIsQueueActionLoading(true);
    setSongQueueError(null);
    try {
      // Preflight Twitch status for admin-protected queue actions
      setAuthSyncing(true);
      try {
        const s = await fetch(`${PROXY_BASE_URL}/api/twitch/status`);
        const sd = await s.json().catch(() => ({}));
        if (!sd?.authenticated) {
          // Try bootstrap first if fallback available
          if (sd?.method === 'token_fallback') {
            await fetch(`${PROXY_BASE_URL}/api/twitch/auth/bootstrap`, {
              method: 'POST',
              credentials: 'include',
            }).catch(() => {});
            const s2 = await fetch(`${PROXY_BASE_URL}/api/twitch/status`);
            const sd2 = await s2.json().catch(() => ({}));
            if (sd2?.authenticated) {
              // ok
            } else {
              await fetch(`${PROXY_BASE_URL}/api/twitch/refresh`, {
                method: 'POST',
              }).catch(() => {});
              const s3 = await fetch(`${PROXY_BASE_URL}/api/twitch/status`);
              const sd3 = await s3.json().catch(() => ({}));
              if (!sd3?.authenticated) {
                setNeedsReauthKind('twitch');
                throw new Error(
                  'Twitch not authenticated. Please re-auth and try again.'
                );
              }
            }
          } else {
            // No session and no fallback; try refresh then re-check
            await fetch(`${PROXY_BASE_URL}/api/twitch/refresh`, {
              method: 'POST',
            }).catch(() => {});
            const s2 = await fetch(`${PROXY_BASE_URL}/api/twitch/status`);
            const sd2 = await s2.json().catch(() => ({}));
            if (!sd2?.authenticated) {
              setNeedsReauthKind('twitch');
              throw new Error(
                'Twitch not authenticated. Please re-auth and try again.'
              );
            }
          }
        }
      } finally {
        setAuthSyncing(false);
      }

      const response = await fetch(
        `${PROXY_BASE_URL}/api/song-queue/${index1Based}`,
        {
          method: 'DELETE',
        }
      );
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Remove failed: ${response.status} ${errorText}`);
      }
      // No need to manually update; WS will broadcast update
    } catch (error) {
      const message = getErrorMessage(error);
      setSongQueueError(message);
      console.error('Failed to remove song:', message);
    } finally {
      setIsQueueActionLoading(false);
    }
  }, []);

  const skipSong = useCallback(async () => {
    setIsQueueActionLoading(true);
    setSongQueueError(null);
    try {
      // Preflight Twitch status for admin-protected queue actions
      setAuthSyncing(true);
      try {
        const s = await fetch(`${PROXY_BASE_URL}/api/twitch/status`);
        const sd = await s.json().catch(() => ({}));
        if (!sd?.authenticated) {
          if (sd?.method === 'token_fallback') {
            await fetch(`${PROXY_BASE_URL}/api/twitch/auth/bootstrap`, {
              method: 'POST',
              credentials: 'include',
            }).catch(() => {});
            const s2 = await fetch(`${PROXY_BASE_URL}/api/twitch/status`);
            const sd2 = await s2.json().catch(() => ({}));
            if (!sd2?.authenticated) {
              await fetch(`${PROXY_BASE_URL}/api/twitch/refresh`, {
                method: 'POST',
              }).catch(() => {});
              const s3 = await fetch(`${PROXY_BASE_URL}/api/twitch/status`);
              const sd3 = await s3.json().catch(() => ({}));
              if (!sd3?.authenticated) {
                setNeedsReauthKind('twitch');
                throw new Error(
                  'Twitch not authenticated. Please re-auth and try again.'
                );
              }
            }
          } else {
            await fetch(`${PROXY_BASE_URL}/api/twitch/refresh`, {
              method: 'POST',
            }).catch(() => {});
            const s2 = await fetch(`${PROXY_BASE_URL}/api/twitch/status`);
            const sd2 = await s2.json().catch(() => ({}));
            if (!sd2?.authenticated) {
              setNeedsReauthKind('twitch');
              throw new Error(
                'Twitch not authenticated. Please re-auth and try again.'
              );
            }
          }
        }
      } finally {
        setAuthSyncing(false);
      }

      const response = await fetch(`${PROXY_BASE_URL}/api/song-queue/skip`, {
        method: 'POST',
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Skip failed: ${response.status} ${errorText}`);
      }
      // WS will broadcast update
    } catch (error) {
      const message = getErrorMessage(error);
      setSongQueueError(message);
      console.error('Failed to skip song:', message);
    } finally {
      setIsQueueActionLoading(false);
    }
  }, []);

  const playSong = useCallback(async (itemId: string) => {
    if (!itemId) return false;
    setIsQueueActionLoading(true);
    setSongQueueError(null);
    try {
      // Preflight Spotify status and try silent refresh if needed
      setAuthSyncing(true);
      let healthy = false;
      try {
        const s = await fetch(`${PROXY_BASE_URL}/api/spotify/status`);
        const sd = await s.json().catch(() => ({}));
        healthy = !!sd?.authenticated;
        if (!healthy) {
          const r = await fetch(`${PROXY_BASE_URL}/api/spotify/refresh`, {
            method: 'POST',
          });
          if (r.ok) {
            const s2 = await fetch(`${PROXY_BASE_URL}/api/spotify/status`);
            const sd2 = await s2.json().catch(() => ({}));
            healthy = !!sd2?.authenticated;
          }
        }
      } finally {
        setAuthSyncing(false);
      }
      if (!healthy) {
        setNeedsReauthKind('spotify');
        throw new Error(
          'Spotify not authenticated. Please re-auth and try again.'
        );
      }

      const response = await fetch(`${PROXY_BASE_URL}/api/spotify/queue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId }),
      });

      if (response.status === 409) {
        let body: any = null;
        try {
          body = await response.json();
        } catch {}
        if (body?.error === 'no_active_device') {
          setSongQueueError('Open Spotify on any device and try again.');
        } else if (body?.error === 'not_matched') {
          setSongQueueError('Song is not matched yet.');
        } else {
          setSongQueueError('Playback not possible right now.');
        }
        return false;
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Play failed: ${response.status} ${errorText}`);
      }

      return true;
    } catch (error) {
      const message = getErrorMessage(error);
      setSongQueueError(message);
      return false;
    } finally {
      setIsQueueActionLoading(false);
    }
  }, []);

  // Re-auth helpers
  const base64Url = (input: string) =>
    input.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const makeVerifier = async (): Promise<string> => {
    const bytes = await Random.getRandomBytesAsync(64);
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    let out = '';
    for (let i = 0; i < bytes.length; i++)
      out += chars[bytes[i] % chars.length];
    return out;
  };

  const reauthSpotify = useCallback(async () => {
    try {
      const redirectUri =
        Platform.OS === 'web'
          ? 'https://127.0.0.1:8443/oauthredirect'
          : 'obshelper://oauthredirect';
      const clientId =
        process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID ||
        (Constants.expoConfig?.extra?.spotifyClientId as string) ||
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
        window.location.href = authUrl;
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
            const proxyBase = getProxyBase();
            await fetch(`${proxyBase}/api/spotify/auth/exchange`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                code,
                codeVerifier: verifier,
                redirectUri,
              }),
            });
            setNeedsReauthKind('none');
            await fetchSongQueue();
          }
        }
      }
    } catch {}
  }, [getProxyBase, fetchSongQueue]);

  const reauthTwitch = useCallback(async () => {
    const base = getProxyBase();
    const url = `${base}/api/twitch/auth`;
    if (Platform.OS === 'web') {
      window.location.href = url;
      return;
    }
    try {
      await WebBrowser.openAuthSessionAsync(url);
      setNeedsReauthKind('none');
    } catch {}
  }, [getProxyBase]);

  const clearAuthData = useCallback(
    async (kind: 'spotify' | 'twitch') => {
      const base = getProxyBase();
      try {
        if (kind === 'spotify') {
          await fetch(`${base}/api/spotify/clear-tokens`, { method: 'POST' });
          if (Platform.OS === 'web') {
            try {
              sessionStorage.removeItem('spotify_pkce_verifier');
              sessionStorage.removeItem('spotify_redirect_uri');
            } catch {}
            try {
              localStorage.removeItem('spotify_pkce_verifier');
              localStorage.removeItem('spotify_redirect_uri');
            } catch {}
          }
        } else {
          await fetch(`${base}/api/twitch/auth/logout`, { method: 'GET' });
        }
      } finally {
        setNeedsReauthKind('none');
      }
    },
    [getProxyBase]
  );

  // Helper function to get error message
  const getErrorMessage = (error: any): string => {
    if (error instanceof Error) {
      return error.message;
    }
    return 'An unknown error occurred';
  };

  return {
    isConnected,
    isConnecting,
    isReconnecting,
    connectionError,
    authSyncing,
    needsReauthKind,
    setNeedsReauthKind,
    scenes,
    currentScene,
    obsUrl,
    setObsUrl,
    obsPassword,
    setObsPassword,
    autoConnect,
    setAutoConnect,
    connect,
    disconnect,
    switchScene,
    fetchMicStatus,
    toggleMic,
    isMicMuted,
    isMicLoading,
    micInputName,
    micError,
    chatMessages,
    chatStatus,
    songQueue,
    songQueueError,
    isQueueActionLoading,
    removeSong,
    skipSong,
    playSong,
    nowPlaying,
    remainingMs,
    hiddenItemId,
    reauthSpotify,
    reauthTwitch,
    clearAuthData,
    showPasswordPrompt,
    setShowPasswordPrompt,
    passwordPromptError,
    handlePasswordSave,
    handlePasswordCancel,
  };
};
