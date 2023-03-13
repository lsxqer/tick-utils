

type SingleEventListener = (...args: any[]) => void;

export class SingleEvent {

  private listeners: SingleEventListener[] = [];
  private pendingUnsubscribe: SingleEventListener[] = null!;

  subscribe(listener: SingleEventListener) {
    const listeners = this.listeners;

    if (!listeners.includes(listener)) {
      listeners.push(listener);
    }

    const unListener = () => {
      if (this.pendingUnsubscribe !== null) {
        this.pendingUnsubscribe.push(listener);
        return;
      }
      let idx = listeners.indexOf(listener);
      if (idx > -1) {
        listeners.splice(idx, 1);
      }
    };

    return unListener;
  }

  publish(...args: any[]) {
    let pending = this.pendingUnsubscribe = [];
    this.listeners.forEach(listener => listener(...args));
    while (pending.length > 0) {
      this.listeners.splice(this.listeners.indexOf(pending.shift()!), 1);
    }
  }

}


export default SingleEvent;