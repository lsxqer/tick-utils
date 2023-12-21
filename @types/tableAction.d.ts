/**
 * 索引可以为空
 * 可以分为动态表和存在主键的表
 */
import { Database } from "./database";
import { TableField } from "./mapStore";
export type Types = StringConstructor | BooleanConstructor | NumberConstructor | DateConstructor | ArrayConstructor | ObjectConstructor;
export interface TableFields {
    [p: string]: TableField;
}
type GetTableFields<T extends TableFields> = {
    [k in keyof T]?: unknown;
};
type GetTableFieldsKeys<T extends TableFields> = keyof T extends string ? keyof T : never;
export declare class TableAction<T extends TableFields = TableFields> {
    readonly tableName: string;
    private readonly tableFields;
    private readonly database;
    primaryKeys: string[];
    autoIncrement: boolean;
    private ctx;
    private typeMaps;
    private indexs;
    private onUpdated;
    constructor(tableName: string, tableFields: T, database: Database);
    private getIndex;
    protected initialize(): void;
    private hasInPrimary;
    private validatePrimaryValue;
    /**
     * 获取当前存储库下所有的
     */
    queryAll<R = unknown>(): Promise<R>;
    private isQueryAll;
    private prevQueryAll;
    all(): this;
    private queryRollBack;
    /**
     * 使用主键查询
     */
    queryBy<R = unknown>(primary: IDBValidKey): Promise<R>;
    /**
     * 使用字段索引查询
     */
    queryByIndex<R = unknown>(key: GetTableFieldsKeys<T>, val: IDBValidKey): Promise<R>;
    /**
     * 满足其中一个条件的
     */
    queryOr<R = unknown>(obj: GetTableFields<T>): Promise<R>;
    /**
     * 满足所有条件的
     */
    queryAnd<R = unknown>(obj: GetTableFields<T>): Promise<R>;
    /**
     * 包含关系
     */
    include<R = unknown>(key: GetTableFieldsKeys<T>, val: IDBValidKey): Promise<R>;
    /**
     * 不包含的
     */
    exclude<R = unknown>(key: GetTableFieldsKeys<T>, val: IDBValidKey): Promise<R>;
    has(id: IDBValidKey): Promise<boolean>;
    private hasAll;
    /**
     * 使用主键更新
     */
    updateBy(next: GetTableFields<T>): Promise<boolean>;
    /**
     * 使用字段索引更新
     * @param key 索引
     * @param val 查找的值
     * @param next 需要更新的
     */
    updateByIndex(key: GetTableFieldsKeys<T>, val: unknown, next: GetTableFields<T>): Promise<unknown>;
    /**
     * 使用主键删除
     */
    deleteBy(primary: IDBValidKey): Promise<unknown>;
    /**
     * 使用索引删除
     */
    deleteByIndex(key: GetTableFieldsKeys<T>, val: unknown): Promise<unknown>;
    /**
     * 或者
     * 应该有个并且
     */
    deleteOrByIndexs(key: GetTableFieldsKeys<T>, val: unknown[]): Promise<unknown>;
    /**
     * 清空表
     */
    clear(): Promise<unknown>;
    /**
     * 删除表
     */
    drop(): Promise<void>;
    /**
     * 使用字段循环所有
     * ? 是吗
     */
    forEachByIndex(key: GetTableFieldsKeys<T>, callback: (value: GetTableFields<T>) => void): void;
    /**
     * 循环所有
     */
    forEach(callback: (value: GetTableFields<T>) => void): void;
    /**
     * 查询是否存在，如果存在就不添加了
     */
    save(row: GetTableFields<T>): Promise<boolean>;
    /**
     * 天津一条
     */
    append(row: GetTableFields<T>): Promise<boolean>;
    /**
     * 可以监听key值的变化，比如index、primary的value变化
     */
    onUpdate<V = any>(key: string, callback: (value: V) => void): () => void;
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
    onUpdateByValue<V = any>(val: string, callback: (value: V) => void): () => void;
    private publishAllByNull;
    private cleanSub;
    private publishByPaths;
    /**
     * 变化以后内部通知
     */
    private publishByIndex;
    private publishAll;
    notify(key: GetTableFieldsKeys<T>): void;
    set(g: (store: IDBObjectStore) => void): void;
}
export {};
