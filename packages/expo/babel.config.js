module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Required for react-native-paper
      'react-native-paper/babel',
    ],
  };
};
