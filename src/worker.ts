

/**
 * 立即执行一段代码，并在代码执行完成后结束promise
 * @param jsUrl 一个blob的jsdata:url
 * @returns 完成时的promise
 */
export function executeInWorker<T = null>(jsUrl: string): Promise<T> {
  let work: Worker;

  return new Promise<T>((resolve, reject) => {
    work = new Worker(jsUrl);
    work.onerror = reject;
    work.onmessage = (e: MessageEvent<any[]>) => {
      const result = e.data;
      resolve(result as T);
      work.terminate();
    };
  });
}

export function createWorker(jsUrl: string): Worker {
  let work = new Worker(jsUrl);
  return work;
}