import { buildExecutableFunction, RunCallback } from "./function";
import { toJsUrl } from "./toJsUrl";
import { executeInWorker } from "./work";



export function loop(callback: RunCallback, ms: number, immediate = true) {

  let executeable = buildExecutableFunction(callback, "execute", false);

  let rawExecute = `

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

    await execute(resolve, reject);

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

  if (immediate) {
    execute(resolve, reject);
    startTime = Date.now();
    setTimeout(runLoop, loopMs);
  }

  `;

  // console.log(rawExecute);

  return executeInWorker(toJsUrl(rawExecute));
}

