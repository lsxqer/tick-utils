// @ts-nocheck

export function wrapDbRequest<T>(req: IDBRequest) {

  return new Promise<T>((resolve, reject) => {
    req.onerror = (e) => {
      reject(e);
    };
    req.onsuccess = e => {
      // @ts-ignore
      resolve(e.target.result);
    }
  });
}





export function requestPromise<R = any>() {

  let resolve: (r: R) => void = null;
  let reject: (reson: string | Event) => void = null;
  let promise = new Promise<R>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return {
    promise, reject, resolve
  };
}
