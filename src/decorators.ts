import "reflect-metadata";
import DexieModel from "./DexieModel";
import type { PreFilterFn, RelationThrough } from "./types";

function ensureIsDexieModel(target) {
  if (!(target instanceof DexieModel)) {
    throw new Error("Decorator can only be used on Model classes");
  }
}

function ensureProp(obj, prop, init) {
  if (!Object.prototype.hasOwnProperty.call(obj, prop)) {
    obj[prop] = init();
  }
  return obj[prop];
}

// FIXME: should support multiple primary keys (compound keys)
export const PrimaryKey = (target: object, propertyKey: string) => {
  ensureIsDexieModel(target);
  const modelCls = target.constructor as typeof DexieModel;
  modelCls.__pk = propertyKey;
};

export const Index = (target: object, propertyKey: string) => {
  ensureIsDexieModel(target);
  const modelCls = target.constructor as typeof DexieModel;
  ensureProp(modelCls, "__indices", () => []);
  modelCls.__indices.push(propertyKey);
};

export const NestedIndex = (...args: string[]): PropertyDecorator => {
  return (target: object, propertyKey: string) => {
    ensureIsDexieModel(target);
    const modelCls = target.constructor as typeof DexieModel;
    ensureProp(modelCls, "__indices", () => []);
    if (args.length > 0) {
      modelCls.__indices.push(...args.map((a) => propertyKey + "." + a));
    } else {
      modelCls.__indices.push(propertyKey);
    }
  };
};

export const AutoIncrementIndex = (target: object, propertyKey: string) => {
  ensureIsDexieModel(target);
  const modelCls = target.constructor as typeof DexieModel;
  if (modelCls.__pk === propertyKey) {
    modelCls.__pk = "++" + propertyKey;
    return;
  }
  ensureProp(modelCls, "__indices", () => []);
  modelCls.__indices.push("++" + propertyKey);
};

export const UniqueIndex = (target: object, propertyKey: string) => {
  ensureIsDexieModel(target);
  const modelCls = target.constructor as typeof DexieModel;
  ensureProp(modelCls, "__indices", () => []);
  modelCls.__indices.push("&" + propertyKey);
};

export const MultipleEntryIndex = (target: object, propertyKey: string) => {
  ensureIsDexieModel(target);
  const modelCls = target.constructor as typeof DexieModel;
  ensureProp(modelCls, "__indices", () => []);
  modelCls.__indices.push("*" + propertyKey);
};

export const LinkTo = (
  localField: string,
  targetTable: string,
  targetField: string,
  filter?: PreFilterFn,
): PropertyDecorator => {
  return (target: object, propertyKey: string) => {
    ensureIsDexieModel(target);
    const modelCls = target.constructor as typeof DexieModel;
    ensureProp(modelCls, "__relations", () => ({}));
    modelCls.__relations[propertyKey] = {
      forward: true,
      multi: false,
      propertyKey,
      localTable: modelCls.getTableName(),
      localField,
      targetTable,
      targetField,
      filter,
    };
  };
};

export const Backlink = (
  localField: string,
  targetTable: string,
  targetField: string,
  filter?: PreFilterFn,
): PropertyDecorator => {
  return (target: object, propertyKey: string) => {
    ensureIsDexieModel(target);
    const modelCls = target.constructor as typeof DexieModel;
    ensureProp(modelCls, "__relations", () => ({}));
    modelCls.__relations[propertyKey] = {
      forward: false,
      multi: false,
      propertyKey,
      localTable: modelCls.getTableName(),
      localField,
      targetTable,
      targetField,
      filter,
    };
  };
};

export const MultiLinkTo = (
  localField: string,
  targetTable: string,
  targetField: string,
  filter?: PreFilterFn,
): PropertyDecorator => {
  return (target: object, propertyKey: string) => {
    ensureIsDexieModel(target);
    const modelCls = target.constructor as typeof DexieModel;
    ensureProp(modelCls, "__indices", () => []);
    if (!modelCls.__indices.includes("*" + localField)) {
      throw new Error(
        `MultiLinkTo decorator requires MultipleEntryIndex on local field '${localField}'`,
      );
    }
    ensureProp(modelCls, "__relations", () => ({}));
    modelCls.__relations[propertyKey] = {
      forward: true,
      multi: true,
      propertyKey,
      localTable: modelCls.getTableName(),
      localField,
      targetTable,
      targetField,
      filter,
    };
  };
};

export const MultiBacklink = (
  localField: string,
  targetTable: string,
  targetField: string,
  filter?: PreFilterFn,
): PropertyDecorator => {
  return (target: object, propertyKey: string) => {
    ensureIsDexieModel(target);
    const modelCls = target.constructor as typeof DexieModel;
    ensureProp(modelCls, "__relations", () => ({}));
    modelCls.__relations[propertyKey] = {
      forward: false,
      multi: true,
      propertyKey,
      localTable: modelCls.getTableName(),
      localField,
      targetTable,
      targetField,
      filter,
    };
  };
};

export const LinkThrough = (
  localField: string,
  targetTable: string,
  targetField: string,
  through: RelationThrough,
  filter?: PreFilterFn,
): PropertyDecorator => {
  return (target: object, propertyKey: string) => {
    ensureIsDexieModel(target);
    const modelCls = target.constructor as typeof DexieModel;
    ensureProp(modelCls, "__relations", () => ({}));
    modelCls.__relations[propertyKey] = {
      forward: true,
      multi: false,
      propertyKey,
      localTable: modelCls.getTableName(),
      localField,
      targetTable,
      targetField,
      through,
      filter,
    };
  };
};

/**
 * Possible patterns:
 *   - `field -> TargetTable.targetField`  (LinkTo)
 *   - `field <- TargetTable.targetField`  (Backlink)
 *   - `field[] -> TargetTable.targetField`  (MultiLinkTo)
 *   - `field <- TargetTable.targetField[]`  (MultiBacklink)
 *   - `field <- PivotTable[!].pivotField|pivotTargetField -> TargetTable.targetField`  (LinkThrough)
 */
export const Relationship = (
  pattern: string,
  filter?: PreFilterFn,
  throughFilter?: PreFilterFn,
) => {
  pattern = pattern.trim();
  let match;

  /**
   * e.g., at StudentModel:
   *
   * @example
   * ```
   * // Include studentsCourses instance within `__through` property
   * id <- studentsCourses.studentId|courseId -> courses.id
   *
   * // Ignore studentsCourses, just use it to get the results
   * id <- studentsCourses!.studentId|courseId -> courses.id
   * ```
   */
  const MANY_TO_MANY_THROUGH_REGEX =
    /^(\w+)\s*<-\s*(\w+)(!?)\.(\w+)\|(\w+)\s*->\s*(\w+)\.(\w+)$/;
  if ((match = pattern.match(MANY_TO_MANY_THROUGH_REGEX))) {
    return LinkThrough(
      match[1],
      match[6],
      match[7],
      {
        pivotTable: match[2],
        localField: match[4],
        targetField: match[5],
        ignoreThrough: !!match[3],
        filter: throughFilter,
      },
      filter,
    );
  }

  if (throughFilter) {
    throw new Error(
      "Through filter provided but relationship pattern is not a link-through relationship.",
    );
  }

  const LINK_TO_REGEX = /^(\w+)\s*->\s*(\w+)\.(\w+)$/;
  if ((match = pattern.match(LINK_TO_REGEX))) {
    return LinkTo(match[1], match[2], match[3], filter);
  }

  const BACKLINK_REGEX = /^(\w+)\s*<-\s*(\w+)\.(\w+)$/;
  if ((match = pattern.match(BACKLINK_REGEX))) {
    return Backlink(match[1], match[2], match[3], filter);
  }

  const MULTI_LINK_TO_REGEX = /^(\w+)\[]\s*->\s*(\w+)\.(\w+)$/;
  if ((match = pattern.match(MULTI_LINK_TO_REGEX))) {
    return MultiLinkTo(match[1], match[2], match[3], filter);
  }

  const MULTI_BACKLINK_REGEX = /^(\w+)\s*<-\s*(\w+)\.(\w+)\[]$/;
  if ((match = pattern.match(MULTI_BACKLINK_REGEX))) {
    return MultiBacklink(match[1], match[2], match[3], filter);
  }

  throw new Error(`Invalid relationship pattern: ${pattern}`);
};
