const merge = require("webpack-merge");
const common = require("./webpack.common.js");

const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const ManifestPlugin = require("webpack-manifest-plugin");
const CleanWebpackPlugin = require("clean-webpack-plugin");
const OptimizeCssAssetsPlugin = require("optimize-css-assets-webpack-plugin");
const ExtractTextPlugin = require("extract-text-webpack-plugin");

module.exports = merge(common, {
  mode: "production",
  plugins: [
    new CleanWebpackPlugin(["dist"]),
    new HtmlWebpackPlugin({
      inject: true,
      chunks: ["main", "main~restaurantInfo"],
      filename: "index.html",
      minify: {
        removeComments: true,
        collapseWhitespace: true,
        removeRedundantAttributes: true,
        useShortDoctype: true,
        removeEmptyAttributes: true,
        removeStyleLinkTypeAttributes: true,
        keepClosingSlash: true,
        minifyJS: true,
        minifyCSS: true,
        minifyURLs: true
      },
      template: "./src/index.html"
    }),
    new HtmlWebpackPlugin({
      inject: true,
      chunks: ["restaurantInfo", "main~restaurantInfo"],
      filename: "restaurant.html",
      minify: {
        removeComments: true,
        collapseWhitespace: true,
        removeRedundantAttributes: true,
        useShortDoctype: true,
        removeEmptyAttributes: true,
        removeStyleLinkTypeAttributes: true,
        keepClosingSlash: true,
        minifyJS: true,
        minifyCSS: true,
        minifyURLs: true
      },
      template: "./src/restaurant.html"
    }),
    new ManifestPlugin({
      fileName: "asset-manifest.json"
    }),
    new ExtractTextPlugin("styles.css"),
    new OptimizeCssAssetsPlugin({
      assetNameRegExp: /\.optimize\.css$/g,
      cssProcessor: require("cssnano"),
      cssProcessorOptions: { discardComments: { removeAll: true } },
      canPrint: true
    })
  ],
  module: {
    rules: [
      {
        test: /\.css$/,
        loader: ExtractTextPlugin.extract([
          {
            loader: "css-loader",
            options: {
              sourceMap: false,
              minimize: true
            }
          }
        ])
      },
      // {
      //   test: /\.(gif|png|jpe?g|svg)$/i,
      //   use: [
      //     "file-loader",
      //     {
      //       loader: "image-webpack-loader",
      //       options: {
      //         bypassOnDebug: true
      //       }
      //     }
      //   ]
      // },
      {
        test: /\.(jpg|png)$/i,
        use: [
          {
            loader: "responsive-loader",
            options: {
              // If you want to enable sharp support:
              adapter: require("responsive-loader/sharp"),
              sizes: [300, 600]
            }
          }
        ]
      }
    ]
  }
});