import Dexie from "dexie";
import type { Version } from "dexie";
import type DexieModel from "../DexieModel.ts";

declare module "dexie" {
  interface Version {
    models(...models: (typeof DexieModel)[]): Version;
  }
}

export default function VersionStoresModelParser(db: Dexie) {
  db.Version.prototype.models = function (
    this: Version,
    ...models: (typeof DexieModel)[]
  ) {
    const stores: Record<string, string> = Object.fromEntries(
      models.map((modelCls) => [
        modelCls.getTableName(),
        modelCls.getIndices().join(","),
      ]),
    );

    const version = this.stores(stores);

    for (const modelCls of models) {
      const table = db[modelCls.getTableName()];
      table.mapToClass(modelCls);

      // static (class-level) _db and _table getters
      Object.defineProperties(modelCls, {
        _db: {
          get() {
            return table.db;
          },
          enumerable: false,
          configurable: true,
        },
        _table: {
          get() {
            return table;
          },
          enumerable: false,
          configurable: true,
        },
      });
    }

    return version;
  };
}
