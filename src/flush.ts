import { pauseExecutionCallback } from "./batching";
import { requestNextLoopExecutionCallback } from "./nextLoop";
import { callbackQueue } from "./queue";

export function flushNextPendingExecutionCallbackQueue() {

  let currentCallbackQueue = callbackQueue.nextCallbackQueue;
  callbackQueue.nextCallbackQueue = callbackQueue.processCallbackQueue;

  while (currentCallbackQueue.length > 0) {
    let callback = currentCallbackQueue.shift();
    callback();
  }

  // 交替执行
  callbackQueue.processCallbackQueue = currentCallbackQueue;

  // 队列不为空， 我希望在下一轮循环中执行他们
  if (callbackQueue.nextCallbackQueue.length > 0) {
    requestNextLoopExecutionCallback();
  }
  else {
    // 本轮循环中立即关闭，否增，下一轮循环关闭时会存在未被执行的回调函数
    pauseExecutionCallback();
  }

}