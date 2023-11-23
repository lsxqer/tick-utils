import { Database } from "./database";
import { TableField } from "./mapStore";
import { Subscrition } from "./subscriberChannel";
import { requestPromise, wrapDbRequest } from "./uitls";
import { nextTick } from "next-tick";


export type Types = StringConstructor |
  BooleanConstructor |
  NumberConstructor |
  DateConstructor |
  ArrayConstructor |
  ObjectConstructor;



function validateType(
  target: Map<string, TableField>,
  source: Record<string, any>
) {

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


function equals(tar: unknown, val: unknown): boolean {
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


export interface TableFields {
  [p: string]: TableField
}


class ActionContext {
  constructor(
    private readonly database: Database,
    private readonly tableName: string
  ) { }


  /**
   * 请求操作的事务
   */
  private requestTransaction(): IDBTransaction {
    return this.database.db.transaction(this.tableName, "readwrite");
  }




  private currentQueue: VoidFunction[] = [];

  private run<R = any>(cb) {

    return new Promise<R>(async (resolve, reject) => {

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
          resolve(r === undefined ? null : r as R);
        }
      }
      else {
        resolve(result);
      }
    });
  }


  private async flushQueue(queue: VoidFunction[]) {

    let fn = undefined;
    while ((fn = queue.shift()) !== undefined) {
      await fn();
    }
  }

  private runing = false;
  private async workLoop() {

    if (this.runing) {
      return;
    }

    this.runing = true;
    let queue = this.currentQueue;
    this.currentQueue = [];

    await this.flushQueue(queue);

    if (this.currentQueue.length > 0){
      nextTick(() =>{ 
        this.workLoop();
      });
    }

    this.runing = false;
  }

  async execute<R>(
    cb: (store: IDBObjectStore, context: { reject: (reson: any) => void }) => IDBRequest | any
  ): Promise<R | null> {

    let feat = requestPromise();

    const loop = async () => {
      let r = await this.run(cb);
      feat.resolve(r);
    };

    this.currentQueue.push(loop);

    try {
      return feat.promise;
    } finally {
      this.workLoop();
    }
  }
}


type GetTableFields<T extends TableFields> = { [k in keyof T]?: unknown };
type GetTableFieldsKeys<T extends TableFields> = keyof T extends string ? keyof T : never;




export class TableAction<T extends TableFields = TableFields> {
  // public primaryKey: GetTableFieldsKeys<T>;
  public primaryKeys: string[];
  public autoIncrement: boolean = false;
  private tableMap: Map<GetTableFieldsKeys<T>, TableField>;
  private ctx: ActionContext;

  private onUpdated = new Subscrition();

  constructor(
    public readonly tableName: string,

    /**
     * 
     * 
     * 
     */
    private readonly tableFields: T,
    private readonly database: Database
  ) {
    this.ctx = new ActionContext(database, tableName);
  }


  private getIndex(k: GetTableFieldsKeys<T>): string | null {
    let i = this.tableMap.get(k).index;

    return typeof i === "string" ? i : i === true ? k as string : null;
  }

  private getPrimaryValue() {

  }



  /**
   * 变化以后内部通知
   */
  private publish(key: GetTableFieldsKeys<T>, value: GetTableFields<T>) {
    setTimeout(() => {
      // let keyIndex = this.getIndex(key as GetTableFieldsKeys<T>);
      // if (keyIndex !== null) {
      // }
      this.onUpdated.publish(key, value);
    }, 0);
  }

  // 如果存在所有的key
  private publishAll(all: GetTableFields<T>) {
    // let kv: any = {};
    // let keys = Object.keys(all);

    // for (let k of keys) {
    //   let keyIndex = this.getIndex(k as GetTableFieldsKeys<T>);
    //   if (keyIndex !== null) {
    //     kv[keyIndex] = all[k];
    //   }
    // }

    setTimeout(() => {
      this.onUpdated.publishAll(all);
    }, 0);
  }

  public notiify(key: GetTableFieldsKeys<T>) {
    setTimeout(() => {
      // let keyIndex = this.getIndex(key as GetTableFieldsKeys<T>);
      // if (keyIndex !== null) {
      // }
      this.onUpdated.publish(key, null);
    }, 0);
  }

  protected initialize() {
    let tableName = this.tableName;
    let fields = this.tableFields;

    let keys = Object.keys(fields) as GetTableFieldsKeys<T>[];
    let primaryKey: string[] = [];
    let autoIncrement: boolean = false;

    const map = new Map<GetTableFieldsKeys<T>, TableField>();

    for (let el of keys) {
      let val = fields[el];
      if (val.primaryKey === true) {
        primaryKey.push(el)
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
    this.primaryKeys = primaryKey as any;
    this.autoIncrement = autoIncrement;
    // todo: 注册时注意默认值
    this.database.registere(this.tableName, map, {
      fieldName: primaryKey,
      autoIncrement
    });
  }


  protected hasInPrimary(obj: GetTableFields<T>) {
    if (!this.autoIncrement) {
      for (let k of this.primaryKeys) {
        if (obj[k] === undefined) {
          return false;
        }
      }
    }
    return true;
  }


  protected validatePrimaryValue(obj: GetTableFields<T>) {

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
  public async queryAll<R = unknown>() {
    return this.ctx.execute<R>(store => {
      return store.getAll();
    });
  }

  private isQueryAll = false;
  private prevQueryAll = this.isQueryAll;

  public all() {
    this.prevQueryAll = this.isQueryAll;
    this.isQueryAll = true;
    return this;
  }

  private queryRollBack(): boolean {
    let queryAll = this.isQueryAll;
    this.isQueryAll = this.prevQueryAll;
    return queryAll;
  }


  /**
   * 使用主键查询
   */
  public async queryBy<R = unknown>(primary: IDBValidKey) {
    return this.ctx.execute<R>(store => {
      return store.get(primary);
    });
  }

  /**
   * 使用字段索引查询
   */
  public async queryByIndex<R = unknown>(key: GetTableFieldsKeys<T>, val: IDBValidKey) {
    let ql = this.queryRollBack();
    return this.ctx.execute<R>(async (store) => {
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
  public async queryOr<R = unknown>(obj: GetTableFields<T>) {
    let ql = this.queryRollBack();
    return this.ctx.execute<R>(async (store) => {

      return new Promise<any | any[]>(res => {
        let kes = Object.keys(obj);
        const surs = store.
          openCursor();

        if (!ql) {
          surs.onsuccess = (e: any) => {
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
            } else {
              res(null);
            }
          };
        }
        else {
          const resList = [];
          surs.onsuccess = (e: any) => {
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
  public async queryAnd<R = unknown>(obj: GetTableFields<T>) {
    let ql = this.queryRollBack();
    return this.ctx.execute<R>(async (store) => {

      return new Promise<any | any[]>(res => {
        let kes = Object.keys(obj);
        const surs = store.
          openCursor();

        if (!ql) {
          surs.onsuccess = (e: any) => {
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
            } else {
              res(null);
            }
          };
        }
        else {
          const resList = [];
          surs.onsuccess = (e: any) => {
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
  public async include<R = unknown>(key: GetTableFieldsKeys<T>, val: IDBValidKey) {
    // let ql = this.queryRollBack();
    return this.ctx.execute<R>(async (store) => {

      let index = store.index(this.getIndex(key));
      let res = [];

      if (Array.isArray(val)) {
        for (let el of val) {
          let v = await wrapDbRequest<any[]>(index.getAll(el));
          res.push(...v);
        }
      }
      else {
        res = await wrapDbRequest<any[]>(index.getAll(val));
      }
      return res;
    });
  }


  /**
   * 不包含的
   */
  public async exclude<R = unknown>(key: GetTableFieldsKeys<T>, val: IDBValidKey) {

    return this.ctx.execute<R>(async (store) => {

      let index = store.index(this.getIndex(key));
      let res = [];

      if (Array.isArray(val)) {
        for (let el of val) {
          let v = await wrapDbRequest<any[]>(index.getAll());
          res.push(...v.filter(e => !val.includes(e)));
        }
      }
      else {
        let r = await wrapDbRequest<any[]>(index.getAll());
        res = r.filter(e => equals(e, val));
      }
      return res;
    });
  }

  async has(id: IDBValidKey) {
    return this.ctx.execute<boolean>(async (store) => {
      let c = await wrapDbRequest(store.count(id));
      console.log(c);
      return c !== 0;
    });
  }

  private async hasAll(row: GetTableFields<T>) {
    for (let key of this.primaryKeys) {
      let v = row[key];
      // 如果存在一个就返回true
      if (await this.has(v as IDBValidKey)) {
        return true;
      }
    }
    return false;
  }

  /**
   * 使用主键更新
   */
  public async updateBy(next: GetTableFields<T>): Promise<boolean> {
    if (!this.hasInPrimary(next)) {
      throw Error("使用主键索引更新, next 必须存在主键");
    }

    if (!validateType(this.tableMap, next)) {
      throw Error("type error");
    }

    return this.ctx.execute<boolean>((store) => {
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
  public async updateByIndex(key: GetTableFieldsKeys<T>, val: unknown, next: GetTableFields<T>) {
    if (this.hasInPrimary(next)) {
      throw Error("使用索引更新, next不能存在主键");
    }

    if (!validateType(this.tableMap, next)) {
      throw Error("type error");
    }

    return this.ctx.execute(store => {
      return new Promise(r => {
        store.index(this.getIndex(key)).openCursor().onsuccess = ((e: { target: { result: IDBCursorWithValue } }) => {
          const cursor = e.target.result;
          if (cursor) {
            let src = cursor.value;
            if (equals(src[key], val)) {
              for (let [key, v] of Object.entries(next)) {
                src[key] = v;
              }
              r(cursor.update(src));
              this.publish(key, val as any)
            }
            cursor.continue();
          }
        }) as any;
      });
    });
  }

  /**
   * 使用主键更新
   */
  async deleteBy(primary: IDBValidKey) {
    return this.ctx.execute(async store => {
      let item = await wrapDbRequest<any>(store.get(primary));
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
  async deleteByIndex(key: GetTableFieldsKeys<T>, val: unknown) {
    return this.ctx.execute(store => {
      return new Promise(r => {
        store.index(this.getIndex(key)).openCursor().onsuccess = ((e: { target: { result: IDBCursorWithValue } }) => {
          const cursor = e.target.result;
          if (cursor) {
            if (equals(cursor.value[key], val)) {
              r(cursor.delete());
              this.publish(key, val as any);
            }
            cursor.continue();
          }
        }) as any;
      })
    });
  }

  async deleteOrByIndexs(key: GetTableFieldsKeys<T>, val: unknown[]) {
    return this.ctx.execute(store => {
      return new Promise(r => {
        store.index(this.getIndex(key)).openCursor().onsuccess = ((e: { target: { result: IDBCursorWithValue } }) => {
          const cursor = e.target.result;
          if (cursor) {
            if (val.includes(cursor.value[key])) {
              r(cursor.delete());
              this.publish(key, cursor.value[key] as any);
            }
            cursor.continue();
          }
        }) as any;
      })
    });
  }

  /**
   * 清空表
   */
  async clear() {
    return this.ctx.execute(store => {
      let all = Object.keys(this.tableFields).reduce(
        (p, a) => {
          p[a] = null;
          return p
        },
        {}
      );

      this.publishAll(all);
      return store.clear();
    });
  }

  /**
   * 删除表
   */
  drop() {
    let all = Object.keys(this.tableFields).reduce(
      (p, a) => {
        p[a] = null;
        return p
      },
      {}
    );

    this.publishAll(all);
    this.database.db.deleteObjectStore(this.tableName);
  }

  /**
   * 使用字段循环所有
   * ? 是吗
   */
  forEachByIndex(key: GetTableFieldsKeys<T>, callback: (value: GetTableFields<T>) => void) {
    this.ctx.execute(store => {

      store.index(key).openCursor().onsuccess = (event) => {
        //@ts-ignore
        const cursor = event.target.result;
        if (cursor) {
          callback(cursor.value);
          cursor.continue();
        }
      }
    });

  }

  /**
   * 循环所有
   */
  forEach(callback: (value: GetTableFields<T>) => void) {
    this.ctx.execute(store => {
      store.openCursor().onsuccess = (event) => {
        //@ts-ignore
        const cursor = event.target.result;
        if (cursor) {
          callback(cursor.value);
          cursor.continue();
        }
      }
    });
  }

  /**
   * 查询是否存在，如果存在就不添加了
   */
  public async save(row: GetTableFields<T>): Promise<boolean> {

    let exsit = await this.hasAll(row);
    console.log(exsit, "es");
    // 不存在就添加
    if (!exsit) {
      return await this.append(row)
    };
    return await this.updateBy(row);
  }

  /**
   * 天津一条
   */
  public async append(row: GetTableFields<T>): Promise<boolean> {

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
          const count = await wrapDbRequest<number>(store.count(k));
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
  public onUpdate<V = any>(key: GetTableFieldsKeys<T>, callback: (value: V) => void) {
    return this.onUpdated.subscribe(key as string, callback);
  }
}


// new TableAction({
//   a: {
//     index: true,
//     unique: false,
//   }
// }, {} as any,)
//   .queryByIndex("a", 1);
