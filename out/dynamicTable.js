import nextTick from "next-tick";
import { Execable } from "./execable";
import { Subscrition } from "./subscriberChannel";
import { wrapDbRequest } from "./uitls";
export class DynamicTable {
    database;
    indexs = new Map();
    tableName;
    updated = new Subscrition();
    executable;
    constructor(schema, database) {
        this.database = database;
        const tableName = this.tableName = schema.tableName;
        let indexs = this.indexs;
        const store = new Map();
        for (let [k, v] of Object.entries(schema.fields)) {
            if (v.index !== false) {
                indexs.set(k, {
                    index: v.index === true ? k : v.index,
                    unique: v.unique,
                    type: v.type,
                });
                store.set(k, {
                    index: v.index === true ? k : v.index,
                    unique: v.unique,
                });
            }
        }
        database.registere(tableName, {
            indexs: store,
            primary: []
        });
        this.executable = new Execable(database, tableName);
    }
    get(key) {
        return this.executable.execute((store) => {
            return store.get(key);
        });
    }
    set(key, value) {
        return this.executable.execute((store) => {
            try {
                return store.put(value, key);
            }
            finally {
                this.publish(key, value);
            }
        });
    }
    delete(key) {
        return this.executable.execute((store) => {
            try {
                return store.delete(key);
            }
            finally {
                this.publish(key, null);
            }
        });
    }
    clear() {
        return this.executable.execute(async (store) => {
            try {
                return store.clear();
            }
            finally {
                const ks = await wrapDbRequest(store.getAllKeys());
                ks.forEach(k => {
                    this.publish(k, null);
                });
            }
        });
    }
    async drop() {
        this.database.db.deleteObjectStore(this.tableName);
        this.executable.execute(async (store) => {
            const ks = await wrapDbRequest(store.getAllKeys());
            ks.forEach(k => {
                this.publish(k, null);
            });
        });
    }
    /**
     * 使用字段循环所有
     * ? 是吗
     */
    forEachByIndex(key, callback) {
        this.executable.execute(store => {
            store.index(key).openCursor().onsuccess = (event) => {
                //@ts-ignore
                const cursor = event.target.result;
                if (cursor) {
                    callback(cursor.value);
                    cursor.continue();
                }
            };
        });
    }
    /**
     * 循环所有
     */
    forEach(callback) {
        this.executable.execute(store => {
            store.openCursor().onsuccess = (event) => {
                //@ts-ignore
                const cursor = event.target.result;
                if (cursor) {
                    callback(cursor.value);
                    cursor.continue();
                }
            };
        });
    }
    onUpdate(key, callback) {
        this.updated.subscribe(key, callback);
    }
    publish(key, value) {
        nextTick(() => {
            this.updated.publish(key, value);
        });
    }
}
