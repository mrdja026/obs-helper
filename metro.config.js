// metro.config.js
const { getDefaultConfig } = require('@expo/metro-config');

const config = getDefaultConfig(__dirname);

// Dev-only symbolicator guard: collapse frames with missing/unknown file
config.symbolicator = {
  customizeFrame(frame) {
    const file = frame?.file;
    if (!file || file === 'unknown') {
      return { collapse: true };
    }
    return {};
  },
};

module.exports = config;
