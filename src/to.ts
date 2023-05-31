import { RunCallback } from "./function";




/**
 * 接收一个函数的String形式，返回一个可被work执行的url地址
 * @param jsRaw - 函数的toString返回
 * @returns dataUrl
 */
export function toJsUrl(jsRaw: string) {
  let bj = new Blob([jsRaw], { type: "application/javascript" });
  let url = URL.createObjectURL(bj);
  return url;
}


// const fnTest = () => {
//   let n = 10;
//   let fn = (n) => {

//   };
//   console.log("fn string:", fn.toString());
//   let a = 10;
//   let fn2 = (a) => {

//   };
//   console.log("fn2 string:", fn2.toString());
// };
// fnTest();
/**
 * @param callback  - 执行的函数
 * @param functionName - 执行的名称，默认为"execute
 * @param immediate  - 是否在准备完成后立即执行, 默认 true
 * @param args  - 函数的参数列表，默认为[] (为什么要手动传递?看下面的例子)
 * @returns toString的结果
 * 
 * @example
 *  const fnTest = () => {
 *    let n = 10;
 *    let fn = (n) => {
 *
 *    };
 *    console.log("fn string:",fn.toString());
 *    let a = 10;
 *    let fn2 = (a) => {
 *
 *    };
 *    console.log("fn2 string:",fn2.toString());
 *  };
 * 
 * output:
 *  fn string: (n2) => {}
 *  fn2 string: (a2) => {}
 * 
 * 同一个作用域中，存在相同的名称时，toString会出现不可预料的字符串
 * 
 */
export function buildExecutableFunctionToString<T extends (...args: any) => any = RunCallback>(
  callback: T,
  functionName:string = "execute",
  immediate = true,
  args: any[] = []
): string {
  let callbackName = functionName;
  let runner = "";
  const callbackString = callback.toString();


  if (immediate) {
    runner = `
  ${callbackName}(${args.join()});
    `;
  }

  const raw = `
  const ${callbackName} = ${callbackString};

  ${runner}
  `;

  return raw;
}