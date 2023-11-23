import { PrimaryMapValue, TableField } from "./mapStore";
import { requestPromise } from "./uitls";
export interface IDatabase {
    version: number;
    name: string;
}
export declare class Database {
    private options;
    private currentVersion;
    private initialized;
    private primaryKeyMap;
    private stores;
    db: IDBDatabase | null;
    constructor(options: IDatabase);
    opendPromise: ReturnType<typeof requestPromise<IDBDatabase | undefined>> | null;
    /**
     * 初始化打开数据库
     */
    private openDatabase;
    /**
     * 升级时注册store
     * */
    private registorStore;
    ensureInitialized(): Promise<void>;
    registere(tableName: string, tableFields: Map<string, TableField>, primary: PrimaryMapValue): void;
    setVersion(nextVersion: number): void;
    get version(): number;
}
