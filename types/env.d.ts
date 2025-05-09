declare global {
  namespace NodeJS {
    interface ProcessEnv {
      EXPO_PUBLIC_OBS_WEBSOCKET_URL: string;
      EXPO_PUBLIC_OBS_WEBSOCKET_PASSWORD: string;
      // Add other environment variables here
    }
  }
}

// Ensure this file is treated as a module
export {};