import typescript from "rollup-plugin-typescript2";

const tsPlugin = typescript({
  tsconfigOverride: {
    compilerOptions: {
      declaration: true,
      declarationDir: "dist/types",
      sourceMap: true,
    },
  },
  useTsconfigDeclarationDir: true,
});

export default [
  {
    input: "src/index.ts",
    output: [
      { file: "dist/index.esm.js", format: "esm" },
      { file: "dist/index.cjs.js", format: "cjs", exports: "named" },
    ],
    external: ["dexie", "lodash"],
    plugins: [tsPlugin],
  },

  {
    input: "src/decorators.ts",
    output: [
      { file: "dist/decorators.ems.js", format: "esm" },
      { file: "dist/decorators.cjs.js", format: "cjs", exports: "named" },
    ],
    external: ["dexie", "lodash"],
    plugins: [tsPlugin],
  },

  {
    input: ["src/index.ts", "src/decorators.ts"],
    output: {
      file: "dist/index.umd.js",
      format: "umd",
      name: "DexieModelsAddon",
      globals: {
        dexie: "Dexie",
        lodash: "_",
      },
      exports: "named",
    },
    external: ["dexie", "lodash"],
    plugins: [tsPlugin],
  },
];
