import buble from "@rollup/plugin-buble";
import sourcemaps from "rollup-plugin-sourcemaps";
import typescript from "@rollup/plugin-typescript";

export default {
  moduleName: "dexieRelationships",
  entry: "src/index.js",
  format: "umd",
  dest: "dist/index.js",
  sourceMap: true,
  external: ["dexie"],
  globals: {
    dexie: "Dexie",
  },
  plugins: [typescript(), buble(), sourcemaps()],
};
