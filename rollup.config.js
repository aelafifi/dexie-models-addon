import typescript from "rollup-plugin-typescript2";
import terser from "@rollup/plugin-terser";

export default {
  input: "src/index.ts",
  output: [
    { file: "dist/index.js", format: "esm" },
    { file: "dist/index.cjs", format: "cjs" },
    { file: "dist/index.min.js", format: "esm", plugins: [terser()] },
    { file: "dist/index.min.cjs", format: "cjs", plugins: [terser()] },
  ],
  external: ["dexie", "lodash"],
  plugins: [
    typescript({
      tsconfigOverride: {
        compilerOptions: {
          declaration: true,
          declarationDir: "dist/types",
          sourceMap: true,
        },
      },
      useTsconfigDeclarationDir: true,
    }),
  ],
};
