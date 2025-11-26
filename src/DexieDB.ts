import Dexie, { type DexieOptions } from "dexie";
import DexieModelsAddon from "./addons";

export default class DexieDB extends Dexie {
  constructor(databaseName: string, options?: DexieOptions) {
    super(databaseName, {
      ...options,
      addons: [
        ...(options?.addons ?? []),
        DexieModelsAddon,
        // TODO: add `groupper` as an addon here
      ],
    });
  }
}
