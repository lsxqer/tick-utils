//@ts-nocheck
import { FieldMapValue, PrimaryMapValue, TableField } from "./mapStore";
import { requestPromise } from "./uitls";



export interface IDatabase {
  version: number;
  name: string;
}

export class Database {

  private currentVersion: number;
  private initialized: boolean = false;

  private primaryKeyMap = new Map<string, PrimaryMapValue>();
  private stores = new Map<string, Map<string, TableField>>();

  public db: IDBDatabase | null = null;



  constructor(private options: IDatabase) {
    this.currentVersion = options.version;
  }

  opendPromise: ReturnType<typeof requestPromise<IDBDatabase | undefined>> | null = null;


  /**
   * 初始化打开数据库
   */
  private openDatabase(openDb: IDBOpenDBRequest) {
    this.opendPromise = requestPromise<IDBDatabase>();

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
  private registorStore(openDb: IDBOpenDBRequest,) {
    openDb.onupgradeneeded = (ev: IDBVersionChangeEvent) => {
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
    }
  }

  public async ensureInitialized() {

    if (this.initialized) {
      return;
    }

    let openDb: IDBOpenDBRequest = indexedDB.open(this.options.name, this.version);
    this.registorStore(openDb);
    await this.openDatabase(openDb);

    this.initialized = false;
  }

  public registere(
    tableName: string,
    tableFields: Map<string, TableField>,
    primary: PrimaryMapValue
  ) {
    this.stores.set(tableName, tableFields);
    this.primaryKeyMap.set(tableName, primary);
  }


  public setVersion(nextVersion: number) {

  }



  get version(): number {
    return this.currentVersion;
  }

  // requestTransaction() {
  //   return this.db.transaction;
  // }
}