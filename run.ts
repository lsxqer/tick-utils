

/* 


runInWork.asyncRunString = asyncRunString;
runInWork.runString = runString;
runInWork.runCallback = runCallback;
runInWork.asyncRunCallback = asyncRunCallback;
runInWork.asyncLoop = loop;
runInWork.asyncLong = runingCallbackForLong;

*/

import { runTaskInWorker } from "./src/long";

void async function main() {
  const inst = runTaskInWorker(
    async (wait,state, a: string) => {
      let i = 0;
      while (!(await wait()) && i < 20000) {
        i++;
        console.log("runTaskInWorker",state, a);
      }
    },
  );

  inst.startup("abc");

  setTimeout(() => {
    inst.stop();
    setTimeout(() => {
      inst.startup("fkskks");
      setTimeout(() => {
        inst.stop();
      }, 50);
    }, 50)
  }, 50);


  // let wait = false;
  // let i = 0;

  // const run = async () => {
  //   while (!wait) {
  //     console.log(i, wait);
  //     if (i > 10000 || wait) {
  //       return;
  //     }
  //     i++;
  //     await Promise.resolve().then(() => { console.log(wait, 2); });
  //     console.log(wait, 1);
  //   }
  // };

  // setTimeout(() => {
  //   console.log("1123");
  //   wait = true;
  // }, 50);
  // run();
}();