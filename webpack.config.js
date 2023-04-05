//@ts-check

'use strict';

const path = require('path');
const { TsconfigPathsPlugin } = require('tsconfig-paths-webpack-plugin');

/**@type {import('webpack').Configuration}*/
const extension = {
  target: 'node', // vscode extensions run in a Node.js-context 📖 -> https://webpack.js.org/configuration/node/
	mode: 'none', // this leaves the source code as close as possible to the original (when packaging we set this to 'production')

  entry: './core/src/extension.ts', // the entry point of this extension, 📖 -> https://webpack.js.org/configuration/entry-context/
  output: {
    // the bundle is stored in the 'dist' folder (check package.json), 📖 -> https://webpack.js.org/configuration/output/
    path: path.resolve(__dirname, 'dist'),
    filename: 'extension.js',
    libraryTarget: 'commonjs2'
  },
  devtool: 'source-map',
  externals: {
    // the vscode-module is created on-the-fly and must be excluded.
    // Add other modules that cannot be webpack'ed, 📖 -> https://webpack.js.org/configuration/externals/
    vscode: 'commonjs vscode',
    // Use node-pty embedded in vscode since node-pty contains a binary module that depends on the environment
    'node-pty': 'var require.main.require("node-pty")', 
    // vscode-webview only enable in webview
    'vscode-webview': 'var void 0',
    // xterm only enable in webview
    'xterm': 'var void 0',
    'xterm-addon-fit': 'var void 0',
  },
  resolve: {
    // support reading TypeScript and JavaScript files, 📖 -> https://github.com/TypeStrong/ts-loader
    extensions: ['.ts', '.tsx', '.js'],
    plugins: [new TsconfigPathsPlugin({ configFile: path.resolve(__dirname, 'core', 'tsconfig.json') })],
  },
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'ts-loader',
            options: {
              configFile: path.resolve(__dirname, 'core', 'tsconfig.json'),
            },
          },
        ]
      },
    ]
  }
};

const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');

/**@type {import('webpack').Configuration}*/
const webview = {
  target: 'web',
  mode: 'none',
  entry: [
    './webview/src/webview.tsx',
    './webview/src/main.less',
  ],
  output: {
      // the bundle is stored in the 'dist' folder (check package.json), 📖 -> https://webpack.js.org/configuration/output/
      path: path.resolve(__dirname, 'dist', 'webview'),
      filename: 'webview.js',
  },
  devtool: 'source-map',
  externals: {
    // the vscode-module is created on-the-fly and must be excluded.
    // Add other modules that cannot be webpack'ed, 📖 -> https://webpack.js.org/configuration/externals/
    vscode: 'commonjs vscode',
    // vscode-webview produces only typing
    'vscode-webview': 'var void 0',
  },
  resolve: {
    // support reading TypeScript and JavaScript files, 📖 -> https://github.com/TypeStrong/ts-loader
    extensions: ['.ts', '.tsx', '.js'],
    plugins: [new TsconfigPathsPlugin({ configFile: path.resolve(__dirname, 'webview', 'tsconfig.json') })],
  },
  plugins: [
    new MiniCssExtractPlugin(),
  ],
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'ts-loader',
            options: {
              configFile: path.resolve(__dirname, 'webview', 'tsconfig.json'),
            },
          },
        ]
      },
      {
        test: /\.(less|css)$/i,
        use: [
          MiniCssExtractPlugin.loader,
          "css-loader",
          "less-loader",
        ],
      },
      {
        // Embed fonts in snapshot html file
        test: /\.(eot|ttf|woff|svg)$/,
        type: 'asset/inline',
      },
    ]
  },
  optimization: {
    minimize: true,
    minimizer: [
      new CssMinimizerPlugin(),
    ],
  }
};

/**@type {import('webpack').Configuration}*/
const snapshot = {
  target: 'web',
  mode: 'none',
  entry: [
    './snapshot/src/snapshot.tsx',
  ],
  output: {
      // the bundle is stored in the 'dist' folder (check package.json), 📖 -> https://webpack.js.org/configuration/output/
      path: path.resolve(__dirname, 'dist', 'snapshot'),
      filename: 'snapshot.js',
  },
  devtool: 'source-map',
  resolve: {
    // support reading TypeScript and JavaScript files, 📖 -> https://github.com/TypeStrong/ts-loader
    extensions: ['.ts', '.tsx', '.js'],
    plugins: [new TsconfigPathsPlugin({ configFile: path.resolve(__dirname, 'snapshot', 'tsconfig.json') })],
  },
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'ts-loader',
            options: {
              configFile: path.resolve(__dirname, 'snapshot', 'tsconfig.json'),
            },
          },
        ]
      },
    ]
  },
};

module.exports = [
    extension,
    webview,
    snapshot,
];
