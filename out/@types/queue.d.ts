import { ExecutionCallback } from "./typedef";
interface Queue {
    nextCallbackQueue: ExecutionCallback[];
}
export declare const callbackQueue: Queue;
export {};
