


export class SubscriberChannel {

  static SubscriberChannelIndex = 1;

  private broadcastChannel: BroadcastChannel;
  private channelKey: string;


  constructor() {
    this.channelKey = `SubscriberChannel:${SubscriberChannel.SubscriberChannelIndex}`;
    this.broadcastChannel = new BroadcastChannel(
      this.channelKey
    );

    this.broadcastChannel.addEventListener("message", (event) => {
      let listeners = Array.from(this.subscribes);
      listeners.forEach(listener => listener(event.data));
    });
  }


  private subscribes = new Set<(argv: any) => void>();

  get size() {
    return this.subscribes.size;
  }

  close() {
    this.broadcastChannel.close();
    this.channelKey = this.broadcastChannel = null;
  }

  subscribe<T = any>(listener: (argv: T) => void) {
    this.subscribes.add(listener);

    return () => {
      this.subscribes.delete(listener);
    };
  }

  publish<T = any>(argv: T) {
    this.broadcastChannel.postMessage(argv);
    let listeners = Array.from(this.subscribes);
    listeners.forEach(listener => listener(argv));
    return this;
  }


}

export class Subscrition {
  private subscribes = new Map<string, SubscriberChannel>();


  subscribe<T = any>(event: string, listener: (argv: T) => void) {
    let ch = this.subscribes.get(event)!;
    if (ch === undefined) {
      this.subscribes.set(event, ch = new SubscriberChannel());
    }
    let un = ch.subscribe(listener);

    return () => {
      un();
      if (ch.size === 0) {
        this.subscribes.delete(event);
      }
    };
  }

  publishAll(row: Record<any, any>) {
    let listeners = [];
    let keys = Object.keys(row);
    for (let k of keys) {
      let ch = this.subscribes.get(k);
      if (ch !== undefined) {
        listeners.push({ ch, v: row[k] });
      }
    }

    listeners.forEach(e => e.ch.publish(e.v));
  }



  publish<T = any>(event: string, argv: T) {
    const ch = this.subscribes.get(event);
    if (ch === undefined) {
      console.log(event, "不存在");
      return this;
    }
    ch.publish(argv);
    return this;
  }
}