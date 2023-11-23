import { nextLoopFlushCallbackQueue } from "./flush";
import { pauseExecutionCallback } from "./batching";
const channel = new MessageChannel();
channel.port1.onmessage = nextLoopFlushCallbackQueue;
channel.port2.onmessage = pauseExecutionCallback;
export function requestNextLoopExecutionCallback() {
    channel.port2.postMessage(null);
}
export function nextLoopPauseExecution() {
    channel.port1.postMessage(null);
}
