module.exports = {
  mode: 'production',
  optimization: {
    minimize: false
  },
  entry: "./src/ts/index.ts",
  output: {
    path: __dirname + "dist/lib",
    library: "MonacoCollabExt",
    libraryTarget: "umd",
    umdNamedDefine: true,
    filename: "monaco-collab-ext.js"
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/
      }
    ]
  },
  resolve: {
    extensions: [".ts"],
  },
  plugins: [],
  externals: {
    "monaco-editor": {
      amd: "vs/editor/editor.main",
      commonjs: "monaco-editor",
      commonjs2: "monaco-editor",
      root: "monaco"
    }
  }
};
