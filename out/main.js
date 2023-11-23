import { schedulerOnCallbackExecution } from "./scheduler";
export function nextTick(fn) {
    schedulerOnCallbackExecution(fn);
}
export default nextTick;
