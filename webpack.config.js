const path = require('path');
const { cleanWebpackPlugin } = require('clean-webpack-plugin');

module.exports = {
  mode: 'production',
  entry: {
    monitor: path.resolve(path.dirname(), './monitor.js'),
  },
  output: {
    filename: '[name].js',
    path: path.resolve(path.dirname(), './dist'),
  },
  plugins: [new cleanWebpackPlugin()],
};
