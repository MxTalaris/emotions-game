const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const { mountDataApi } = require('./dev/dataApi');

module.exports = {
  entry: {
    main: './src/main.ts',
    admin: './src/admin/main.ts',
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].bundle.js',
    clean: true,
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        type: 'asset/source',
      },
    ],
  },
  devServer: {
    static: {
      directory: path.join(__dirname, 'dist'),
    },
    port: 8080,
    hot: true,
    open: true,
    setupMiddlewares: (middlewares, devServer) => {
      if (!devServer.app) {
        throw new Error('webpack-dev-server app is missing');
      }
      mountDataApi(devServer.app);
      return middlewares;
    },
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './index.html',
      filename: 'index.html',
      chunks: ['main'],
    }),
    new HtmlWebpackPlugin({
      template: './admin.html',
      filename: 'admin.html',
      chunks: ['admin'],
    }),
    new CopyWebpackPlugin({
      patterns: [{ from: 'assets', to: 'assets', noErrorOnMissing: true }],
    }),
  ],
};
