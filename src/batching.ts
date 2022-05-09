
import {ExecutionCallback} from "./typedef";

let BatchingExecution = false;

/**
 * resume 重新开始
 */
export function resumeExecutionCallback() {
  BatchingExecution = false;
}

/**
 * pause 暂停执行
 */
export function pauseExecutionCallback() {
  BatchingExecution = true;
}

/**
 * true -> 执行中
 * @returns bool
 */
export function hasInExecution() {
  return BatchingExecution;
}


export function runWithBatchingExecution(callback: ExecutionCallback) {
  try {
    return (!(hasInExecution())) && callback();
  } finally {
    pauseExecutionCallback();
  }
}