import { DatabaseStore } from "./mapStore";
export interface IDatabase {
    version: number;
    name: string;
}
export declare class Database {
    /**
     * tablename -> DatabaseStore
     */
    private stores;
    private initialized;
    version: number;
    dbName: string;
    db: IDBDatabase | null;
    constructor(options: IDatabase);
    private promise;
    private create;
    private listenupgrade;
    private open;
    ensureInitialized(): Promise<void>;
    registere(tableName: string, store: DatabaseStore): void;
}
