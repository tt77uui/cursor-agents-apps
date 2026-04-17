import type { BusPayload, MessageTopic } from "./types.js";

type Handler = (payload: BusPayload) => void;

export class MessageBus {
  private readonly listeners = new Map<MessageTopic, Set<Handler>>();

  subscribe(topic: MessageTopic, handler: Handler): () => void {
    let set = this.listeners.get(topic);
    if (!set) {
      set = new Set();
      this.listeners.set(topic, set);
    }
    set.add(handler);
    return () => {
      set!.delete(handler);
      if (set!.size === 0) this.listeners.delete(topic);
    };
  }

  publish(topic: MessageTopic, payload: BusPayload = {}): void {
    const set = this.listeners.get(topic);
    if (!set) return;
    for (const h of set) h(payload);
  }
}
