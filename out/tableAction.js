import { Subscrition } from "./subscriberChannel";
import { requestPromise, wrapDbRequest } from "./uitls";
import { nextTick } from "next-tick";
function validateType(target, source) {
    for (let [k, v] of Object.entries(source)) {
        let type = target.get(k)?.type;
        if (type !== undefined) {
            if (!(v.__proto__ === type.prototype)) {
                return false;
            }
        }
    }
    return true;
}
function equals(tar, val) {
    let tarType = Object.prototype.toString.call(tar);
    let valType = Object.prototype.toString.call(val);
    // 类型不同
    if (tarType !== valType) {
        return false;
    }
    tarType = tarType.slice(1, -1);
    valType = valType.slice(1, -1);
    switch (tarType) {
        case "Array":
            // @ts-ignore
            return val.length === tar.length;
        case "String":
        case "Number":
        case "Boolean":
        case "Null":
        case "Undefined":
            return val === tar;
        case "Object":
            let keys = Object.keys(tar);
            for (let i = 0; i < keys.length; i++) {
                if (tar[keys[i]] !== val[keys[i]]) {
                    return false;
                }
            }
            return true;
        case "Date":
            return val.toString() === val.toString();
        default:
            return true;
    }
}
class ActionContext {
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
    run(cb) {
        return new Promise(async (resolve, reject) => {
            await this.database.ensureInitialized();
            const trs = this.requestTransaction();
            const store = trs.objectStore(this.tableName);
            const result = await cb(store, {
                reject(reson) {
                    reject(reson);
                },
            });
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
        });
    }
    async flushQueue(queue) {
        let fn = undefined;
        while ((fn = queue.shift()) !== undefined) {
            await fn();
        }
    }
    runing = false;
    async workLoop() {
        if (this.runing) {
            return;
        }
        this.runing = true;
        let queue = this.currentQueue;
        this.currentQueue = [];
        await this.flushQueue(queue);
        if (this.currentQueue.length > 0) {
            nextTick(() => {
                this.workLoop();
            });
        }
        this.runing = false;
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
export class TableAction {
    tableName;
    tableFields;
    database;
    // public primaryKey: GetTableFieldsKeys<T>;
    primaryKeys;
    autoIncrement = false;
    tableMap;
    ctx;
    onUpdated = new Subscrition();
    constructor(tableName, 
    /**
     *
     *
     *
     */
    tableFields, database) {
        this.tableName = tableName;
        this.tableFields = tableFields;
        this.database = database;
        this.ctx = new ActionContext(database, tableName);
    }
    getIndex(k) {
        let i = this.tableMap.get(k).index;
        return typeof i === "string" ? i : i === true ? k : null;
    }
    /**
     * @deprecated
     */
    getPrimaryValue() {
    }
    /**
     * 变化以后内部通知
     */
    publish(key, value) {
        nextTick(() => {
            this.onUpdated.publish(key, value);
        });
    }
    // 如果存在所有的key
    publishAll(all) {
        nextTick(() => {
            this.onUpdated.publishAll(all);
        });
    }
    notiify(key) {
        nextTick(() => {
            this.onUpdated.publish(key, null);
        });
    }
    initialize() {
        let tableName = this.tableName;
        let fields = this.tableFields;
        let keys = Object.keys(fields);
        let primaryKey = [];
        let autoIncrement = false;
        const map = new Map();
        for (let el of keys) {
            let val = fields[el];
            if (val.primaryKey === true) {
                primaryKey.push(el);
                if (val.autoIncrement !== undefined) {
                    autoIncrement = val.autoIncrement;
                }
            }
            map.set(el, {
                ...val,
                unique: val.unique ?? false,
                index: val.index ?? true,
            });
        }
        if (primaryKey.length === 0) {
            throw Error(`${tableName} is not exist primaryKey`);
        }
        this.tableMap = map;
        this.primaryKeys = primaryKey;
        this.autoIncrement = autoIncrement;
        // todo: 注册时注意默认值
        this.database.registere(this.tableName, map, {
            fieldName: primaryKey,
            autoIncrement
        });
    }
    hasInPrimary(obj) {
        if (!this.autoIncrement) {
            for (let k of this.primaryKeys) {
                if (obj[k] === undefined) {
                    return false;
                }
            }
        }
        return true;
    }
    validatePrimaryValue(obj) {
        if (!this.autoIncrement) {
            for (let k of this.primaryKeys) {
                if (!(["string", "number", "boolean"].includes(typeof obj[k]))) {
                    return false;
                }
            }
        }
        return true;
    }
    /**
     * 获取当前存储库下所有的
     */
    async queryAll() {
        return this.ctx.execute(store => {
            return store.getAll();
        });
    }
    isQueryAll = false;
    prevQueryAll = this.isQueryAll;
    all() {
        this.prevQueryAll = this.isQueryAll;
        this.isQueryAll = true;
        return this;
    }
    queryRollBack() {
        let queryAll = this.isQueryAll;
        this.isQueryAll = this.prevQueryAll;
        return queryAll;
    }
    /**
     * 使用主键查询
     */
    async queryBy(primary) {
        return this.ctx.execute(store => {
            return store.get(primary);
        });
    }
    /**
     * 使用字段索引查询
     */
    async queryByIndex(key, val) {
        let ql = this.queryRollBack();
        return this.ctx.execute(async (store) => {
            let p = this.getIndex(key);
            if (p === null) {
                return null;
            }
            const keyIndex = store.index(p);
            if (ql) {
                const r = await wrapDbRequest(keyIndex.getAll(val));
                return r;
            }
            const r = await wrapDbRequest(keyIndex.get(val));
            return r;
        });
    }
    /**
     * 满足其中一个条件的
     */
    async queryOr(obj) {
        let ql = this.queryRollBack();
        return this.ctx.execute(async (store) => {
            return new Promise(res => {
                let kes = Object.keys(obj);
                const surs = store.
                    openCursor();
                if (!ql) {
                    surs.onsuccess = (e) => {
                        let cursor = e.target.result;
                        if (cursor) {
                            const val = cursor.value;
                            for (let k of kes) {
                                let v = obj[k];
                                if (equals(v, val[k])) {
                                    res(val);
                                    return;
                                }
                            }
                            cursor.continue();
                        }
                        else {
                            res(null);
                        }
                    };
                }
                else {
                    const resList = [];
                    surs.onsuccess = (e) => {
                        let cursor = e.target.result;
                        if (cursor) {
                            const val = cursor.value;
                            for (let k of kes) {
                                let v = obj[k];
                                if (equals(v, val[k])) {
                                    resList.push(val);
                                    break;
                                }
                            }
                            cursor.continue();
                        }
                        else {
                            res(resList);
                        }
                    };
                }
            });
        });
    }
    /**
     * 满足所有条件的
     */
    async queryAnd(obj) {
        let ql = this.queryRollBack();
        return this.ctx.execute(async (store) => {
            return new Promise(res => {
                let kes = Object.keys(obj);
                const surs = store.
                    openCursor();
                if (!ql) {
                    surs.onsuccess = (e) => {
                        let cursor = e.target.result;
                        if (cursor) {
                            const val = cursor.value;
                            let target = null;
                            for (let k of kes) {
                                let v = obj[k];
                                if (equals(v, val[k])) {
                                    target = null;
                                    break;
                                }
                                else {
                                    target = val;
                                }
                            }
                            if (target !== null) {
                                res(target);
                            }
                            cursor.continue();
                        }
                        else {
                            res(null);
                        }
                    };
                }
                else {
                    const resList = [];
                    surs.onsuccess = (e) => {
                        let cursor = e.target.result;
                        if (cursor) {
                            const val = cursor.value;
                            let target = null;
                            for (let k of kes) {
                                let v = obj[k];
                                if (equals(v, val[k])) {
                                    target = null;
                                    break;
                                }
                                else {
                                    target = val;
                                }
                            }
                            if (target !== null) {
                                resList.push(target);
                            }
                            cursor.continue();
                        }
                        else {
                            res(resList);
                        }
                    };
                }
            });
        });
    }
    /**
     * 包含关系
     */
    async include(key, val) {
        // let ql = this.queryRollBack();
        return this.ctx.execute(async (store) => {
            let index = store.index(this.getIndex(key));
            let res = [];
            if (Array.isArray(val)) {
                for (let el of val) {
                    let v = await wrapDbRequest(index.getAll(el));
                    res.push(...v);
                }
            }
            else {
                res = await wrapDbRequest(index.getAll(val));
            }
            return res;
        });
    }
    /**
     * 不包含的
     */
    async exclude(key, val) {
        return this.ctx.execute(async (store) => {
            let index = store.index(this.getIndex(key));
            let res = [];
            if (Array.isArray(val)) {
                for (let el of val) {
                    let v = await wrapDbRequest(index.getAll());
                    res.push(...v.filter(e => !val.includes(e)));
                }
            }
            else {
                let r = await wrapDbRequest(index.getAll());
                res = r.filter(e => equals(e, val));
            }
            return res;
        });
    }
    async has(id) {
        return this.ctx.execute(async (store) => {
            let c = await wrapDbRequest(store.count(id));
            console.log(c);
            return c !== 0;
        });
    }
    async hasAll(row) {
        for (let key of this.primaryKeys) {
            let v = row[key];
            // 如果存在一个就返回true
            if (await this.has(v)) {
                return true;
            }
        }
        return false;
    }
    /**
     * 使用主键更新
     */
    async updateBy(next) {
        if (!this.hasInPrimary(next)) {
            throw Error("使用主键索引更新, next 必须存在主键");
        }
        if (!validateType(this.tableMap, next)) {
            throw Error("type error");
        }
        return this.ctx.execute((store) => {
            return store.put(next);
        })
            .finally(() => {
            this.publishAll(next);
        });
    }
    /**
     * 使用字段索引更新
     * @param key 索引
     * @param val 查找的值
     * @param next 需要更新的
     */
    async updateByIndex(key, val, next) {
        if (this.hasInPrimary(next)) {
            throw Error("使用索引更新, next不能存在主键");
        }
        if (!validateType(this.tableMap, next)) {
            throw Error("type error");
        }
        return this.ctx.execute(store => {
            return new Promise(r => {
                store.index(this.getIndex(key)).openCursor().onsuccess = ((e) => {
                    const cursor = e.target.result;
                    if (cursor) {
                        let src = cursor.value;
                        if (equals(src[key], val)) {
                            for (let [key, v] of Object.entries(next)) {
                                src[key] = v;
                            }
                            r(cursor.update(src));
                            this.publish(key, val);
                        }
                        cursor.continue();
                    }
                });
            });
        });
    }
    /**
     * 使用主键更新
     */
    async deleteBy(primary) {
        return this.ctx.execute(async (store) => {
            let item = await wrapDbRequest(store.get(primary));
            if (item === undefined) {
                return;
            }
            this.publishAll(item);
            return store.delete(primary);
        });
    }
    /**
     * 使用索引删除
     */
    async deleteByIndex(key, val) {
        return this.ctx.execute(store => {
            return new Promise(r => {
                store.index(this.getIndex(key)).openCursor().onsuccess = ((e) => {
                    const cursor = e.target.result;
                    if (cursor) {
                        if (equals(cursor.value[key], val)) {
                            r(cursor.delete());
                            this.publish(key, val);
                        }
                        cursor.continue();
                    }
                });
            });
        });
    }
    async deleteOrByIndexs(key, val) {
        return this.ctx.execute(store => {
            return new Promise(r => {
                store.index(this.getIndex(key)).openCursor().onsuccess = ((e) => {
                    const cursor = e.target.result;
                    if (cursor) {
                        if (val.includes(cursor.value[key])) {
                            r(cursor.delete());
                            this.publish(key, cursor.value[key]);
                        }
                        cursor.continue();
                    }
                });
            });
        });
    }
    /**
     * 清空表
     */
    async clear() {
        return this.ctx.execute(store => {
            let all = Object.keys(this.tableFields).reduce((p, a) => {
                p[a] = null;
                return p;
            }, {});
            this.publishAll(all);
            return store.clear();
        });
    }
    /**
     * 删除表
     */
    drop() {
        let all = Object.keys(this.tableFields).reduce((p, a) => {
            p[a] = null;
            return p;
        }, {});
        this.publishAll(all);
        this.database.db.deleteObjectStore(this.tableName);
    }
    /**
     * 使用字段循环所有
     * ? 是吗
     */
    forEachByIndex(key, callback) {
        this.ctx.execute(store => {
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
        this.ctx.execute(store => {
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
    /**
     * 查询是否存在，如果存在就不添加了
     */
    async save(row) {
        let exsit = await this.hasAll(row);
        console.log(exsit, "es");
        // 不存在就添加
        if (!exsit) {
            return await this.append(row);
        }
        ;
        return await this.updateBy(row);
    }
    /**
     * 天津一条
     */
    async append(row) {
        if (!this.hasInPrimary(row)) {
            throw Error("没有id");
        }
        if (!this.validatePrimaryValue(row)) {
            throw Error("value type error");
        }
        if (!validateType(this.tableMap, row)) {
            throw Error("type error");
        }
        return this.ctx.execute(async (store, u) => {
            if (!this.hasInPrimary(row)) {
                u.reject("不存在primary " + this.primaryKeys.join(","));
            }
            for (let k of this.primaryKeys) {
                let primary = row[k];
                if (primary !== undefined) {
                    const count = await wrapDbRequest(store.count(k));
                    if (count !== 0) {
                        u.reject(`${primary} exist`);
                        return false;
                    }
                }
            }
            await wrapDbRequest(store.add(row));
            this.publishAll(row);
            return false;
        });
    }
    /**
     * 监听某一个值的变化
     */
    onUpdate(key, callback) {
        return this.onUpdated.subscribe(key, callback);
    }
}
