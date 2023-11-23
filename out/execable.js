import nextTick from "next-tick";
import { requestPromise, wrapDbRequest } from "./uitls";
export class Execable {
    database;
    tableName;
    constructor(database, tableName) {
        this.database = database;
        this.tableName = tableName;
    }
    /**
     * 请求操作的事务
     */
    requestTransaction() {
        return this.database.db.transaction(this.tableName, "readwrite");
    }
    currentQueue = [];
    runing = false;
    async workLoop() {
        if (this.runing) {
            return;
        }
        this.runing = true;
        let queue = this.currentQueue;
        this.currentQueue = [];
        let fn = undefined;
        while ((fn = queue.shift()) !== undefined) {
            await fn();
        }
        if (this.currentQueue.length > 0) {
            nextTick(() => {
                this.workLoop();
            });
        }
        this.runing = false;
    }
    run(cb) {
        return new Promise(async (resolve, reject) => {
            await this.database.ensureInitialized();
            const trs = this.requestTransaction();
            const store = trs.objectStore(this.tableName);
            try {
                const result = await cb(store, {});
                if (result instanceof IDBRequest) {
                    if (result.readyState === "done") {
                        resolve(result.result);
                    }
                    else {
                        let r = await wrapDbRequest(result);
                        resolve(r === undefined ? null : r);
                    }
                }
                else {
                    resolve(result);
                }
            }
            catch (exx) {
                reject(exx);
            }
        });
    }
    async execute(cb) {
        let feat = requestPromise();
        const loop = async () => {
            let r = await this.run(cb);
            feat.resolve(r);
        };
        this.currentQueue.push(loop);
        try {
            return feat.promise;
        }
        finally {
            this.workLoop();
        }
    }
}
