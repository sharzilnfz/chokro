// Seam tests for the notification stack: notify() resolves a bare
// recipientUserId through the ContactResolver adapter, email rides the shared
// mailer transport selection, and the digest job uses the same surface.
import { db, listings, savedListings } from '@chokro/db';
import { NotificationSeam, setContactResolver } from '../lib/notify';
import type { ContactResolver } from '../lib/notify';
import { setMailerHandle, hasMailerOverride, EMAIL_FROM } from '../lib/notifications/mailer';
import type { MailerHandle } from '../lib/notifications/mailer';
import { runNotificationJob } from '../lib/notifications/notificationService';
import { createTestUser, resetTestStore } from './test-utils';

function spyTransport() {
  const sendMail = jest.fn().mockResolvedValue({ messageId: 'spy-msg-1' });
  const handle: MailerHandle = {
    transporter: { sendMail } as any,
    mode: 'json',
    previewUrl: () => null,
  };
  return { handle, sendMail };
}

describe('notification seam', () => {
  let originalTelegramChatId: string | undefined;

  beforeEach(async () => {
    await resetTestStore();
    originalTelegramChatId = process.env.TELEGRAM_CHAT_ID;
    delete process.env.TELEGRAM_CHAT_ID;
  });

  afterEach(() => {
    setContactResolver(null);
    setMailerHandle(null);
    if (originalTelegramChatId === undefined) delete process.env.TELEGRAM_CHAT_ID;
    else process.env.TELEGRAM_CHAT_ID = originalTelegramChatId;
  });

  describe('recipient resolution', () => {
    it('dispatches a non-console email for a recipientUserId-only call when contacts resolve', async () => {
      const resolver: ContactResolver = {
        resolve: jest.fn().mockResolvedValue({ email: 'seller@test.chokro.org', phone: '+8801700000000' }),
      };
      setContactResolver(resolver);
      const { handle, sendMail } = spyTransport();
      setMailerHandle(handle);

      const results = await NotificationSeam.notify({
        recipientUserId: 'user-1',
        subject: 'Escrow released',
        message: 'Funds released.',
      });

      expect(resolver.resolve).toHaveBeenCalledWith('user-1');
      // Email dispatch through the injected transport — not the console fallback.
      const emailResult = results.find((r) => r.channel === 'resend');
      expect(emailResult).toMatchObject({ channel: 'resend', success: true });
      expect(results.some((r) => r.channel === 'console')).toBe(false);
      expect(sendMail).toHaveBeenCalledTimes(1);
      expect(sendMail).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'seller@test.chokro.org', subject: 'Escrow released', from: EMAIL_FROM })
      );
      // Resolved phone also routes to SMS.
      expect(results.some((r) => r.channel === 'twilio')).toBe(true);
    });

    it('keeps the console fallback when the resolver finds no contacts', async () => {
      setContactResolver({ resolve: jest.fn().mockResolvedValue(null) });
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      const results = await NotificationSeam.notify({
        recipientUserId: 'user-2',
        subject: 'Handover code',
        message: 'Your code is 123456.',
      });

      expect(results).toEqual([{ channel: 'console', success: true, messageId: 'console-log' }]);
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('[notify:console]'));
    });

    it('does not call the resolver when explicit contact fields are present', async () => {
      const resolver: ContactResolver = { resolve: jest.fn().mockResolvedValue({ email: 'repo@test.chokro.org' }) };
      setContactResolver(resolver);
      const { handle, sendMail } = spyTransport();
      setMailerHandle(handle);

      await NotificationSeam.notify({ recipientEmail: 'explicit@test.chokro.org', subject: 'S', message: 'm' });

      expect(resolver.resolve).not.toHaveBeenCalled();
      expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({ to: 'explicit@test.chokro.org' }));
    });

    it('falls back to console for an unknown recipientUserId (no subject-less email)', async () => {
      setContactResolver({ resolve: jest.fn().mockResolvedValue({}) });
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      const results = await NotificationSeam.notify({ recipientUserId: 'user-3', message: 'no channels' });

      expect(results).toEqual([{ channel: 'console', success: true, messageId: 'console-log' }]);
    });
  });

  describe('digest mailer transport selection', () => {
    it('sends digest mail through the shared injected transport with the shared from-address', async () => {
      const owner = await createTestUser('INDIVIDUAL', 'digest-owner@test.chokro.org');
      const saver = await createTestUser('INDIVIDUAL', 'digest-saver@test.chokro.org');
      const [listing] = await db
        .insert(listings)
        .values({
          owner_id: owner.id,
          category: 'PAPER',
          unit: 'kg',
          declared_weight: '5.00',
          piece_count: null,
          declared_condition: 'GOOD',
          price_bdt: '40.00',
          status: 'ACTIVE',
        })
        .returning();
      await db.insert(savedListings).values({ user_id: saver.id, listing_id: listing.id }).returning();

      const { handle, sendMail } = spyTransport();
      setMailerHandle(handle);

      const summary = await runNotificationJob();

      expect(summary.sent).toBe(1);
      expect(summary.recipients).toBe(1);
      expect(sendMail).toHaveBeenCalledTimes(1);
      expect(sendMail).toHaveBeenCalledWith(
        expect.objectContaining({ from: EMAIL_FROM, to: saver.email })
      );
    });
  });
});

// Guard: the override hook exists so tests can force a non-console dispatch.
it('reports whether a mailer override is active', () => {
  expect(hasMailerOverride()).toBe(false);
  const { handle } = spyTransport();
  setMailerHandle(handle);
  expect(hasMailerOverride()).toBe(true);
  setMailerHandle(null);
  expect(hasMailerOverride()).toBe(false);
});
