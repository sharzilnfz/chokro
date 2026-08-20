// Modular notification seam: Telegram Bot, Twilio SMS, Resend Email with test/console fallback (SPEC 12 / Ticket 08b)

export interface NotificationPayload {
  recipientUserId?: string;
  recipientEmail?: string;
  recipientPhone?: string;
  telegramChatId?: string;
  subject?: string;
  message: string;
  html?: string;
  metadata?: Record<string, any>;
}

export interface NotificationResult {
  channel: 'telegram' | 'twilio' | 'resend' | 'console';
  success: boolean;
  messageId?: string;
  error?: string;
}

export const NotificationSeam = {
  /**
   * Telegram Bot notification
   */
  async sendTelegram(message: string, chatId?: string): Promise<NotificationResult> {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const targetChatId = chatId || process.env.TELEGRAM_CHAT_ID;

    if (!token || !targetChatId || process.env.NODE_ENV === 'test') {
      console.log(`[notify:telegram:fallback] ${message}`);
      return { channel: 'telegram', success: true, messageId: 'test-telegram-msg' };
    }

    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: targetChatId,
          text: message,
          parse_mode: 'Markdown',
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        return { channel: 'telegram', success: false, error: errText };
      }

      const json = await res.json();
      return { channel: 'telegram', success: true, messageId: String(json.result?.message_id) };
    } catch (err: any) {
      return { channel: 'telegram', success: false, error: err.message };
    }
  },

  /**
   * Twilio SMS notification
   */
  async sendTwilioSms(to: string, message: string): Promise<NotificationResult> {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_FROM_NUMBER;

    if (!sid || !token || !from || process.env.NODE_ENV === 'test') {
      console.log(`[notify:twilio:fallback] to=${to} body="${message}"`);
      return { channel: 'twilio', success: true, messageId: 'test-twilio-msg' };
    }

    try {
      const auth = Buffer.from(`${sid}:${token}`).toString('base64');
      const params = new URLSearchParams();
      params.append('To', to);
      params.append('From', from);
      params.append('Body', message);

      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      if (!res.ok) {
        const errText = await res.text();
        return { channel: 'twilio', success: false, error: errText };
      }

      const json = await res.json();
      return { channel: 'twilio', success: true, messageId: json.sid };
    } catch (err: any) {
      return { channel: 'twilio', success: false, error: err.message };
    }
  },

  /**
   * Resend Email notification
   */
  async sendResendEmail(to: string, subject: string, html: string, text?: string): Promise<NotificationResult> {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM || 'Chokro Trust <notifications@chokro.org>';

    if (!apiKey || process.env.NODE_ENV === 'test') {
      console.log(`[notify:resend:fallback] to=${to} subject="${subject}"\n${text || html}`);
      return { channel: 'resend', success: true, messageId: 'test-resend-msg' };
    }

    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: [to],
          subject,
          html,
          text: text || undefined,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        return { channel: 'resend', success: false, error: errText };
      }

      const json = await res.json();
      return { channel: 'resend', success: true, messageId: json.id };
    } catch (err: any) {
      return { channel: 'resend', success: false, error: err.message };
    }
  },

  /**
   * Broadcast or send targeted notification across configured channels
   */
  async notify(payload: NotificationPayload): Promise<NotificationResult[]> {
    const results: NotificationResult[] = [];

    if (payload.telegramChatId || process.env.TELEGRAM_CHAT_ID) {
      results.push(await this.sendTelegram(payload.message, payload.telegramChatId));
    }

    if (payload.recipientPhone) {
      results.push(await this.sendTwilioSms(payload.recipientPhone, payload.message));
    }

    if (payload.recipientEmail && payload.subject) {
      results.push(
        await this.sendResendEmail(
          payload.recipientEmail,
          payload.subject,
          payload.html || `<p>${payload.message}</p>`,
          payload.message
        )
      );
    }

    if (results.length === 0) {
      console.log(`[notify:console] ${payload.subject ? `[${payload.subject}] ` : ''}${payload.message}`);
      results.push({ channel: 'console', success: true, messageId: 'console-log' });
    }

    return results;
  },
};
