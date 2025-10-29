const path = require("path");
const webpack = require("webpack");
const CopyPlugin = require("copy-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");

module.exports = (env, argv) => {
  const isProd = argv && argv.mode === "production";

  return {
    mode: isProd ? "production" : "development",
    devtool: isProd ? false : "source-map",

    // Multiple entry points for the extension
    entry: {
      "pages/content_script": path.resolve(
        __dirname,
        "src",
        "pages",
        "content_script.js"
      ),
      "pages/background": path.resolve(
        __dirname,
        "src",
        "pages",
        "background.js"
      ),
      "pages/popup": path.resolve(__dirname, "src", "pages", "popup.js"),
      "pages/options": path.resolve(__dirname, "src", "pages", "options.js"),
      "exercise/exercise": path.resolve(
        __dirname,
        "src",
        "exercise",
        "exercise.js"
      ),
      "stats/stats": path.resolve(__dirname, "src", "stats", "stats.js"),
    },

    output: {
      path: path.resolve(__dirname, "dist"),
      filename: "[name].js",
      clean: false, // we use CleanWebpackPlugin explicitly
    },

    module: {
      rules: [
        // Extract CSS referenced by JS imports
        {
          test: /\.css$/i,
          use: [MiniCssExtractPlugin.loader, "css-loader"],
        },
        // Asset handling for images/icons
        {
          test: /\.(png|jpe?g|gif|svg)$/i,
          type: "asset/resource",
          generator: {
            filename: "icons/[name][ext]",
          },
        },
      ],
    },

    plugins: [
      new CleanWebpackPlugin(),
      new MiniCssExtractPlugin({ filename: "[name].css" }),

      // Copy static files needed by the extension
      new CopyPlugin({
        patterns: [
          { from: "manifest.json", to: "." },
          { from: "src/pages/popup.html", to: "pages/" },
          { from: "src/pages/options.html", to: "pages/" },
          { from: "src/exercise/exercise.html", to: "exercise/" },
          { from: "src/stats/stats.html", to: "stats/" },
          { from: "icons", to: "icons" },
          { from: "src/service", to: "service" },
          { from: "src/styles", to: "styles" },
          { from: "src/templates", to: "templates" },
          { from: "src/shared", to: "shared" },
          { from: "src/content", to: "content" },
        ],
      }),
    ],

    resolve: {
      extensions: [".js", ".json"],
    },

    // Development server (useful during development). It writes built files to disk
    // so you can load the extension from the `dist/` folder while developing.

    optimization: {
      // Keep each entry separate - don't split into chunks shared across entries
      splitChunks: false,
    },

    performance: { hints: "warning" },
  };
};
