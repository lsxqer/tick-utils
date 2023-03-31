
/*
  todo: 
  1. 转化为jsUrl

  todo:
  2. 可接收一个函数
  3. 可接收一个字符串
  3. 可接收一个地址

  run.runString()
  .success()
  .error()
  .complete

*/

import { asyncRunCallback, runCallback } from "./function";
import { runingCallbackForLong } from "./long";
import { loop } from "./loop";
import { asyncRunString, runString } from "./string";



function runInWork(callback: any) {

}

runInWork.asyncRunString = asyncRunString;
runInWork.runString = runString;
runInWork.runCallback = runCallback;
runInWork.asyncRunCallback = asyncRunCallback;
runInWork.asyncLoop = loop;
runInWork.asyncLong = runingCallbackForLong;



void async function main() {


  globalThis.helpSize = {
    name:"asdfasdf",
    name2:"asdfasdf",
    name3:"asdfasdf",
    name4:"asdfasdf",
  };

  let work = runingCallbackForLong(async (wait, emit, b: string) => {

    while (!wait()) {
      await new Promise((r) => {
        console.log(b, "内部执行");
        setTimeout(r, 500);
      });
    }

    emit("11111111, payd nerr");
  });

  work.listen(s => {
    console.log(s);
  });

  work.startup("aaaa");

  setTimeout(() => {
    work.stop();
    console.log("stop");

    setTimeout(() => {
      work.startup("bbb");
      setTimeout(() => {
        work.stop()

      }, 3000);
    }, 1500);
  }, 2000)

}();



