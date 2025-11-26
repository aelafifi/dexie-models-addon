import buble from "@rollup/plugin-buble";
import terser from "@rollup/plugin-terser";
import sourcemaps from "rollup-plugin-sourcemaps";
import typescript from "@rollup/plugin-typescript";

export default {
  moduleName: "dexieRelationships",
  entry: "src/index.js",
  format: "umd",
  dest: "dist/index.min.js",
  sourceMap: true,
  external: ["dexie"],
  globals: {
    dexie: "Dexie",
  },
  plugins: [typescript(), buble(), terser(), sourcemaps()],
};
