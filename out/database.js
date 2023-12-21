import { requestPromise } from "./uitls";
export class Database {
    /**
     * tablename -> DatabaseStore
     */
    stores = new Map();
    initialized = false;
    version;
    dbName;
    db = null;
    constructor(options) {
        this.dbName = options.name;
        this.version = options.version;
    }
    promise = null;
    create(db) {
        this.stores.forEach((store, tableName) => {
            if (db.objectStoreNames.contains(tableName)) {
                return;
            }
            let table;
            if (store.primary.length > 0) {
                table = db.createObjectStore(tableName, {
                    keyPath: store.primary.length === 1 ? store.primary[0] : store.primary,
                    autoIncrement: store.autoIncrement
                });
            }
            else {
                table = db.createObjectStore(tableName);
            }
            store.indexs.forEach((field, key) => {
                table.createIndex(field.index, key, { unique: field.unique });
            });
        });
    }
    listenupgrade(openDb) {
        openDb.onupgradeneeded = ev => {
            // @ts-ignore
            let db = ev.target.result;
            this.create(db);
            if (this.db === null) {
                this.db = db;
            }
            else {
                this.promise?.resolve(db);
            }
        };
        openDb.onerror = ev => {
            this.promise?.reject(ev);
        };
    }
    open(openDb) {
        this.promise = requestPromise();
        openDb.onsuccess = () => {
            if (this.db !== null) {
                this.promise?.resolve(this.db);
                return;
            }
            let db = this.db = openDb.result;
            let current = this.stores.keys();
            let all = true;
            let val = null;
            while (!(val = current.next()).done && all) {
                all = db.objectStoreNames.contains(val.value);
            }
            if (all) {
                this.promise.resolve(db);
            }
        };
        openDb.onerror = (exx) => {
            this.promise.reject(exx);
        };
        this.promise.promise.finally(() => {
            this.promise = null;
        });
        return this.promise.promise;
    }
    async ensureInitialized() {
        if (this.initialized) {
            return;
        }
        let openDb = indexedDB.open(this.dbName, this.version);
        this.listenupgrade(openDb);
        await this.open(openDb);
        this.initialized = false;
    }
    registere(tableName, store) {
        this.stores.set(tableName, store);
    }
}
