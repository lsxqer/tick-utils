/**
 * event center
 */


type SingleListener = (...args: any[]) => void;


/**
 * 通知源
 */
export class SingleEvent {
  private listeners: SingleListener[] = [];
  private pendingListeners: SingleListener[] = null!;

  /**
   * 添加一个监听器
   * @param listener 监听的函数
   */
  subscribe(listener: SingleListener) {

    if (!this.listeners.includes(listener)) {
      this.listeners.push(listener);
    }

    const unSubscribe = () => {
      if (this.pendingListeners !== null) {
        this.pendingListeners.push(listener);
        return;
      }
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
    let pending = this.pendingListeners = [];

    for (let listener of this.listeners) {
      listener(...args);
    }

    let i = pending.length;
    while (i >= 0) {
      this.listeners.splice(this.listeners.indexOf(pending[i--]!), 1);
    }

    pending = this.pendingListeners = null!;
  }

}

export default SingleEvent;