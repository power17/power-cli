const path = require('path');
module.exports = {
  mode: 'production',
  entry: {
    monitor: path.resolve(__dirname, './monitor.js'),
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, './dist'),
  },
};
