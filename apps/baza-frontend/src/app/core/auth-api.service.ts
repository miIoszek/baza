import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

/** Stateless, anonymous auth calls (no session involved). Session handling lives in AuthService. */
@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/api/auth`;

  async verifyEmail(token: string): Promise<void> {
    await firstValueFrom(this.http.post<void>(`${this.base}/verify-email`, { token }));
  }

  /** Always resolves the same way for known and unknown addresses (server answers 202). */
  async resendVerification(email: string): Promise<void> {
    await firstValueFrom(this.http.post<void>(`${this.base}/resend-verification`, { email }));
  }

  async forgotPassword(email: string): Promise<void> {
    await firstValueFrom(this.http.post<void>(`${this.base}/forgot-password`, { email }));
  }

  async resetPassword(token: string, password: string): Promise<void> {
    await firstValueFrom(
      this.http.post<void>(`${this.base}/reset-password`, { token, password })
    );
  }

  /** Server messages are user-facing Polish strings; fall back to a generic one. */
  static messageOf(err: unknown, fallback: string): string {
    if (err instanceof HttpErrorResponse) {
      const body = err.error as { message?: string | string[] } | null;
      if (body?.message) {
        return Array.isArray(body.message) ? body.message.join(', ') : body.message;
      }
      if (err.status === 0) {
        return 'Brak połączenia z serwerem. Spróbuj ponownie.';
      }
    }
    return fallback;
  }
}
