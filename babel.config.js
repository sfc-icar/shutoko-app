module.exports = function (api) {
    api.cache(true);
    return {
        presets: ['babel-preset-expo'],
        plugins: [
            'react-native-worklets-core/plugin',
            'react-native-reanimated/plugin', // react-native-reanimatedのプラグイン（最後に配置）
        ],
    };
};