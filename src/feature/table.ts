import { Database } from "../database";
import { FieldMapValue } from "../mapStore";
import { wrapDbRequest } from "../uitls";


type Constructor<T = any> = new (...args: any[]) => T;


function validateType(
  target: Map<string, FieldMapValue>,
  source: Record<string, any>
) {

  // for (let [k, v] of Object.entries(source)) {
  //   if (!(v instanceof target.get(k).type)) {
  //     return false;
  //   }
  // }
  return true;
}


export class TableModel<T extends Constructor = Constructor> {
  constructor(
    private readonly model: T,
    public readonly database: InstanceType<typeof Database>
  ) {
    this.initialize();
  }

  private get tableFields() {
    return this.model.prototype.fields;
  }
  private get tableName() {
    return this.model.prototype.tableName;
  }

  private get primary() {
    return this.model.prototype.primaryKey;
  }

  private hasInPrimary(obj: any): boolean {
    if (!this.primary.autoIncrement) {
      let pid = obj[this.primary.fieldName];
      if (pid === undefined || pid === null) {
        return false;
      }
    }

    return true;
  }
  private initialize() {
    this.database.registere(this.tableName, this.tableFields, this.primary);
  }

  async query(conditions: InstanceType<T>): Promise<T>
  async query(primary: string | number): Promise<T>
  async query(conditions: T | string | number): Promise<T> {
    await this.database.ensureInitialized();


    const [store, complete] = this.requestTransaction<T>();
    if (Object.prototype.toString.call(conditions) === '[object Object]') {
      const val = await wrapDbRequest<T>(store.get(conditions[this.primary.fieldName]));
      await complete;
      return val;
    }

    const val = await wrapDbRequest<T>(store.get(conditions as string | number));
    await complete;
    return val;
  }

  async queryAll(conditions: InstanceType<T>): Promise<T>
  async queryAll(primary: string | number): Promise<T>
  async queryAll(conditions: T | string | number): Promise<T> {
    await this.database.ensureInitialized();

    const [store, complete] = this.requestTransaction<T>();
    if (Object.prototype.toString.call(conditions) === '[object Object]') {
      const val = await wrapDbRequest<T>(store.getAll(conditions[this.primary.fieldName]));
      await complete;
      return val;
    }

    const val = await wrapDbRequest<T>(store.getAll(conditions as string | number));
    await complete;
    return val;
  }

  // async update(primary: string | number, next: Partial<InstanceType<T>>): Promise<T>
  // async update(next: Partial<InstanceType<T>>, nextObj?: Partial<InstanceType<T>>): Promise<T>
  async update(conditions: Partial<InstanceType<T>>): Promise<T> {

    await this.database.ensureInitialized();

    const [store, complete] = this.requestTransaction<T>();
    let val = null;

    if (Object.prototype.toString.call(conditions) === '[object Object]') {

      if (!validateType(this.tableFields, conditions)) {
        throw Error("type error");
      }

      val = await wrapDbRequest<T>(store.put(conditions));
    }

    // let primaryKey = this.primary.fieldName;

    //   if (this.hasInPrimary(conditions)) {
    //     val = await wrapDbRequest<T>(store.put(conditions));
    //   }
    // }
    // else {
    //   val = await wrapDbRequest(store.put(next, conditions));
    // }

    // console.log(val);
    await complete;
    return val;
  }

  async delete(id: IDBValidKey): Promise<boolean> {
    await this.database.ensureInitialized();
    const [store, complete] = this.requestTransaction<T>();

    await wrapDbRequest(store.delete(id));
    // 如果不存在就返回false
    await complete;
    return true
  }

  async clear() {
    await this.database.ensureInitialized();
    const [store, complete] = this.requestTransaction<T>();

    wrapDbRequest(store.clear());
    return complete;
  }
  /**
   * 删除当前表
   * @returns void
   */
  async deleteTable() {
    await this.database.ensureInitialized();

    return this.database.db.deleteObjectStore(this.tableName);
  }

  forEach(callback: (value: InstanceType<T>) => void) {
    const database = this.database;
    const tableName = this.tableName;
    void async function main() {

      await database.ensureInitialized();
      const store = database.db.transaction(tableName, "readonly")
        .objectStore(tableName);
      store.openCursor().onsuccess = (event) => {
        //@ts-ignore
        const cursor = event.target.result;
        if (cursor) {
          callback(cursor.value);
          cursor.continue();
        }
      }

    }();

  }


  private requestTransaction<T = any>(
    success?: any,
    error?: any,
    mode: IDBTransactionMode = "readwrite"): [IDBObjectStore, Promise<T>, (r: T) => void, (r: Error | string) => void] {
    let tr = this.database.db.transaction(this.tableName, mode);

    let store = tr.objectStore(this.tableName);
    let promiseResolve: (r: T) => void = null;
    let promiseReject: (r: Error) => void = null;

    let promise = new Promise<T>((resolve, reject) => {
      promiseResolve = resolve;
      promiseReject = reject;
      tr.onerror = e => {
        reject(typeof error === "function" ? error(e) : e);
      };
      tr.oncomplete = e => {
        // @ts-ignore
        resolve(typeof success === "function" ? success(e) : e);
      };
    });


    return [store, promise, promiseResolve, promiseReject];
  }

  /**
   * 如果存在返回true
   */
  async has(id: IDBValidKey): Promise<boolean> {

    const [store, complete, resolve, reject] = this.requestTransaction<boolean>(
      (e) => {
        return e.target.error === null;
      }
    );

    const count = await wrapDbRequest<number>(store.count(id));
    return count !== 0;
  }

  /**
   * 添加一条记录
   * @param row T
   * @returns boolean
   */
  async append(row: InstanceType<T>): Promise<boolean> {
    await this.database.ensureInitialized();

    if (!this.hasInPrimary(row)) {
      throw Error("没有id");
    }

    if (!validateType(this.tableFields, row)) {
      throw Error("type error");
    }

    const [store, complete, resolve, reject] = this.requestTransaction<boolean>(
      (e) => {
        return e.target.error === null;
      }
    );

    const primary = row[this.primary.fieldName];
    const count = await wrapDbRequest<number>(store.count(primary));

    if (count !== 0) {
      reject(`${primary} exist`);
      return false;
    }
    await wrapDbRequest(store.add(row));
    return complete;
  }

}




type Fileds = { [k in string]: Omit<FieldMapValue, "fieldName"> };

export interface ModelSchema {
  primaryKey: string;
  tableName: string;
  autoIncrement: boolean;
  fields: Fileds
}
type FieldKeys<T extends Fileds = Fileds> = keyof T;

export class TableModelForSchema<T extends ModelSchema = ModelSchema> {

  constructor(
    private readonly schema: T,
    private readonly database: Database
  ) {
    this.initialize();
  }


  private get tableFields() {
    return this.schema.fields;
  }
  private get tableName() {
    return this.schema.tableName;
  }

  private get primary() {
    return this.schema.primaryKey;
  }

  private hasInPrimary(obj: any): boolean {

    if (!this.schema.autoIncrement) {
      let pid = obj[this.primary];
      if (pid === undefined || pid === null) {
        return false;
      }
    }

    return true;
  }


  fieldsMap = new Map();
  private initialize() {
    const map = this.fieldsMap = new Map();
    for (let [k, v] of Object.entries(this.tableFields)) {
      map.set(k, v)
    }

    this.database.registere(this.tableName, map, {
      //@ts-ignore
      fieldName: this.primary,
      autoIncrement: this.schema.autoIncrement ?? true
    });
  }


  async query<R extends Record<string, any> = Record<keyof T["fields"], any>>(conditions: string | number | Record<FieldKeys<T["fields"]>, any>): Promise<R> {
    await this.database.ensureInitialized();


    const [store, complete] = this.requestTransaction<T>();
    if (Object.prototype.toString.call(conditions) === '[object Object]') {
      const val = await wrapDbRequest<T>(store.get(conditions[this.primary]));
      await complete;
      return val as unknown as R;
    }

    const val = await wrapDbRequest<T>(store.get(conditions as string | number));
    await complete;
    return val as unknown as R;
  }

  async queryAll(conditions: string | number | Record<FieldKeys<T["fields"]>, any>): Promise<T> {

    await this.database.ensureInitialized();

    const [store, complete] = this.requestTransaction<T>();
    if (Object.prototype.toString.call(conditions) === '[object Object]') {
      const val = await wrapDbRequest<T>(store.getAll(conditions[this.primary]));
      await complete;
      return val;
    }

    const val = await wrapDbRequest<T>(store.getAll(conditions as string | number));
    await complete;
    return val;
  }

  // async update(primary: string | number, next: Partial<InstanceType<T>>): Promise<T>
  // async update(next: Partial<InstanceType<T>>, nextObj?: Partial<InstanceType<T>>): Promise<T>
  async update(conditions: Record<FieldKeys<T["fields"]>, any>): Promise<T> {

    await this.database.ensureInitialized();

    const [store, complete] = this.requestTransaction<T>();
    let val = null;

    if (Object.prototype.toString.call(conditions) === '[object Object]') {
      if (!validateType(this.fieldsMap, conditions)) {
        throw Error("type error");
      }

      val = await wrapDbRequest<T>(store.put(conditions));
    }

    // let primaryKey = this.primary.fieldName;

    //   if (this.hasInPrimary(conditions)) {
    //     val = await wrapDbRequest<T>(store.put(conditions));
    //   }
    // }
    // else {
    //   val = await wrapDbRequest(store.put(next, conditions));
    // }

    // console.log(val);
    await complete;
    return val;
  }

  async clear() {
    await this.database.ensureInitialized();
    const [store, complete] = this.requestTransaction<T>();
    wrapDbRequest(store.clear());
    return complete;
  }

  async delete(id: IDBValidKey): Promise<boolean> {
    await this.database.ensureInitialized();
    const [store, complete] = this.requestTransaction<T>();

    await wrapDbRequest(store.delete(id));
    // 如果不存在就返回false
    await complete;
    return true
  }

  /**
   * 删除当前表
   * @returns void
   */
  async deleteTable() {
    await this.database.ensureInitialized();
    return this.database.db.deleteObjectStore(this.tableName);
  }

  forEach(callback: (value: T["fields"]) => void) {
    const database = this.database;
    const tableName = this.tableName;
    void async function main() {

      await database.ensureInitialized();
      const store = database.db.transaction(tableName, "readonly")
        .objectStore(tableName);
      store.openCursor().onsuccess = (event) => {
        //@ts-ignore
        const cursor = event.target.result;
        if (cursor) {
          callback(cursor.value);
          cursor.continue();
        }
      }

    }();

  }


  private requestTransaction<T = any>(
    success?: any,
    error?: any,
    mode: IDBTransactionMode = "readwrite"): [IDBObjectStore, Promise<T>, (r: T) => void, (r: Error | string) => void] {
    let tr = this.database.db.transaction(this.tableName, mode);

    let store = tr.objectStore(this.tableName);
    let promiseResolve: (r: T) => void = null;
    let promiseReject: (r: Error) => void = null;

    let promise = new Promise<T>((resolve, reject) => {
      promiseResolve = resolve;
      promiseReject = reject;
      tr.onerror = e => {
        reject(typeof error === "function" ? error(e) : e);
      };
      tr.oncomplete = e => {
        // @ts-ignore
        resolve(typeof success === "function" ? success(e) : e);
      };
    });


    return [store, promise, promiseResolve, promiseReject];
  }

  /**
   * 如果存在返回true
   */
  async has(id: IDBValidKey): Promise<boolean> {
    await this.database.ensureInitialized();

    const [store] = this.requestTransaction<boolean>(
      (e) => {
        return e.target.error === null;
      }
    );

    const count = await wrapDbRequest<number>(store.count(id));
    return count !== 0;
  }

  /**
   * 添加一条记录
   * @param row T
   * @returns boolean
   */
  async append(row: Record<FieldKeys<T["fields"]>, any>): Promise<boolean> {
    await this.database.ensureInitialized();

    if (!this.hasInPrimary(row)) {
      throw Error("没有id");
    }

    if (!validateType(this.fieldsMap, row)) {
      throw Error("type error");
    }

    const [store, complete, resolve, reject] = this.requestTransaction<boolean>(
      (e) => {
        return e.target.error === null;
      }
    );

    const primary = row[this.primary];
    if (primary !== undefined) {
      const count = await wrapDbRequest<number>(store.count(primary));

      if (count !== 0) {
        reject(`${primary} exist`);
        return false;
      }
    }
    else {
      if (!this.schema.autoIncrement) {
        reject("autoIncrement is false, " + this.primary + "is not defined");
      }
    }
    await wrapDbRequest(store.add(row));
    return complete;
  }


  subscribe() {
    throw Error("方法为完成");
  }

  
}