export default {
  expo: {
    name: 'obs_helper',
    slug: 'obs_helper',
    version: '1.0.0',
    orientation: 'portrait',
    // Use existing assets under ./assets/images
    icon: './assets/images/icon.png',
    scheme: 'obshelper',
    userInterfaceStyle: 'light',
    splash: {
      // Fallback to the same icon until a dedicated splash is provided
      image: './assets/images/icon.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTablet: true,
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/images/icon.png',
        backgroundColor: '#ffffff',
      },
    },
    web: {
      bundler: 'metro',
      output: 'single',
      favicon: './assets/images/favicon.png',
    },
    plugins: ['expo-router'],
    experiments: {
      typedRoutes: true,
    },
    extra: {
      proxyBaseUrl:
        process.env.EXPO_PUBLIC_PROXY_BASE_URL ||
        process.env.PUBLIC_BASE_URL ||
        'https://localhost:3001',
      defaultObsUrl: 'ws://127.0.0.1:4456',
      defaultObsPassword: process.env.OBS_PASSWORD || '',
    },
  },
};
