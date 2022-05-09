import { runWithBatchingExecution } from "./batching";
import { requestNextLoopExecutionCallback } from "./nextLoop";
import { callbackQueue } from "./queue";
import {ExecutionCallback} from "./typedef";


export function schedulerOnCallbackExecution(fn:ExecutionCallback) {
  callbackQueue.nextCallbackQueue.push(fn);
  runWithBatchingExecution(requestNextLoopExecutionCallback);
}
