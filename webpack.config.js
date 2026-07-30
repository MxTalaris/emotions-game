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
    extensions: ['.tsx', '.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: {
          loader: 'ts-loader',
          options: {
            configFile: path.resolve(__dirname, 'tsconfig.json'),
            compilerOptions: {
              jsx: 'react-jsx',
            },
          },
        },
        exclude: /node_modules/,
      },
      // Inject React Flow CSS via style-loader (must be before asset/source).
      {
        test: /\.css$/,
        include: path.resolve(__dirname, 'node_modules/@xyflow'),
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.css$/,
        exclude: /node_modules/,
        type: 'asset/source',
      },
    ],
  },
  devServer: {
    static: [
      {
        directory: path.join(__dirname, 'dist'),
      },
      {
        directory: path.join(__dirname, 'storage'),
        publicPath: '/storage',
      },
      {
        directory: path.join(__dirname, 'assets'),
        publicPath: '/assets',
      },
    ],
    port: 8080,
    hot: true,
    open: true,
    client: {
      overlay: {
        errors: true,
        warnings: false,
        runtimeErrors: (error) => {
          const message = error?.message ?? String(error ?? '');
          // Benign browser warning often triggered by React Flow layout.
          if (/ResizeObserver loop/i.test(message)) {
            return false;
          }
          return true;
        },
      },
    },
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
      patterns: [
        { from: 'assets', to: 'assets', noErrorOnMissing: true },
        { from: 'storage', to: 'storage', noErrorOnMissing: true },
      ],
    }),
  ],
};
