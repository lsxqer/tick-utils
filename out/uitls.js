// @ts-nocheck
export function wrapDbRequest(req) {
    return new Promise((resolve, reject) => {
        req.onerror = (e) => {
            reject(e);
        };
        req.onsuccess = e => {
            // @ts-ignore
            resolve(e.target.result);
        };
    });
}
export function requestPromise() {
    let resolve = null;
    let reject = null;
    let promise = new Promise((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return {
        promise, reject, resolve
    };
}
