export declare class SubscriberChannel {
    static SubscriberChannelIndex: number;
    private broadcastChannel;
    private channelKey;
    constructor();
    private subscribes;
    get size(): number;
    close(): void;
    subscribe<T = any>(listener: (argv: T) => void): () => void;
    publish<T = any>(argv: T): this;
}
export declare class Subscrition {
    private subscribes;
    subscribe<T = any>(event: string, listener: (argv: T) => void): () => void;
    publishAll(row: Record<any, any>): void;
    publish<T = any>(event: string, argv: T): this;
}
