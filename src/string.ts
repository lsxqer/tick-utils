import { toJsUrl } from "./toJsUrl";
import { executeInWorker } from "./work";





export function asyncRunString(jsRaw: string) {
  let raw = jsRaw + executeInWorker.defaultJs;
  let jsurl = toJsUrl(raw);
  return executeInWorker(jsurl);
}




export function runString(jsRaw: string) {
  return Function(jsRaw)();
}