import { Inject, Injectable, Logger } from '@nestjs/common';
import { isProductionEnv } from '@baza/api-core';
import { IDENTITY_CONFIG } from '../identity.constants';
import type { IdentityConfig } from '../identity.config';

export type MailMessage = { to: string; subject: string; text: string; html: string };

const SEND_TIMEOUT_MS = 10_000;

function layout(title: string, body: string, ctaUrl?: string, cta?: string) {
  const button =
    ctaUrl && cta
      ? `<p><a href="${ctaUrl}" style="display:inline-block;padding:12px 20px;background:#111;color:#fff;text-decoration:none;border-radius:6px">${cta}</a></p><p style="color:#666;font-size:13px">Jeśli przycisk nie działa, skopiuj ten adres do przeglądarki:<br>${ctaUrl}</p>`
      : '';
  return `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto"><h2>${title}</h2><p>${body}</p>${button}</div>`;
}

/**
 * Transactional mail. `resend` posts to the Resend API; `log` only logs (dev, or prod before the
 * provider is wired). Delivery NEVER throws into the request path: an outage must not fail a
 * registration whose account genuinely exists — the failure is loud in the log and invisible to the
 * response, and the user has a "resend" action.
 */
@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);

  constructor(@Inject(IDENTITY_CONFIG) private readonly config: IdentityConfig) {}

  sendEmailVerification(to: string, url: string): Promise<void> {
    return this.deliver({
      to,
      subject: 'Potwierdź adres email w Baza',
      text: `Potwierdź adres email: ${url}\nLink jest ważny 24 godziny.`,
      html: layout(
        'Potwierdź adres email',
        'Dziękujemy za rejestrację firmy w Baza. Kliknij, aby potwierdzić adres (link ważny 24 godziny).',
        url,
        'Potwierdź adres email'
      ),
    });
  }

  sendPasswordReset(to: string, url: string): Promise<void> {
    return this.deliver({
      to,
      subject: 'Reset hasła w Baza',
      text: `Ustaw nowe hasło: ${url}\nLink jest ważny 15 minut. Jeśli to nie Ty, zignoruj tę wiadomość.`,
      html: layout(
        'Reset hasła',
        'Otrzymaliśmy prośbę o reset hasła. Link jest ważny 15 minut. Jeśli to nie Ty, zignoruj tę wiadomość.',
        url,
        'Ustaw nowe hasło'
      ),
    });
  }

  sendPasswordChangedNotice(to: string, resetUrl: string): Promise<void> {
    return this.deliver({
      to,
      subject: 'Twoje hasło w Baza zostało zmienione',
      text: `Hasło do konta zostało zmienione. Jeśli to nie Ty, zresetuj je natychmiast: ${resetUrl}`,
      html: layout(
        'Hasło zostało zmienione',
        'Hasło do Twojego konta zostało zmienione, a wszystkie sesje wylogowane. Jeśli to nie Ty, zresetuj hasło natychmiast.',
        resetUrl,
        'Zresetuj hasło'
      ),
    });
  }

  sendAccountAlreadyExistsNotice(to: string, signInUrl: string): Promise<void> {
    return this.deliver({
      to,
      subject: 'Masz już konto w Baza',
      text: `Ktoś próbował założyć konto na ten adres, ale już go używasz. Zaloguj się: ${signInUrl}`,
      html: layout(
        'Masz już konto',
        'Ktoś (prawdopodobnie Ty) próbował założyć konto na ten adres, ale konto już istnieje. Jeśli nie pamiętasz hasła, użyj opcji „Nie pamiętam hasła”.',
        signInUrl,
        'Przejdź do logowania'
      ),
    });
  }

  private async deliver(message: MailMessage): Promise<void> {
    try {
      if (this.config.mail.transport === 'log') {
        // Bodies contain single-use links: log them in dev, never in production.
        const dev = !isProductionEnv();
        this.logger.log(
          `[mail:log] to=${message.to} subject="${message.subject}"${dev ? `\n${message.text}` : ''}`
        );
        return;
      }
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.mail.resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: this.config.mail.from,
          to: [message.to],
          subject: message.subject,
          text: message.text,
          html: message.html,
          ...(this.config.mail.replyTo ? { reply_to: this.config.mail.replyTo } : {}),
        }),
        signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
      });
      if (!response.ok) {
        this.logger.error(
          `Mail delivery failed: status=${response.status} subject="${message.subject}"`
        );
      }
    } catch (error) {
      this.logger.error(
        `Mail delivery error subject="${message.subject}": ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
