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
    // Keyless demo mode: clients rely on the mandatory polling fallback.
    cachedClient = null;
    return cachedClient;
  }
  cachedClient = new Pusher({ appId, key, secret, cluster, useTLS: true, timeout: PUSHER_TIMEOUT_MS });
  return cachedClient;
}

export interface RealtimeBidPayload {
  bid: Record<string, unknown>;
  lot: Record<string, unknown>;
}

/**
 * Live bid push over Pusher Channels. Strictly best-effort: with keys unset it
 * logs and no-ops (clients poll), and any trigger failure is logged and
 * swallowed — realtime is never allowed to break the bid request path.
 */
export const AuctionRealtimeService = {
  channelForLot(lotId: string): string {
    return `auction-lot-${lotId}`;
  },

  async triggerBid(lotId: string, payload: RealtimeBidPayload): Promise<void> {
    const pusher = getPusherClient();
    if (!pusher) {
      console.log(`[auction-realtime] Pusher keys unset — lot ${lotId} relies on polling fallback`);
      return;
    }
    try {
      await pusher.trigger(this.channelForLot(lotId), 'bid-placed', payload);
    } catch (err) {
      console.error(`[auction-realtime] Pusher trigger failed for lot ${lotId}; clients fall back to polling`, err);
    }
  },
};
