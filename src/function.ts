import { toJsUrl } from "./toJsUrl";
import { executeInWorker } from "./work";

export type RunCallback = (
  resolve: (argv: any) => void,
  reject: (reson: any) => void
) => any;


export function buildExecutableFunction<T extends (...args: any) => any = RunCallback>(
  callback: T,
  functionName: string,
  executable = true
) {

  if (callback.name === "") {
    if (executable) {
      return `const ${functionName} = ${callback.toString()};\r\n\r\n ${functionName}(resolve, reject);`;
    }
    return `const ${functionName} = ${callback.toString()};\r\n\r\n`;
  }
  if (executable) {
    return callback.toString() + `;`
  }
  return callback.toString() + `;${callback.name}(resolve, reject);`
}

export function asyncRunCallback(callback: RunCallback) {

  let rawFunction = `
    const resolve = (argv) => {
      self.postMessage(argv);
    };
    const reject = (res) => {
      throw new Error(res);
    };
  
  `+ buildExecutableFunction(callback, "a");

  let jsUrl = toJsUrl(rawFunction);

  return executeInWorker(jsUrl);
}

export function runCallback(callback: RunCallback) {
  return new Promise((resolve, reject) => {

    let fn = Function(
      `resolve, reject`,
      buildExecutableFunction(callback, "func")
    );

    return fn(resolve, reject);
  });

}