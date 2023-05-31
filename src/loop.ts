import { RunCallback } from "./function";
import { buildExecutableFunctionToString, toJsUrl } from "./to";
import { executeInWorker } from "./worker";



/**
 * 
 * @param ms - 间隔多少毫秒执行
 * @param immediate - 是否立即执行
 * @param callback - 需要执行的函数
 * 
 * @example
 *  loop(1000, false, (state, res) => {
 *    if (state.count > 10) {
 *      res();
 *    }
 *    state.count++;
 *    console.log(state.count);
 *  }, { count : 1 });
 */
function loop(ms: number, immediate: boolean, callback: RunCallback)
function loop<T = any>(
  ms: number,
  immediate: boolean,
  callback: (
    state: T,
    resolve: (argv?: any) => void,
    reject: (reson: any) => void
  ) => void, staticState: T)
function loop(ms: number, immediate: boolean, callback: any, staticState?: any) {
  let executeable = buildExecutableFunctionToString(callback, "execute", false);

  let localState = "";
  let args = ["resolve", "reject"];
  if (staticState != null) {
    args.unshift("state");
    localState = JSON.stringify(staticState);
  }

  let rawExecute = `
  let state = ${localState};

  let stop = false;
  let loopMs = ${ms};
  let immediate = ${immediate};
  let startTime = 0;
  let timeId = null;

  const resolve = (argv) => {
    stop = true;
    self.postMessage(argv);
  };
  const reject = (res) => {
    stop = true;
    throw new Error(res);
  };

  const isRuning = () => stop;

  ${executeable}

  const cleanTimeout = () => {
    if (timeId !== null) {
      clearTimeout(timeId);
      timeId = null;
    }
  };

  async function runLoop() {
    cleanTimeout();
    // 检查是否继续执行
    if (isRuning()) {
      return;
    }
    let oldTime = startTime;
    let currentTime = Date.now();

    let diff = currentTime - oldTime - loopMs;
    diff = diff < 0 ? 0 : diff;

    await execute(${args.join()});

    // 检查是否继续执行
    if (isRuning()) {
      return;
    }
    let execTime = Date.now() - currentTime;
    // loopMs 需要的间隔时间
    // diff 时间循环的时间
    // execTime 执行函数用的时间
    setTimeout(runLoop, loopMs - diff - execTime);
    startTime = Date.now();
  }


  startTime = Date.now();
  setTimeout(runLoop, loopMs);
  
  if (immediate) {
    startTime = Date.now();
    execute(${args.join()});
  }

  `;


  return executeInWorker(toJsUrl(rawExecute));
}

export { loop };
