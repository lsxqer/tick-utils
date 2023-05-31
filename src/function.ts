import { buildExecutableFunctionToString, toJsUrl } from "./to";
import { executeInWorker } from "./worker";

export type RunCallback = (
  resolve: (argv?: any) => void,
  reject: (reson: any) => void
) => any;


/**
 * 异步执行一个函数
 * @param callback - 被执行的函数
 * @returns 返回callback传递的参数
 */
export function asyncRunCallback<T = any>(callback: RunCallback) {

  let rawFunction = `
    const resolve = (argv) => {
      self.postMessage(argv);
    };
    const reject = (res) => {
      throw new Error(res);
    };
  
  `+ buildExecutableFunctionToString(callback, "func");

  let jsUrl = toJsUrl(rawFunction);

  return executeInWorker<T>(jsUrl);
}

/**
 * 同步执行
 * @param callback - 被执行的函数
 * @returns 返回callback传递的参数
 */
export function runCallback(callback: RunCallback) {
  return new Promise((resolve, reject) => {

    let fn = Function(
      `resolve, reject`,
      buildExecutableFunctionToString(callback, "func")
    );

    return fn(resolve, reject);
  });

}