import type { Options } from "tsup";
export const tsup: Options = {
  clean: true,
  format: ["cjs", "esm"],
  entryPoints: ["src/index.ts"],
};
