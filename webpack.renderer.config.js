/* eslint-disable @typescript-eslint/no-var-requires */
const rules = require("./webpack.rules");
const plugins = require("./webpack.plugins");

rules.push({
  test: /\.css$/,
  use: [{ loader: "style-loader" }, { loader: "css-loader" }],
});

rules.push({
  test: /\.svg$/,
  use: [{ loader: "react-svg-loader" }],
});

module.exports = {
  module: {
    rules,
  },
  plugins: plugins,
  externals: {
    "fs": "commonjs fs",
    "fsevents": "commonjs fsevents",
    "path": "commonjs path",
    "os": "commonjs os",
    "util": "commonjs util",
    "stream": "commonjs stream",
    "child_process": "commonjs child_process",
    "electron": "commonjs electron",
  },
  resolve: {
    extensions: [".js", ".ts", ".jsx", ".tsx", ".css", ".svg"],
  },
};
