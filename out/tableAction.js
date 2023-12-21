/**
 * 索引可以为空
 * 可以分为动态表和存在主键的表
 */
import { Execable } from "./execable";
import { SubscriberChannel } from "./subscriberChannel";
import { wrapDbRequest } from "./uitls";
import { nextTick } from "next-tick";
function validateType(target, source) {
    for (let [k, v] of Object.entries(source)) {
        if (target.has(k)) {
            let type = target.get(k);
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
export class TableAction {
    tableName;
    tableFields;
    database;
    // public primaryKey: GetTableFieldsKeys<T>;
    primaryKeys;
    autoIncrement = false;
    ctx;
    typeMaps;
    indexs;
    // private onUpdated = new Subscrition();
    onUpdated = new Map();
    constructor(tableName, tableFields, database) {
        this.tableName = tableName;
        this.tableFields = tableFields;
        this.database = database;
        this.ctx = new Execable(database, tableName);
    }
    getIndex(k) {
        if (this.indexs.has(k)) {
            return this.indexs.get(k).index;
        }
        return null;
    }
    initialize() {
        let tableName = this.tableName;
        let fields = this.tableFields;
        let keys = Object.keys(fields);
        let primaryKey = [];
        let autoIncrement = false;
        const indexs = new Map();
        const typeMaps = new Map();
        for (let el of keys) {
            let val = fields[el];
            if (val.primaryKey === true) {
                primaryKey.push(el);
                if (val.autoIncrement !== undefined) {
                    autoIncrement = val.autoIncrement;
                }
            }
            if (val.index !== false) {
                indexs.set(el, {
                    index: val.index === true ? el : val.index,
                    unique: val.unique,
                });
            }
            if (val.type !== undefined) {
                typeMaps.set(el, val.type);
            }
        }
        if (primaryKey.length === 0) {
            throw Error(`${tableName} is not exist primaryKey`);
        }
        this.indexs = indexs;
        this.typeMaps = typeMaps;
        this.primaryKeys = primaryKey;
        this.autoIncrement = autoIncrement;
        // todo: 注册时注意默认值
        this.database.registere(tableName, {
            primary: primaryKey,
            autoIncrement: autoIncrement,
            indexs: indexs,
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
        if (!validateType(this.typeMaps, next)) {
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
        if (!validateType(this.typeMaps, next)) {
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
                            this.publishByIndex(key, val);
                        }
                        cursor.continue();
                    }
                });
            })
                .finally(() => {
                for (const k of Object.keys(next)) {
                    if (this.primaryKeys.includes(k)) {
                        this.publishByPaths([k, next[k]], next);
                    }
                }
            });
        });
    }
    /**
     * 使用主键删除
     */
    async deleteBy(primary) {
        return this.ctx.execute(async (store) => {
            let item = await wrapDbRequest(store.get(primary));
            if (item === undefined) {
                return;
            }
            let keyPaths = [];
            Object.keys(item).forEach(k => {
                keyPaths.push([k]);
            });
            for (let key of this.primaryKeys) {
                if (item[key] === primary) {
                    keyPaths.push([key, item[key]]);
                    break;
                }
            }
            await store.delete(primary);
            keyPaths.forEach(ks => {
                this.publishByPaths(ks, null);
            });
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
                            this.publishByIndex(key, val);
                        }
                        cursor.continue();
                    }
                });
            });
        });
    }
    /**
     * 或者
     * 应该有个并且
     */
    async deleteOrByIndexs(key, val) {
        return this.ctx.execute(store => {
            return new Promise(r => {
                store.index(this.getIndex(key)).openCursor().onsuccess = ((e) => {
                    const cursor = e.target.result;
                    if (cursor) {
                        if (val.includes(cursor.value[key])) {
                            r(cursor.delete());
                            this.publishByIndex(key, cursor.value[key]);
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
        return this.ctx.execute(async (store) => {
            store.clear();
            this.publishAllByNull();
            this.cleanSub();
        });
    }
    /**
     * 删除表
     */
    async drop() {
        this.database.db.deleteObjectStore(this.tableName);
        this.publishAllByNull();
        this.cleanSub();
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
        if (!validateType(this.typeMaps, row)) {
            throw Error("type error");
        }
        return this.ctx.execute(async (store, u) => {
            if (!this.hasInPrimary(row)) {
                throw ("不存在primary " + this.primaryKeys.join(","));
            }
            for (let k of this.primaryKeys) {
                let primary = row[k];
                if (primary !== undefined) {
                    const count = await wrapDbRequest(store.count(k));
                    if (count !== 0) {
                        throw (`${primary} exist`);
                    }
                }
            }
            await wrapDbRequest(store.add(row));
            this.publishAll(row);
            return false;
        });
    }
    /**
     * 可以监听key值的变化，比如index、primary的value变化
     */
    onUpdate(key, callback) {
        // return this.onUpdated.subscribe(key, callback);
        let evs = this.onUpdated.get(key);
        if (evs === undefined) {
            this.onUpdated.set(key, evs = new SubscriberChannel());
        }
        let ch = evs;
        let un = ch.subscribe(callback);
        return () => {
            un();
            if (ch.size === 0) {
                let v = this.onUpdated.get(key);
                if (v instanceof SubscriberChannel) {
                    v.close();
                }
                else if (v instanceof Map) {
                    Array.from(v.values()).forEach(p => p.close());
                }
                this.onUpdated.delete(key);
            }
        };
    }
    /**
     * 监听主键的value变化
     * ```ts
     * onUpdateByValue("id", (value) => {});
     * let fields = {
     *  primaryKey: "key"
     * };
     * update("id", "v1"); -> {key:"id",value: "v1"}
     * callback({key:"id",value: "v1"});
     * ```
     */
    onUpdateByValue(val, callback) {
        // key: string,
        let uns = [];
        this.primaryKeys.forEach(el => {
            // todo: 是否需要索引
            let m = this.onUpdated.get(el);
            if (m === undefined) {
                this.onUpdated.set(el, m = new Map());
            }
            let valMap = m;
            let valCh = valMap.get(val);
            if (valCh === undefined) {
                valMap.set(val, valCh = new SubscriberChannel());
            }
            let un = valCh.subscribe(callback);
            uns.push({ un, ch: valMap });
        });
        return () => {
            uns.forEach(el => {
                el.un();
                if (el.ch.size === 0) {
                    el.ch.delete(val);
                }
            });
        };
    }
    publishAllByNull() {
        let vals = Array.from(this.onUpdated.values());
        let pubs = [];
        for (let i = 0; i < vals.length; i++) {
            let val = vals[i];
            if (val instanceof Map) {
                vals.push(...Array.from(val.values()));
            }
            else {
                pubs.push(val);
            }
        }
        pubs.forEach(p => p.publish(null));
    }
    cleanSub() {
        nextTick(() => nextTick(() => nextTick(() => {
            let pub = [];
            this.onUpdated.forEach(v => {
                if (v instanceof SubscriberChannel) {
                    pub
                        .push(v);
                    return;
                }
                if (v instanceof Map) {
                    pub = pub.concat(Array.from(v.values()));
                }
            });
            pub.forEach(p => p.close());
        })));
    }
    publishByPaths(keys, next) {
        let current = this.onUpdated;
        let pub = null;
        while (keys.length > 0) {
            let key = keys.shift();
            let el = current.get(key);
            if (el === undefined) {
                return;
            }
            if (el instanceof Map) {
                current = el;
            }
            else {
                pub = el;
            }
        }
        if (pub !== null) {
            pub.publish(next);
        }
    }
    /**
     * 变化以后内部通知
     */
    publishByIndex(key, value) {
        let pub = this.onUpdated.get(key);
        if (pub === undefined) {
            return;
        }
        if (pub instanceof Map) {
            return;
        }
        nextTick(() => {
            pub.publish(value);
        });
    }
    // 如果存在所有的key
    publishAll(all) {
        // 索引通知
        for (let [k, v] of Object.entries(all)) {
            this.publishByIndex(k, v);
        }
        this.primaryKeys.forEach(el => {
            if (all[el] !== undefined) {
                let t = [el, all[el]];
                this.publishByPaths(t, all);
            }
        });
    }
    notify(key) {
        let pub = this.onUpdated.get(key);
        if (pub === undefined) {
            return;
        }
        nextTick(() => {
            pub.publish(null);
        });
    }
    set(g) {
        this.ctx.execute(g);
    }
}
