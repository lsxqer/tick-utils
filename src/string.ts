import { toJsUrl } from "./to";
import { executeInWorker } from "./worker";




/**
 * 
 * @param jsRaw -  一个字符串类型可被执行的js代码
 * @returns 全局函数complete的参数
 */
export function asyncRunString<T = any>(jsRaw: string) {
  const raw = `
  const complete = (argv) => {
    self.postMessage(argv);
  };

  ${jsRaw}
  `;
  const jsurl = toJsUrl(raw);
  return executeInWorker<T>(jsurl);
}



/**
 * 
 * @param jsRaw - 一个字符串类型可被执行的js代码
 * @returns 
 */
export function runString(jsRaw: string) {
  return Function(jsRaw)();
}