import { requestPromise } from "./uitls";
export class Database {
    options;
    currentVersion;
    initialized = false;
    primaryKeyMap = new Map();
    stores = new Map();
    db = null;
    constructor(options) {
        this.options = options;
        this.currentVersion = options.version;
    }
    opendPromise = null;
    /**
     * 初始化打开数据库
     */
    openDatabase(openDb) {
        this.opendPromise = requestPromise();
        openDb.onsuccess = () => {
            if (this.db !== null) {
                this.opendPromise?.resolve(this.db);
                return;
            }
            this.db = openDb.result;
            let current = this.stores.keys();
            let all = true;
            let val = null;
            while (!(val = current.next()).done && all) {
                all = this.db.objectStoreNames.contains(val.value);
            }
            if (all) {
                this.opendPromise.resolve(this.db);
            }
        };
        openDb.onerror = (exx) => {
            this.opendPromise.reject(exx);
        };
        this.opendPromise.promise.finally(() => {
            this.opendPromise = null;
        });
        return this.opendPromise.promise;
    }
    /**
     * 升级时注册store
     * */
    registorStore(openDb) {
        openDb.onupgradeneeded = (ev) => {
            // @ts-ignore
            let db = ev.target.result;
            this.stores.forEach((tableFields, tableName) => {
                if (db.objectStoreNames.contains(tableName)) {
                    return;
                }
                let ops = this.primaryKeyMap.get(tableName);
                const table = openDb.result.createObjectStore(tableName, {
                    keyPath: Array.isArray(ops.fieldName) ? ops.fieldName.length === 1 ? ops.fieldName[0] : ops.fieldName : ops.fieldName,
                    autoIncrement: ops.autoIncrement
                });
                tableFields.forEach((field, key) => {
                    if (field.index !== false) {
                        let index = typeof field.index === "string" ? field.index : key;
                        table.createIndex(index, key, { unique: field.unique });
                    }
                });
            });
            if (this.db === null) {
                this.db = db;
            }
            else {
                this.opendPromise?.resolve(db);
            }
        };
        openDb.onerror = (exx) => {
            console.log("err", exx);
        };
    }
    async ensureInitialized() {
        if (this.initialized) {
            return;
        }
        let openDb = indexedDB.open(this.options.name, this.version);
        this.registorStore(openDb);
        await this.openDatabase(openDb);
        this.initialized = false;
    }
    registere(tableName, tableFields, primary) {
        this.stores.set(tableName, tableFields);
        this.primaryKeyMap.set(tableName, primary);
    }
    setVersion(nextVersion) {
    }
    get version() {
        return this.currentVersion;
    }
}
