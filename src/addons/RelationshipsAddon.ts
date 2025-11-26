import type { Collection, Table } from "dexie";
import Dexie from "dexie";
import type DexieModel from "../DexieModel";
import type { RelationType, Withable, WithableOptions } from "../types";
import * as _ from "lodash";

declare module "dexie" {
  interface Table<TModel> {
    with(_with: Withable | string | string[]): Promise<TModel[]>;

    __applyWith(
      _with: Withable | string | string[],
      getData: () => Promise<TModel[]>,
    ): Promise<TModel[]>;
  }

  interface Collection<TModel> {
    with(_with: Withable | string | string[]): Promise<TModel[]>;
  }
}

export default function RelationshipsAddon(db: Dexie) {
  db.Table.prototype.with = async function (
    this: Table,
    _with: Withable | string | string[],
  ) {
    return await this.toCollection().with(_with);
  };

  db.Table.prototype.__applyWith = async function <TModel>(
    this: Table,
    _with: Withable | string | string[],
    getData: () => Promise<TModel[]>,
  ) {
    // TODO: Add comments for this function
    _with = __parseWithable(_with);
    const modelCls = this.schema.mappedClass as typeof DexieModel;

    const relationships = _.chain(_with)
      .entries()
      .filter(([, v]) => v !== false)
      .map<[string, WithableOptions]>(([k, v]) => [k, v === true ? {} : v])
      .map<[RelationType, WithableOptions]>(([k, v]) => {
        if (!Object.keys(modelCls.__relations).includes(k)) {
          throw new Error(
            `Relation "${k}" not found on model "${modelCls.name}", available relations: ${Object.keys(modelCls.__relations).join(", ")}`,
          );
        }
        return [modelCls.__relations[k], v];
      })
      .value();

    let data = await getData();
    await Promise.all(
      relationships.map(([rel, relOptions]) =>
        (async () => {
          return rel.through
            ? await __joinThrough(this, data, rel, relOptions)
            : await __join(this, data, rel, relOptions);
        })(),
      ),
    );

    for (const [rel, relOptions] of relationships) {
      if (relOptions.inner) {
        data = data.filter((item) => {
          const targetValue = item[rel.propertyKey];
          return (
            targetValue !== undefined &&
            targetValue !== null &&
            (!Array.isArray(targetValue) || targetValue.length > 0)
          );
        });
      }
    }

    return data;
  };

  db.Collection.prototype.with = async function (
    this: Collection,
    _with: Withable | string | string[],
  ) {
    const table = this["_ctx"].table as Table;
    return table.__applyWith(_with, () => this.toArray());
  };
}

async function __getRelevantData<T>(
  db: Dexie,
  data: T[],
  rel: RelationType,
  opts: WithableOptions,
) {
  const targetValues = data.flatMap((item) => item[rel.localField] ?? []);
  let collection = (db[rel.targetTable] as Table)
    .where(rel.targetField)
    .anyOf(targetValues)
    .distinct();
  if (rel.filter) {
    collection = rel.filter(collection);
  }
  if (opts.preFilter) {
    collection = opts.preFilter(collection);
  }
  const results = opts.with
    ? await collection.with(opts.with)
    : await collection.toArray();
  return opts.postFilter ? opts.postFilter(_.chain(results)).value() : results;
}

function toList<T>(v: T | T[]): T[] {
  if (v === undefined || v === null) {
    return [];
  }
  return Array.isArray(v) ? v : [v];
}

function pairsGroupsReducer<T, K>(
  acc: Record<T, K[]>,
  [k, v]: [T, K],
): Record<T, K[]> {
  acc[k] ??= [];
  acc[k].push(v);
  return acc;
}

async function __join<T extends DexieModel>(
  table: Table<T>,
  data: T[],
  rel: RelationType,
  opts: WithableOptions,
) {
  const modelCls = table.schema.mappedClass as typeof DexieModel;
  const dataByPK = _.keyBy(data, modelCls.__pk);
  const singleValue = rel.forward && !rel.multi;
  const results = await __getRelevantData(table.db, data, rel, opts);

  // Group local data by localField
  const g1 = data
    // For each item, create pairs of [localField value, item]
    // Consider that localField value is treated as a list
    .flatMap((item) =>
      toList(item[rel.localField]).map((_local) => [_local, item]),
    )
    // Group by localField value
    .reduce(pairsGroupsReducer, {});

  // Group target data by targetField
  const g2 = results
    // For each item, create pairs of [localField value, item]
    // Consider that localField value is treated as a list
    .flatMap((item) =>
      toList(item[rel.targetField]).map((_local) => [_local, item]),
    )
    // Group by localField value
    .reduce(pairsGroupsReducer, {});

  // Find common keys between g1 and g2
  // Only these actually have related data
  const commonKeys = _.intersection(_.keys(g1), _.keys(g2));

  // Build assignment map from local PK value to target data
  const assignMap = _.chain(commonKeys)
    // For each common key, create all combinations of items from local and target
    // Result: Array<[local records array of k, target records array of k]>
    .map((k) => [g1[k], g2[k]])
    // flatten the combinations into pairs
    // Result: Array<[local single record, target single record]>
    .flatMap(([a, b]) => a.flatMap((x) => b.map((y) => [x, y])))
    // Map to Array<[local PK value, target record]>
    .map(([a, b]) => [a[modelCls.__pk], b])
    // Group by local PK value
    // Result: Record<local PK value, target records array>
    .reduce(pairsGroupsReducer, {})
    // Finally, map values to single or multiple based on relation type
    .mapValues((v) => (singleValue ? (v[0] ?? null) : v))
    .value();

  // Initialize all relations to null or empty array
  // This is to make sure that even items without related data have the property set
  data.forEach((item) => {
    item[rel.propertyKey] = singleValue ? null : [];
  });

  // Assign the related data to each item
  Object.entries(assignMap).forEach(([pk, assignment]) => {
    dataByPK[pk][rel.propertyKey] = assignment;
  });

  return data;
}

async function __joinThrough<T extends DexieModel>(
  table: Table<T>,
  data: T[],
  rel: RelationType,
  opts: WithableOptions,
) {
  const localFieldValues = data.map((item) => item[rel.localField]);
  const pivotData = await table.db
    .table(rel.through!.pivotTable)
    .where(rel.through!.localField)
    .anyOf(localFieldValues)
    .distinct()
    .toArray();

  const pivotTargetFieldValues = pivotData.map(
    (pd) => pd[rel.through!.targetField],
  );
  let targetDataCollection = await table.db
    .table(rel.targetTable)
    .where(rel.targetField)
    .anyOf(pivotTargetFieldValues)
    .distinct();

  if (rel.filter) {
    targetDataCollection = rel.filter(targetDataCollection);
  }
  if (opts.preFilter) {
    targetDataCollection = opts.preFilter(targetDataCollection);
  }
  const initialTargetData = opts.with
    ? await targetDataCollection.with(opts.with)
    : await targetDataCollection.toArray();
  const targetData = opts.postFilter
    ? opts.postFilter(_.chain(initialTargetData)).value()
    : initialTargetData;

  const localDataByLocalField = _.keyBy(data, rel.localField);
  const targetDataByTargetField = _.keyBy(targetData, rel.targetField);

  // Set initial values
  for (const item of data) {
    item[rel.propertyKey] = [];
  }

  for (const pivotItem of pivotData) {
    const targetFieldValue = pivotItem[rel.through!.targetField];
    const targetItem = targetDataByTargetField[targetFieldValue];
    if (!targetItem) {
      continue;
    }

    const localFieldValue = pivotItem[rel.through!.localField];
    const localItem = localDataByLocalField[localFieldValue];

    if (rel.through!.ignoreThrough) {
      localItem[rel.propertyKey].push(targetItem);
    } else {
      const targetItemClone = _.clone<DexieModel>(targetItem);
      targetItemClone.__through = pivotItem;
      localItem[rel.propertyKey].push(targetItemClone);
    }
  }

  return data;
}

function __parseWithable(_with: string | string[] | Withable): Withable {
  // TODO: comment this
  if (typeof _with === "string") {
    _with = _with.split(",");
  }

  if (Array.isArray(_with)) {
    const addPath = (target: Withable, path: string[]): Withable => {
      if (path.length > 0) {
        const [head, ...tail] = path;
        const [, _head, _inner] = head.match(/^(.*?)(!?)$/);
        const withInner = _inner ? { inner: true } : {};
        if (!target[_head]) {
          target[_head] =
            tail.length > 0
              ? { with: {}, ...withInner }
              : _inner
                ? withInner
                : true;
        }
        addPath(target[_head]["with"] as Withable, tail);
      }
      return target;
    };

    const result: Withable = {};
    for (const str of _with) {
      addPath(
        result,
        str.split(".").map((s) => s.trim()),
      );
    }
    return result;
  }

  return _with;
}
