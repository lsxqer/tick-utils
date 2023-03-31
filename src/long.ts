import { buildExecutableFunction } from "./function";
import { toJsUrl } from "./toJsUrl";
import { createWorker } from "./work";


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
type LastTypes<T> = T extends [any, any, ...infer P] ? P : never;


export function runingCallbackForLong<T extends (wait: () => boolean, ...args: any) => any = (wait: () => boolean, ...args: any) => any>(callback: T): WorkInstance<LastTypes<Parameters<T>>> {

  const funcName = "taskFunction";
  let inputJs = buildExecutableFunction(callback, funcName, false);

  const rawJs = `

    let cancelled = false;
    let waiting = false;

    const wait = () => {
      return waiting;
    };

    ${inputJs}
    
    const emit = (args) => {
      self.postMessage(args);
    };

    const run = async (args) => {
      waiting = false;
      do {
        let post = false;

        let res = await ${funcName}(
          wait,
          (...args) => {
            post = true;
            emit(args);
          },
          ...args
        );

        if (!post) {
          emit(res);
        }

      } while (!wait() && !cancelled);
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
    startup(...args) {
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
