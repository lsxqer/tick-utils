
import {ExecutionCallback} from "./typedef";



interface Queue {
  nextCallbackQueue: ExecutionCallback[];
}

export const callbackQueue: Queue = {
  nextCallbackQueue: []
};

// 使用链表来做
// 支持ms
