
const path = require('path');
const webpack = require('webpack');
const CopyPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

module.exports = (env, argv) => {
    const isProd = argv && argv.mode === 'production';

    return {
        mode: isProd ? 'production' : 'development',
        devtool: isProd ? false : 'source-map',

        // Multiple entry points for the extension
        entry: {
            content_script: path.resolve(__dirname, 'content_script.js'),
            background: path.resolve(__dirname, 'background.js'),
            popup: path.resolve(__dirname, 'popup.js'),
            options: path.resolve(__dirname, 'options.js'),
            'exercise/exercise': path.resolve(__dirname, 'exercise', 'exercise.js'),
            'stats/stats': path.resolve(__dirname, 'stats', 'stats.js')
        },

        output: {
            path: path.resolve(__dirname, 'dist'),
            filename: '[name].js',
            clean: false, // we use CleanWebpackPlugin explicitly
        },

        module: {
            rules: [
                // Extract CSS referenced by JS imports
                {
                    test: /\.css$/i,
                    use: [MiniCssExtractPlugin.loader, 'css-loader']
                },
                // Asset handling for images/icons
                {
                    test: /\.(png|jpe?g|gif|svg)$/i,
                    type: 'asset/resource',
                    generator: {
                        filename: 'icons/[name][ext]'
                    }
                }
            ]
        },

        plugins: [
            new CleanWebpackPlugin(),
            new MiniCssExtractPlugin({ filename: '[name].css' }),

            // Copy static files needed by the extension
            new CopyPlugin({
                patterns: [
                    { from: 'manifest.json', to: '.' },
                    { from: 'popup.html', to: '.' },
                    { from: 'options.html', to: '.' },
                    { from: 'exercise/exercise.html', to: 'exercise/' },
                    { from: 'stats/stats.html', to: 'stats/' },
                    // { from: 'exercise/exercise.css', to: 'exercise/' },
                    { from: 'icons', to: 'icons' },
                    { from: 'service', to: 'service' },
                    // copy any top-level CSS that may be used directly
                    // { from: 'content_styles.css', to: '.', noErrorOnMissing: true },
                    // { from: 'options.css', to: '.', noErrorOnMissing: true }
                ]
            })
        ],

        resolve: {
            extensions: ['.js', '.json']
        },

        // Development server (useful during development). It writes built files to disk
        // so you can load the extension from the `dist/` folder while developing.


        optimization: {
            // Keep each entry separate - don't split into chunks shared across entries
            splitChunks: false
        },

        performance: { hints: 'warning' }
    };
};