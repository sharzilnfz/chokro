import Pusher from 'pusher';

const PUSHER_TIMEOUT_MS = 3000;

let cachedClient: Pusher | null | undefined;

function getPusherClient(): Pusher | null {
  if (cachedClient !== undefined) return cachedClient;
  const appId = process.env.PUSHER_APP_ID;
  const key = process.env.PUSHER_KEY;
  const secret = process.env.PUSHER_SECRET;
  const cluster = process.env.PUSHER_CLUSTER;
  if (!appId || !key || !secret || !cluster) {
    // Keyless demo / test mode: clients rely on polling fallback.
    cachedClient = null;
    return cachedClient;
  }
  cachedClient = new Pusher({ appId, key, secret, cluster, useTLS: true, timeout: PUSHER_TIMEOUT_MS });
  return cachedClient;
}

export type NegotiationRealtimeEvent =
  | 'offer:created'
  | 'offer:accepted'
  | 'offer:rejected'
  | 'thread:superseded';

export const NegotiationRealtimeService = {
  channelForThread(threadId: string): string {
    return `negotiation-${threadId}`;
  },

  async triggerEvent(threadId: string, event: NegotiationRealtimeEvent, payload: Record<string, unknown>): Promise<void> {
    const pusher = getPusherClient();
    if (!pusher) {
      return;
    }
    try {
      await pusher.trigger(this.channelForThread(threadId), event, payload);
    } catch (err) {
      console.error(`[negotiation-realtime] Pusher trigger failed for thread ${threadId}`, err);
    }
  },
};
