import { Component, OnInit, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import type { JobOffer } from '@baza/shared-types';
import { AsyncStatus } from '@baza/ui';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'baza-company-offers-list-page',
  standalone: true,
  imports: [
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatSnackBarModule,
    AsyncStatus,
  ],
  templateUrl: './company-offers-list-page.html',
  styleUrl: './company-offers-list-page.scss',
})
export class CompanyOffersListPage implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly offers = signal<JobOffer[]>([]);

  async ngOnInit(): Promise<void> {
    await this.reload();
  }

  protected async retryLoad(): Promise<void> {
    if (this.loading()) {
      return;
    }
    await this.reload();
  }

  protected async unpublish(id: string): Promise<void> {
    try {
      await firstValueFrom(
        this.http.patch(
          `${environment.apiBaseUrl}/api/company/offers/${id}/unpublish`,
          {}
        )
      );
      this.snackBar.open('Oferta wycofana', 'OK', { duration: 4000 });
      await this.reload();
    } catch (err: unknown) {
      this.snackBar.open(this.extractError(err), 'OK', { duration: 6000 });
    }
  }

  protected async deleteOffer(id: string): Promise<void> {
    const ok = window.confirm(
      'Usunąć tę ofertę na stałe? Znikną też wszystkie aplikacje i CV powiązane z tą ofertą. Tej operacji nie można cofnąć.'
    );
    if (!ok) {
      return;
    }
    try {
      await firstValueFrom(
        this.http.delete(`${environment.apiBaseUrl}/api/company/offers/${id}`)
      );
      this.snackBar.open('Oferta usunięta', 'OK', { duration: 4000 });
      await this.reload();
    } catch (err: unknown) {
      this.snackBar.open(this.extractError(err), 'OK', { duration: 6000 });
    }
  }

  private async reload(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const list = await firstValueFrom(
        this.http.get<JobOffer[]>(
          `${environment.apiBaseUrl}/api/company/offers`
        )
      );
      this.offers.set(list);
      this.error.set(null);
    } catch (err: unknown) {
      this.error.set(this.extractError(err, 'Nie udało się pobrać ofert'));
    } finally {
      this.loading.set(false);
    }
  }

  private extractError(
    err: unknown,
    fallback = 'Operacja nie powiodła się'
  ): string {
    if (!(err instanceof HttpErrorResponse)) {
      return fallback;
    }
    // Blocked / offline / CORS — Angular may wrap TypeError("Failed to fetch")
    if (err.status === 0) {
      return fallback;
    }
    const raw = err.error;
    const msg =
      typeof raw?.message === 'string'
        ? raw.message
        : Array.isArray(raw?.message)
          ? raw.message.join(', ')
          : typeof raw === 'string'
            ? raw
            : null;
    if (msg && !isBrowserNetworkNoise(msg)) {
      return msg;
    }
    return fallback;
  }
}

function isBrowserNetworkNoise(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes('failed to fetch') ||
    m.includes('networkerror') ||
    m.includes('load failed')
  );
}
