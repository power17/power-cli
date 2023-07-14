const path = require('path')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')
const HtmlWebpackPlugin = require('html-webpack-plugin')

module.exports = {
  mode: 'production',
  entry: {
    monitor: path.resolve(path.dirname('./'), './src/index.js'),
  },
  output: {
    filename: '[name].js',
    path: path.resolve(path.dirname('./'), './dist'),
  },

  plugins: [
    new CleanWebpackPlugin(),
    new HtmlWebpackPlugin({
      filename: 'index.html',
      template: path.resolve(path.dirname('./'), './examples/index.html'),
      Chunk: ['monitor'],
    }),
  ],
}
