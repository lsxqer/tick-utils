export declare function wrapDbRequest<T>(req: IDBRequest): Promise<T>;
export declare function requestPromise<R = any>(): {
    promise: Promise<R>;
    reject: (reson: string | Event) => void;
    resolve: (r: R) => void;
};
