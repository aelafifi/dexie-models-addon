import typescript from "rollup-plugin-typescript2";

export default {
  input: "src/index.ts",
  output: [
    { file: "dist/index.js", format: "esm" },
    { file: "dist/index.cjs", format: "cjs", exports: "named" },
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
