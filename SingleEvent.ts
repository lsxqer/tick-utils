/**
 * event center
 */


type SingleListener = (...args: any[]) => void;


/**
 * 通知源
 */
export class SingleEvent {
  private listeners: SingleListener[] = [];

  /**
   * 添加一个监听器
   * @param listener 监听的函数
   */
  subscribe(listener: SingleListener) {

    if (!this.listeners.includes(listener)) {
      this.listeners.push(listener);
    }

    const unSubscribe = () => {
      let idx = this.listeners.indexOf(listener);
      if (idx > -1) {
        this.listeners.splice(idx, 1);
      }
    };

    return unSubscribe;
  }

  /**
   * 发布通知
   * @param args 需要使用的消息
   */
  publish(...args: any[]) {
    let subscriptions = this.listeners.slice();
    for (let listener of subscriptions) {
      listener(...args);
    }
    subscriptions.length = 0;
  }

}

export default SingleEvent;