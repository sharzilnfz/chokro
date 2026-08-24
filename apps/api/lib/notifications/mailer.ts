import nodemailer, { type SentMessageInfo, type Transporter } from 'nodemailer';

export type MailTransport =
  | 'smtp'
  | 'ethereal'
  | 'json';

export interface MailerHandle {
  transporter: Transporter;
  mode: MailTransport;
  previewUrl(info: SentMessageInfo): string | null;
}

// The one from-address for every outbound mail (domain notifications + digest).
export const EMAIL_FROM = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@chokro.dev';

// Test seam: a handle set here is returned by getTransporter instead of building one.
let overrideHandle: MailerHandle | null = null;

/** Inject a MailerHandle (tests pass a spy transport); null restores env-driven selection. */
export function setMailerHandle(handle: MailerHandle | null): void {
  overrideHandle = handle;
}

/** True while an injected handle is active (tests use this to bypass env fallbacks). */
export function hasMailerOverride(): boolean {
  return overrideHandle !== null;
}

// Transport selection is deterministic per env, so build it once.
let cachedHandle: MailerHandle | null = null;

/**
 * Resolves the nodemailer transport for the whole notification stack
 * (domain notify() + digest job) — the single transport config surface.
 *
 * NOTIFY_TRANSPORT:
 *   - "smtp"     (default) deliver over a real SMTP server. Requires SMTP_HOST,
 *                SMTP_USER and SMTP_PASS. Use e.g. Ethereal/Gmail/Mailgun creds.
 *   - "ethereal" use the Ethereal test SMTP. No real emails are delivered; you
 *                get a web preview URL where the message can be inspected.
 *   - "json"     offline dev mode: prints the assembled message to the console.
 */
export async function getTransporter(): Promise<MailerHandle> {
  if (overrideHandle) return overrideHandle;
  if (!cachedHandle) cachedHandle = await buildTransporter();
  return cachedHandle;
}

async function buildTransporter(): Promise<MailerHandle> {
  const mode = (process.env.NOTIFY_TRANSPORT || 'smtp').toLowerCase() as MailTransport;

  if (mode === 'ethereal') {
    const testAccount = await nodemailer.createTestAccount();
    const transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: { user: testAccount.user, pass: testAccount.pass },
    });
    return {
      transporter,
      mode,
      previewUrl: (info) => {
        const url = nodemailer.getTestMessageUrl(info);
        return url ? url : null;
      },
    };
  }

  if (mode === 'json') {
    const transporter = nodemailer.createTransport({ jsonTransport: true });
    return { transporter, mode, previewUrl: () => null };
  }

  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) {
    throw new Error(
      'SMTP_HOST, SMTP_USER and SMTP_PASS are required when NOTIFY_TRANSPORT=smtp. ' +
      'Set NOTIFY_TRANSPORT=json (offline dev) or NOTIFY_TRANSPORT=ethereal (preview inbox) to skip SMTP.',
    );
  }
  const port = Number(process.env.SMTP_PORT || 587);
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
  return { transporter, mode, previewUrl: () => null };
}