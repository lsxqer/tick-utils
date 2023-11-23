
import { ExecutionCallback } from "./typedef";

let BatchingExecution = true;

/**
 * resume 重新开始
 */
export function resumeExecutionCallback() {
  BatchingExecution = true;
}

/**
 * pause 暂停执行
 */
export function pauseExecutionCallback() {
  BatchingExecution = false;
}

/**
 * false -> 执行中
 * @returns bool
 */
export function hasInExecution() {
  return BatchingExecution;
}



export function runWithBatchingExecution(callback: ExecutionCallback) {
  try {
    const next = hasInExecution();
    if (next) {
      return callback();
    }
  } finally {
    pauseExecutionCallback();
  }
}

