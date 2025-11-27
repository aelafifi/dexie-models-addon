import Dexie from "dexie";

const db = new Dexie("TestDB");
db.version(1).models();

db.table("as").with("bs");
db.table("as").toCollection().with("bs");
