import nextTick from "next-tick";
import { Database } from "./database";
import { requestPromise, wrapDbRequest } from "./uitls";





export class Execable {
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
  private runing = false;

  private async workLoop() {

    if (this.runing) {
      return;
    }

    this.runing = true;
    let queue = this.currentQueue;
    this.currentQueue = [];

    let fn = undefined;
    while ((fn = queue.shift()) !== undefined) {
      await fn();
    }

    if (this.currentQueue.length > 0) {
      nextTick(() => {
        this.workLoop();
      });
    }

    this.runing = false;
  }




  private run<R = any>(cb) {
    return new Promise<R>(async (resolve, reject) => {
      await this.database.ensureInitialized();
      const trs = this.requestTransaction();

      const store = trs.objectStore(this.tableName);

      try {
        const result = await cb(store, {});

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
      } catch (exx) {
        reject(exx);
      }
    });
  }



  async execute<R>(
    cb: (store: IDBObjectStore, context: {}) => IDBRequest | any
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