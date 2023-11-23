import { resumeExecutionCallback } from "./batching";
import { requestNextLoopExecutionCallback } from "./nextLoop";
import { callbackQueue } from "./queue";
import { markStartTime, shouldYieldWithStart } from "./slice";
let currentCallbackQueue = null;
function requestCurrentQueue() {
    if (currentCallbackQueue !== null) {
        return currentCallbackQueue;
    }
    if (callbackQueue.nextCallbackQueue.length > 0) {
        currentCallbackQueue = callbackQueue.nextCallbackQueue;
        callbackQueue.nextCallbackQueue = [];
        return currentCallbackQueue;
    }
    return null;
}
function shouldNextLoop() {
    if (currentCallbackQueue !== null) {
        return true;
    }
    if (callbackQueue.nextCallbackQueue.length > 0) {
        return true;
    }
    return false;
}
export function flushCurrentCallback() {
    markStartTime();
    let queue = requestCurrentQueue();
    if (queue === null) {
        return;
    }
    while (queue.length > 0 && !shouldYieldWithStart()) {
        let callback = queue.shift();
        callback();
    }
    if (queue.length === 0) {
        currentCallbackQueue = null;
    }
}
export function nextLoopFlushCallbackQueue() {
    flushCurrentCallback();
    // 队列不为空， 我希望在下一轮循环中执行他们
    if (shouldNextLoop()) {
        requestNextLoopExecutionCallback();
    }
    else {
        // 本轮循环中立即关闭，否增，下一轮循环关闭时会存在未被执行的回调函数
        resumeExecutionCallback();
    }
}
