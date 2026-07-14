import "server-only";

/**
 * Replaceable email provider. Production should implement this interface
 * against a real service (Resend, SES, SMTP, …) selected via EMAIL_DRIVER.
 * Until one is configured, the console provider logs the message server-side
 * (visible in Vercel logs) so password resets remain usable by an admin.
 */
export interface EmailProvider {
  send(to: string, subject: string, body: string): Promise<void>;
}

class ConsoleEmailProvider implements EmailProvider {
  async send(to: string, subject: string, body: string): Promise<void> {
    console.info(`[email:console] to=${to} subject=${subject}\n${body}`);
  }
}

let provider: EmailProvider | null = null;

export function getEmailProvider(): EmailProvider {
  if (!provider) {
    // EMAIL_DRIVER reserved for future real providers; console is the
    // documented development/default behavior.
    provider = new ConsoleEmailProvider();
  }
  return provider;
}
