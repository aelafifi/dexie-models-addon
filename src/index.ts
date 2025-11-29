import "dexie";

// Ensure dexie augmentation is part of the public type surface:
import "./dexie-relationships-augmentation";
import type Dexie from "dexie";
import VersionStoresModelParser from "./addons/VersionStoresModelParser";
import RelationshipsAddon from "./addons/RelationshipsAddon";

export function DexieModelsAddon(db: Dexie) {
  VersionStoresModelParser(db);
  RelationshipsAddon(db);
}

export { default as DexieModel } from "./DexieModel";
export type * from "./types";
