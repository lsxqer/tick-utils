import { Database } from "./database";
export declare class Execable {
    private readonly database;
    private readonly tableName;
    constructor(database: Database, tableName: string);
    /**
     * 请求操作的事务
     */
    private requestTransaction;
    private currentQueue;
    private runing;
    private workLoop;
    private run;
    execute<R>(cb: (store: IDBObjectStore, context: {}) => IDBRequest | any): Promise<R | null>;
}
