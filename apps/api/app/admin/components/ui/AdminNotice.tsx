// The one Notice implementation for the admin console (deepening C10): owns the
// success/error banner lifecycle and renders it through AdminStatusMessage.
'use client';

import { useCallback, useState } from 'react';
import { AdminStatusMessage, type NoticeTone } from './AdminStatusMessage';

// Success/error feedback banner state, shared by every admin resource page.
export type Notice = { tone: NoticeTone; text: string } | null;

export function useAdminNotice() {
  const [notice, setNotice] = useState<Notice>(null);

  const showNotice = useCallback((tone: NoticeTone, text: string) => {
    setNotice({ tone, text });
  }, []);

  const clearNotice = useCallback(() => setNotice(null), []);

  // Rendered inline at the top of the page content; null when no notice is active.
  const noticeElement = notice ? (
    <AdminStatusMessage tone={notice.tone} onDismiss={clearNotice}>
      {notice.text}
    </AdminStatusMessage>
  ) : null;

  return { notice, showNotice, clearNotice, noticeElement };
}
