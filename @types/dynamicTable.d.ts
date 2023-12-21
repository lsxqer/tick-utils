import { Database } from "./database";
import { DynamicTableField } from "./mapStore";
export interface DynamicTableSchema {
    tableName: string;
    fields: {
        [p: string]: DynamicTableField;
    };
}
export declare class DynamicTable {
    private readonly database;
    private readonly indexs;
    private readonly tableName;
    private updated;
    private executable;
    constructor(schema: DynamicTableSchema, database: Database);
    get<T = unknown>(key: string): Promise<T>;
    set(key: string, value: unknown): Promise<boolean>;
    delete(key: string): Promise<boolean>;
    clear(): Promise<boolean>;
    drop(): Promise<void>;
    /**
     * 使用字段循环所有
     * ? 是吗
     */
    forEachByIndex<T = unknown>(key: string, callback: (value: T) => void): void;
    /**
     * 循环所有
     */
    forEach<T = unknown>(callback: (value: T) => void): void;
    onUpdate<T = unknown>(key: string, callback: (value: T) => void): void;
    private publish;
}
