// @ts-nocheck


export class TableTransaction {



  private trans: IDBTransaction = null;
  private store: IDBObjectStore = null;

  constructor(
    private db: IDBDatabase
  ) {
  }


  select(tableName, mode: IDBTransactionMode = "readwrite") {
    const trans = this.trans = this.db.transaction(tableName, mode);
    this.store = trans.objectStore(tableName);
    return this;
  }

  abort(): void {
    this.trans.abort();
  }

  commit() {
    this.trans.commit();
    return this;
  }
}
