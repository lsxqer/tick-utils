
import {ExecutionCallback} from "./typedef";



interface Queue {
  nextCallbackQueue: ExecutionCallback[];
  processCallbackQueue: ExecutionCallback[];
}

export const callbackQueue: Queue = {
  nextCallbackQueue: [],
  processCallbackQueue: []
};

// 使用链表来做
// 支持ms
