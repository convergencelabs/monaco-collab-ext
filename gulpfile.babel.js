import {src, dest, series} from "gulp";
import insert from "gulp-insert";
import webpackStream from "webpack-stream";
import webpack from "webpack";
import babel from "gulp-babel";
import rename from "gulp-rename";
import uglify from "gulp-uglify";
import sourcemaps from "gulp-sourcemaps";
import del from "del";
import cleanCSS from "gulp-clean-css";
import header from "gulp-header";
import trim from "trim";
import filter from 'gulp-filter-each';
import fs from "fs";
import gulpTypescript from "gulp-typescript";
import typescript from "typescript";
const tsProject = gulpTypescript.createProject("tsconfig.json", {
  declaration: true,
  typescript: typescript
});

const exportFilter = "export {};";

const copyFiles = () =>
  src(["README.md", "LICENSE", "package.json"])
    .pipe(dest("dist"));

const copyDocs = () =>
  src(["docs/**/*"])
    .pipe(dest("dist/docs"));

const umd = () => {
  const outputPath = "dist/umd";

  const packageJson = JSON.parse(fs.readFileSync("./package.json"));
  const headerTxt = fs.readFileSync("./copyright-header.txt");

  return src("./src/ts/index.ts")
    .pipe(webpackStream(require("./webpack.config.js"), webpack))
    .pipe(header(headerTxt, {package: packageJson}))
    .pipe(dest(outputPath));
};

const minifyUmd = () =>
  src("dist/umd/monaco-collab-ext.js")
    .pipe(sourcemaps.init())
    .pipe(uglify({
      output: {
        comments: "some"
      }
    }))
    .pipe(rename({extname: ".min.js"}))
    .pipe(sourcemaps.write("."))
    .pipe(dest("dist/umd"));

const commonjs = () =>
  src("src/ts/*.ts")
    .pipe(babel())
    .pipe(dest("dist/lib"));

const typings = () =>
  src("src/ts/*.ts")
    .pipe(tsProject())
    .dts
    .pipe(filter(content => trim(content) !== exportFilter))
    .pipe(dest("dist/typings"));

const appendTypingsNamespace = () =>
  src("dist/typings/index.d.ts", {base: './'})
    .pipe(insert.append('\nexport as namespace MonacoCollabExt;\n'))
    .pipe(dest("./"));

const css = () =>
  src("src/css/*.css")
    .pipe(dest("dist/css"));

const minifyCss = () =>
  src(`dist/css/monaco-collab-ext.css`)
    .pipe(sourcemaps.init())
    .pipe(cleanCSS())
    .pipe(rename({extname: ".min.css"}))
    .pipe(sourcemaps.write("."))
    .pipe(dest("dist/css"));

const clean = () => del(["dist"]);

const dist = series([
  umd,
  minifyUmd,
  commonjs,
  typings,
  appendTypingsNamespace,
  css,
  minifyCss,
  copyFiles,
  copyDocs]);

export {
  dist,
  clean
}
