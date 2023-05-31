
import { buildExecutableFunctionToString, toJsUrl } from "./to";
import { createWorker } from "./worker";



type LastTypes<T> = T extends [any, (...args: any[]) => void, ...infer P] ? P : T extends [any, ...infer P] ? P : never;

interface WorkInstance<T extends any[]> {
  /** 开始执行这个任务 */
  startup(...argv: T): void;
  /** 添加对这个任务执行的监听器 */
  listen(listener: (...args: any[]) => void): void;
  /** 暂停一会 */
  stop(): void;
  /** 取消/销毁这个任务 */
  cancel(): void;
  /** 是否执行中  */
  executing: boolean;
}


/**
 * 
 * @param callback - 被执行的函数
 * @param staticState - 可选的参数，会保存在函数之外，可被json序列化的参数
 * @returns WorkInstance 类型
 * 
 * @example
 * const inst = runTaskInWorker(
 *    async (wait,state, a: string) => {
 *      while (!(await wait())) {
 *        console.log("runTaskInWorker",state, a);
 *      }
 *    },
 *  {count: 1}
 *  );
 *
 *  inst.startup("abc");
 *
 *  setTimeout(() => {
 *    inst.stop();
 *    setTimeout(() => {
 *      inst.startup("fkskks");
 *      setTimeout(() => {
 *        inst.stop();
 *      }, 50);
 *    }, 50)
 *  }, 50);
 */
function runTaskInWorker<
  T extends (wait: () => boolean, ...args: any[]) => any = (wait: () => boolean, ...args: any) => any
>(callback: T, staticState?: any): WorkInstance<LastTypes<Parameters<T>>>
// function runTaskInWorker<
//   T extends (wait: () => boolean, post: (...args: any[]) => void, ...args: any) => any = (wait: () => boolean, post: (...args: any[]) => void, ...args: any) => any
// >(callback: T): WorkInstance<LastTypes<Parameters<T>>>
{
  const funcName = "taskFunction";
  let inputJs = buildExecutableFunctionToString(callback, funcName, false);
  let state: any = null;
  if (staticState != undefined) {
    state = JSON.stringify(staticState);
  }

  const rawJs = `
    const { port1, port2 } = new MessageChannel();
    const state = ${state};
    let cancelled = false;
    let waiting = false;

    let resolve = null;

    port2.onmessage = () => {
      resolve(waiting);
    };

    const shouldYield = () => {
      return new Promise(r => {
        resolve = r;
        port1.postMessage(null);
      });
    };


    ${inputJs}
    
    const emit = (args) => {
      self.postMessage(args);
    };

    const run = async (args) => {
      waiting = false;

      let params = [...args];
      if (state != null) {
        params.unshift(state);
      }

      params.unshift(shouldYield);

      do {
        if (cancelled) break;
        let post = false;

        let res = await ${funcName}(
          ...params
        );
        emit(res);
      } while (!(await shouldYield()));
    };


    self.addEventListener("message", e => {
      let data = e.data;

      switch (data.type) {
        case "startup":
          run(data.payload);
          break;
        case "stop":
          waiting = true;
          break;
        case "cancel":
          cancelled = true;
          close();
          break;
        default:
          break;
      }
    });

  `;

  const jsUrl = toJsUrl(rawJs);
  const work = createWorker(jsUrl);

  const listeners = [] as any[];

  work.onmessage = e => listeners.forEach(fn => fn(...e.data));

  // 向work发送消息，采用锁机制设置
  let _executing = false;
  const workInst = {
    get executing() {
      return _executing;
    },
    startup(...args: any[]) {
      _executing = true;
      work.postMessage({ type: "startup", payload: args });
    },
    stop() {
      _executing = false;
      work.postMessage({ type: "stop" });
    },
    cancel() {
      _executing = false;
      work.postMessage({ type: "cancel" });
    },
    listen(fn) {
      listeners.push(fn);
    }
  };

  return workInst;
}


export { runTaskInWorker };