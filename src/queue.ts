
import {ExecutionCallback} from "./typedef";



interface Queue {
  nextCallbackQueue: ExecutionCallback[];
  processCallbackQueue: ExecutionCallback[];
}

export const callbackQueue: Queue = {
  nextCallbackQueue: [],
  processCallbackQueue: []
};
