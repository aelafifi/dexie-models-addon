import "dexie";
import type { Withable } from "./types";
import type DexieModel from "./DexieModel";

declare module "dexie" {
  interface Table<T extends Entity> {
    with(_with: Withable | string | string[]): Promise<T[]>;

    __applyWith(
      _with: Withable | string | string[],
      getData: () => Promise<T[]>,
    ): Promise<T[]>;
  }

  interface Collection<T = any> {
    with(_with: Withable | string | string[]): Promise<T[]>;
  }

  interface Version {
    models(...models: (typeof DexieModel)[]): Version;
  }
}
