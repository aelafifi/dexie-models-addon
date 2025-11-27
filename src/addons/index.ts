import "dexie";
import Dexie from "dexie";
import VersionStoresModelParser from "./VersionStoresModelParser";
import RelationshipsAddon from "./RelationshipsAddon";
import type { Withable } from "../types";
import type DexieModel from "../DexieModel";

declare module "dexie" {
  interface Table<T extends typeof Entity> {
    with(_with: Withable | string | string[]): Promise<T[]>;

    __applyWith(
      _with: Withable | string | string[],
      getData: () => Promise<T[]>,
    ): Promise<T[]>;
  }

  interface Collection<T> {
    with(_with: Withable | string | string[]): Promise<T[]>;
  }

  interface Version {
    models(...models: (typeof DexieModel)[]): Version;
  }
}

export default function DexieModelsAddon(db: Dexie) {
  VersionStoresModelParser(db);
  RelationshipsAddon(db);
}
