import { runWithBatchingExecution } from "./batching";
import { requestNextLoopExecutionCallback } from "./nextLoop";
import { callbackQueue } from "./queue";
export function schedulerOnCallbackExecution(fn) {
    callbackQueue.nextCallbackQueue.push(fn);
    runWithBatchingExecution(requestNextLoopExecutionCallback);
}
