import nextTick from "next-tick";
import { Database } from "./database";
import { Execable } from "./execable";
import { Types, DynamicTableField } from "./mapStore";
import { Subscrition } from "./subscriberChannel";
import { wrapDbRequest } from "./uitls";




export interface DynamicTableSchema {
  tableName: string;
  fields: { [p: string]: DynamicTableField };
}


export class DynamicTable {

  private readonly indexs: Map<string, DynamicTableField> = new Map();
  private readonly tableName: string;

  private updated: Subscrition = new Subscrition();
  private executable: Execable;

  constructor(
    schema: DynamicTableSchema,
    private readonly database: Database
  ) {

    const tableName = this.tableName = schema.tableName;
    let indexs = this.indexs;
    const store = new Map<string, {
      index?: string;
      unique?: boolean;
    }>();

    for (let [k, v] of Object.entries(schema.fields)) {
      if (v.index !== false) {
        indexs.set(k, {
          index: v.index === true ? k : v.index,
          unique: v.unique,
          type: v.type,
        });

        store.set(k, {
          index: v.index === true ? k : v.index,
          unique: v.unique,
        });
      }
    }

    database.registere(tableName, {
      indexs: store,
      primary: []
    });

    this.executable = new Execable(database, tableName);
  }


  public get<T = unknown>(key: string) {
    return this.executable.execute<T>((store) => {
      return store.get(key);
    });
  }

  public set(key: string, value: unknown) {
    return this.executable.execute<boolean>((store) => {
      try {
        return store.put(value, key);
      } finally {
        this.publish(key, value);
      }
    });
  }

  public delete(key: string) {
    return this.executable.execute<boolean>((store) => {
      try {
        return store.delete(key);
      } finally {
        this.publish(key, null);
      }
    });
  }

  public clear() {
    return this.executable.execute<boolean>(async (store) => {
      try {
        return store.clear();
      } finally {
        const ks = await wrapDbRequest<string[]>(store.getAllKeys());
        ks.forEach(k => {
          this.publish(k, null);
        });
      }
    });
  }

  public async drop() {
    this.database.db.deleteObjectStore(this.tableName);
    this.executable.execute(async (store) => {
      const ks = await wrapDbRequest<string[]>(store.getAllKeys());
      ks.forEach(k => {
        this.publish(k, null);
      });
    });
  }


  /**
   * 使用字段循环所有
   * ? 是吗
   */
  public forEachByIndex<T = unknown>(key: string, callback: (value: T) => void) {
    this.executable.execute(store => {

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
  public forEach<T = unknown>(callback: (value: T) => void) {
    this.executable.execute(store => {
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

  public onUpdate<T = unknown>(key: string, callback: (value: T) => void) {
    this.updated.subscribe(key, callback);
  }


  private publish(key: string, value: unknown) {
    nextTick(() => {
      this.updated.publish(key, value);
    });
  }
}