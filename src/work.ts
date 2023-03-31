

/**
 * 立即执行一段代码，并在代码执行完成后结束promise
 * @param jsUrl 一个blob的jsdata:url
 * @returns 完成时的promise
 */
export function executeInWorker(jsUrl: string): Promise<null> {
  let work: Worker;

  return new Promise((resolve, reject) => {
    work = new Worker(jsUrl);
    work.onerror = reject;
    work.onmessage = () => resolve(null);
  })
    .finally(() => {
      work.terminate();
    });
}
executeInWorker.defaultJs = `
  self.postMessage(null);
`;



export function createWorker(jsUrl: string): Worker {
  let work = new Worker(jsUrl);
  return work;
}