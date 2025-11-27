import { type Collection } from "dexie";
import { type CollectionChain } from "lodash";

export interface RelationThrough {
  pivotTable: string;
  localField: string;
  targetField: string;
  ignoreThrough?: boolean;
}

export interface RelationType {
  forward: boolean;
  multi: boolean;
  propertyKey: string;
  localTable: string;
  localField: string;
  targetTable: string;
  targetField: string;
  through?: RelationThrough;
  filter?: PreFilterFn;
}

export type PreFilterFn = (collection: Collection) => Collection;

export type PostFilterFn = <T>(data: CollectionChain<T>) => CollectionChain<T>;

export interface WithableOptions {
  /**
   * Nested relations to include, including their own options
   */
  with?: Withable;

  /**
   * Filters to apply on the entire Dexie.Collection before fetching related data
   * (before calling `.toArray()`)
   */
  preFilter?: PreFilterFn;

  /**
   * Filters to apply on the entire set of fetched related data
   * (after calling `.toArray()`)
   */
  postFilter?: PostFilterFn;

  /**
   * If true, only include the parent items that have related data based on this relation.
   * - `preFilter` and `postFilter` is applied before checking for existence of related data.
   * - Can't be used on the first level of `.with(...)` when called from a single model via `Model.with`
   */
  inner?: boolean;
}

export interface Withable {
  [key: string]: boolean | WithableOptions;
}
