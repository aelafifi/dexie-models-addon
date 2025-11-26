import Dexie from "dexie";
import VersionStoresModelParser from "./VersionStoresModelParser";
import RelationshipsAddon from "./RelationshipsAddon";

export default function DexieModelsAddon(db: Dexie) {
  VersionStoresModelParser(db);
  RelationshipsAddon(db);
}
