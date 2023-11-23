import { ExecutionCallback } from "./typedef";
/**
 * resume 重新开始
 */
export declare function resumeExecutionCallback(): void;
/**
 * pause 暂停执行
 */
export declare function pauseExecutionCallback(): void;
/**
 * false -> 执行中
 * @returns bool
 */
export declare function hasInExecution(): boolean;
export declare function runWithBatchingExecution(callback: ExecutionCallback): void;
