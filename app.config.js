export default {
    expo: {
        name: "obs_helper",
        slug: "obs_helper",
        version: "1.0.0",
        orientation: "portrait",
        icon: "./assets/icon.png",
        userInterfaceStyle: "light",
        splash: {
            image: "./assets/splash.png",
            resizeMode: "contain",
            backgroundColor: "#ffffff"
        },
        assetBundlePatterns: [
            "**/*"
        ],
        ios: {
            supportsTablet: true
        },
        android: {
            adaptiveIcon: {
                foregroundImage: "./assets/adaptive-icon.png",
                backgroundColor: "#ffffff"
            }
        },
        web: {
            favicon: "./assets/favicon.png"
        },
        extra: {
            proxyBaseUrl: 'http://192.168.0.234:3001',
            defaultObsUrl: 'ws://127.0.0.1:4456',
            defaultObsPassword: process.env.OBS_PASSWORD || ''
        }
    }
}; 