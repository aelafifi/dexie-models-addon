import "dexie";
import {Entity} from "dexie";
import type {Withable} from "../types";
import type DexieModel from "../DexieModel";

declare module "dexie" {
    module Dexie {
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
}
