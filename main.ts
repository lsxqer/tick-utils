/**
 * 
 */

//?======================================

interface ExecutionCallback {
  (): void;
}

const channel = new MessageChannel();

let nextCallbackQueue: ExecutionCallback[] = [];
let processCallbackQueue: ExecutionCallback[] = [];

let BatchingExecution = false;

/**
 * resume 重新开始
 */
function resumeExecutionCallback() {
  BatchingExecution = false;
}

/**
 * pause 暂停执行
 */
function syncPauseExecutionCallback() {
  BatchingExecution = true;
}

function hasInBatchingExecution() {
  return BatchingExecution;
}

/**
 * 根据当前是否执行中执行一个回调函数
 * @param fn callback
 * @returns  void
 */
function runWithExecutionCallback(fn: ExecutionCallback) {
  try {
    return !(hasInBatchingExecution()) && fn();
  } finally {
    syncPauseExecutionCallback();
  }
}


function flushNextPendingExecutionCallbackQueue() {

  let currentCallbackQueue = nextCallbackQueue;
  nextCallbackQueue = processCallbackQueue;

  while (currentCallbackQueue.length > 0) {
    currentCallbackQueue.shift()();
  }

  processCallbackQueue = currentCallbackQueue;

  // 队列不为空， 希望在下一轮循环中执行他们
  if (nextCallbackQueue.length > 0) {
    requestNextLoopExecutionCallback();
  }
  else {
    /**
     * 本轮循环中立即关闭
     * 否则，下一轮循环关闭时会存在未被执行的回调函数
     */
    syncPauseExecutionCallback();
  }
}

function requestNextLoopExecutionCallback() {
  channel.port2.postMessage(null);
}

channel.port1.onmessage = flushNextPendingExecutionCallbackQueue;
channel.port2.onmessage = resumeExecutionCallback;


function schedulerOnCallbackExecution(fn: ExecutionCallback) {
  nextCallbackQueue.push(fn);
  runWithExecutionCallback(requestNextLoopExecutionCallback);
}


function nextTick(fn: ExecutionCallback) {
  schedulerOnCallbackExecution(fn);
}


export {
  nextTick,
  runWithExecutionCallback
};
