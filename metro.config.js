// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// .tflite をアセット（画像などと同じ扱い）として追加
config.resolver.assetExts.push('tflite');

module.exports = config;