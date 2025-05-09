import { useState, useEffect, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import OBSWebSocket from 'obs-websocket-js';

// Define the scene interface
interface OBSScene {
  sceneName: string;
  sceneIndex: number;
}

// Storage keys
const STORAGE_KEY_URL = 'obs_websocket_url';
const STORAGE_KEY_PASSWORD = 'obs_websocket_password';
const STORAGE_KEY_AUTO_CONNECT = 'obs_websocket_auto_connect';

export function useOBSWebSocket() {
  // Connection settings
  const [websocketUrl, setWebsocketUrl] = useState('ws://192.168.0.234:4456');
  const [websocketPassword, setWebsocketPassword] = useState('');
  const [autoConnect, setAutoConnect] = useState(true);

  // Connection state
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // OBS data
  const [scenes, setScenes] = useState<OBSScene[]>([]);
  const [currentScene, setCurrentScene] = useState<string>('');

  // Create a ref for the OBS WebSocket instance
  const obsRef = useRef<OBSWebSocket | null>(null);

  // Reconnection timer
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load saved connection settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const savedUrl = await AsyncStorage.getItem(STORAGE_KEY_URL);
        const savedPassword = await AsyncStorage.getItem(STORAGE_KEY_PASSWORD);
        const savedAutoConnect = await AsyncStorage.getItem(STORAGE_KEY_AUTO_CONNECT);

        if (savedUrl) setWebsocketUrl(savedUrl);
        if (savedPassword) setWebsocketPassword(savedPassword);
        if (savedAutoConnect !== null) setAutoConnect(savedAutoConnect === 'true');

        // Auto connect if enabled
        if (savedAutoConnect === 'true' && Platform.OS !== 'web') {
          // Delay auto-connect to ensure UI is ready
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
    };
  }, []);

  // Save settings when they change
  useEffect(() => {
    const saveSettings = async () => {
      try {
        await AsyncStorage.setItem(STORAGE_KEY_URL, websocketUrl);
        await AsyncStorage.setItem(STORAGE_KEY_PASSWORD, websocketPassword);
        await AsyncStorage.setItem(STORAGE_KEY_AUTO_CONNECT, autoConnect.toString());
      } catch (error) {
        console.error('Failed to save settings:', error);
      }
    };

    saveSettings();
  }, [websocketUrl, websocketPassword, autoConnect]);

  // Function to fetch scenes
  const fetchScenes = useCallback(async () => {
    if (!obsRef.current) {
      console.log('Cannot fetch scenes: OBS ref not available');
      return;
    }

    if (!isConnected) {
      console.log('Cannot fetch scenes: OBS not connected');
      return;
    }

    try {
      console.log('Attempting to fetch scenes...');
      const response = await obsRef.current.call('GetSceneList');
      console.log('Raw GetSceneList response:', JSON.stringify(response, null, 2));

      if (!response) {
        console.log('No response received from GetSceneList');
        return;
      }

      if (!response.scenes) {
        console.log('No scenes array in response:', response);
        return;
      }

      console.log('Number of scenes received:', response.scenes.length);

      const formattedScenes: OBSScene[] = response.scenes.map((scene: any) => {
        console.log('Processing scene:', scene);
        return {
          sceneName: scene.sceneName,
          sceneIndex: scene.sceneIndex
        };
      });

      console.log('Final formatted scenes:', formattedScenes);
      setScenes(formattedScenes);

      // Get current scene
      console.log('Fetching current scene...');
      const currentSceneResponse = await obsRef.current.call('GetCurrentProgramScene');
      console.log('Current scene response:', JSON.stringify(currentSceneResponse, null, 2));

      if (currentSceneResponse && currentSceneResponse.currentProgramSceneName) {
        console.log('Setting current scene to:', currentSceneResponse.currentProgramSceneName);
        setCurrentScene(currentSceneResponse.currentProgramSceneName);
      } else {
        console.log('No current scene name in response');
      }
    } catch (error) {
      console.error('Failed to fetch scenes. Error details:', error);
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      setConnectionError(getErrorMessage(error));
      throw error;
    }
  }, [isConnected]);

  // Connect to OBS WebSocket
  const connect = useCallback(async () => {
    if (isConnected || isConnecting) {
      console.log('Already connected or connecting, skipping connection attempt');
      return;
    }

    setIsConnecting(true);
    setConnectionError(null);

    if (!obsRef.current) {
      console.log('Creating new OBS WebSocket instance');
      obsRef.current = new OBSWebSocket();
    }

    try {
      console.log('Attempting to connect to:', websocketUrl);
      await obsRef.current.connect(websocketUrl, websocketPassword);
      console.log('Connected, now calling GetVersion...');
      const version = await obsRef.current.call('GetVersion');
      console.log('OBS Version:', version);
      setIsConnected(true);

      // Set up event listeners before setting isConnected
      obsRef.current.on('ConnectionClosed', () => {
        console.log('OBS WebSocket connection closed');
        setIsConnected(false);
        if (autoConnect && !isReconnecting) {
          console.log('Attempting to reconnect...');
          setIsReconnecting(true);
          reconnectTimerRef.current = setTimeout(() => {
            connect();
          }, 3000) as unknown as NodeJS.Timeout;
        }
      });

      obsRef.current.on('CurrentProgramSceneChanged', (data) => {
        console.log('Scene changed event received:', data);
        setCurrentScene(data.sceneName);
      });

      // Add connection error listener
      obsRef.current.on('ConnectionError', (error) => {
        console.error('OBS WebSocket connection error:', error);
        setConnectionError(getErrorMessage(error));
      });

      // Now try to fetch scenes
      console.log('Fetching initial scenes...');
      try {
        await fetchScenes();
      } catch (fetchError) {
        console.error('Error during initial scene fetch:', fetchError);
        if (fetchError instanceof Error) {
          console.error('Fetch error message:', fetchError.message);
          console.error('Fetch error stack:', fetchError.stack);
        }
        setConnectionError(getErrorMessage(fetchError));
      }
    } catch (error) {
      console.error('Connection failed. Error details:', error);
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      setConnectionError(getErrorMessage(error));
      setIsConnected(false);
    } finally {
      setIsConnecting(false);
      setIsReconnecting(false);
    }
  }, [websocketUrl, websocketPassword, isConnected, isConnecting, autoConnect, isReconnecting, fetchScenes]);

  // Disconnect from OBS WebSocket
  const disconnect = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    if (obsRef.current) {
      try {
        obsRef.current.disconnect();
      } catch (error) {
        console.error('Disconnect error:', error);
      }

      setIsConnected(false);
      setConnectionError(null);
    }
  }, []);

  // Switch to a different scene
  const switchScene = useCallback(async (sceneName: string) => {
    if (!obsRef.current || !isConnected) return;

    try {
      await obsRef.current.call('SetCurrentProgramScene', {
        sceneName,
      });
      // The current scene will be updated via the event listener
    } catch (error) {
      console.error('Failed to switch scene:', error);
      setConnectionError(getErrorMessage(error));
    }
  }, [isConnected]);

  // Toggle source visibility
  const toggleSourceVisibility = useCallback(async (sourceName: string, visible: boolean) => {
    if (!obsRef.current || !isConnected) return;

    try {
      await obsRef.current.call('SetSceneItemEnabled', {
        sceneName: currentScene,
        sceneItemId: await getSceneItemId(sourceName),
        sceneItemEnabled: visible
      });
    } catch (error) {
      console.error('Failed to toggle source:', error);
      setConnectionError(getErrorMessage(error));
    }
  }, [isConnected, currentScene]);

  // Helper function to get scene item ID
  const getSceneItemId = async (sourceName: string): Promise<number> => {
    if (!obsRef.current) throw new Error('OBS not connected');

    const { sceneItems } = await obsRef.current.call('GetSceneItemList', {
      sceneName: currentScene
    });

    const item = sceneItems.find((item: any) => item.sourceName === sourceName);
    if (!item) throw new Error(`Source "${sourceName}" not found in scene "${currentScene}"`);

    return Number(item.sceneItemId);
  };

  // Helper function to extract error message
  const getErrorMessage = (error: any): string => {
    if (typeof error === 'string') return error;
    if (error.message) return error.message;
    return 'Unknown error occurred';
  };

  return {
    // Connection settings
    websocketUrl,
    setWebsocketUrl,
    websocketPassword,
    setWebsocketPassword,
    autoConnect,
    setAutoConnect,

    // Connection state
    isConnected,
    isConnecting,
    isReconnecting,
    connectionError,

    // OBS data
    scenes,
    currentScene,

    // Methods
    connect,
    disconnect,
    switchScene,
    toggleSourceVisibility,
    refreshScenes: fetchScenes,
  };
}