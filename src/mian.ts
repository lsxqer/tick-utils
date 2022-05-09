
import {ExecutionCallback} from "./typedef";
import { schedulerOnCallbackExecution } from "./scheduler";


export function nextTick(fn:ExecutionCallback) {
  schedulerOnCallbackExecution(fn);
}

export default nextTick;
