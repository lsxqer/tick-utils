import { DynamicTableField, DatabaseStore, PrimaryMapValue, TableField } from "./mapStore";
import { requestPromise } from "./uitls";



export interface IDatabase {
  version: number;
  name: string;
}



export class Database {


  /**
   * tablename -> DatabaseStore
   */
  private stores = new Map<string, DatabaseStore>();
  private initialized: boolean = false;

  public version: number;
  public dbName: string;
  public db: IDBDatabase | null = null;

  constructor(options: IDatabase) {
    this.dbName = options.name;
    this.version = options.version;
  }

  private promise: ReturnType<typeof requestPromise<IDBDatabase | undefined>> | null = null;


  private create(db: IDBDatabase) {

    this.stores.forEach((store, tableName) => {

      if (db.objectStoreNames.contains(tableName)) {
        return;
      }
      let table: IDBObjectStore;
      if (store.primary.length > 0) {
        table = db.createObjectStore(tableName, {
          keyPath: store.primary.length === 1 ? store.primary[0] : store.primary,
          autoIncrement: store.autoIncrement
        });
      }
      else {
        table = db.createObjectStore(tableName);
      }

      store.indexs.forEach((field, key) => {
        table.createIndex(field.index, key, { unique: field.unique });
      });

    });
  }

  private listenupgrade(openDb: IDBOpenDBRequest) {

    openDb.onupgradeneeded = ev => {
      // @ts-ignore
      let db = ev.target.result;

      this.create(db);

      if (this.db === null) {
        this.db = db;
      }
      else {
        this.promise?.resolve(db);
      }

    };

    openDb.onerror = ev => {
      this.promise?.reject(ev);
    };
  }

  private open(openDb: IDBOpenDBRequest) {
    this.promise = requestPromise<IDBDatabase>();
    openDb.onsuccess = () => {
      if (this.db !== null) {
        this.promise?.resolve(this.db);
        return;
      }
      let db = this.db = openDb.result;


      let current = this.stores.keys();
      let all = true;
      let val = null;
      while (!(val = current.next()).done && all) {
        all = db.objectStoreNames.contains(val.value);
      }

      if (all) {
        this.promise.resolve(db);
      }
    };

    openDb.onerror = (exx) => {
      this.promise.reject(exx);
    };

    this.promise.promise.finally(() => {
      this.promise = null;
    });

    return this.promise.promise;
  }




  public async ensureInitialized() {

    if (this.initialized) {
      return;
    }

    let openDb: IDBOpenDBRequest = indexedDB.open(this.dbName, this.version);
    this.listenupgrade(openDb);
    await this.open(openDb);

    this.initialized = false;
  }

  public registere(tableName: string, store: DatabaseStore) {
    this.stores.set(tableName, store);
  }

}
