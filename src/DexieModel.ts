import type { RelationType, Withable } from "./types.ts";
import type { Table } from "dexie";
import Dexie, { Entity } from "dexie";

// TODO: check if Entity<InstanceType<this>> would work as expected
export default class DexieModel<
  TModel extends typeof Entity,
  TKeyPropName,
  TSchema,
  TThrough extends typeof DexieModel = any,
> extends Entity {
  static __pk!: string;
  static __indices: string[] = [];
  static __relations: Record<string, RelationType> = {};
  static __compounds: string[] = [];

  static __tableName!: string;

  __through?: TThrough;

  get _db(): Dexie {
    return this.db;
  }

  get _table(): Table<TModel, TKeyPropName, TSchema> {
    return this.db[this.table()];
  }

  static getTableName() {
    return this.__tableName ?? this.name;
  }

  static getIndices() {
    return [this.__pk ?? "", ...this.__indices, ...this.__compounds];
  }

  public async with(_with: Withable | string | string[]): Promise<this> {
    if (!Array.isArray(_with) && typeof _with !== "string") {
      const allValid = Object.values(_with).map(
        (w) => typeof w === "boolean" || !w.inner,
      );
      if (allValid.length > 0 && !allValid.every((v) => v)) {
        throw new Error(
          "inner option is only supported when loading multiple models via Collection.with",
        );
      }
    }
    await this._table.__applyWith(_with, async () => [this]);
    return this;
  }
}
