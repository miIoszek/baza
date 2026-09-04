import { Component, inject, OnInit, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HOME_RETURN_CADENCES, type HealthResponse } from '@baza/shared-types';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'baza-home-page',
  standalone: true,
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class HomePage implements OnInit {
  private readonly http = inject(HttpClient);

  protected readonly brand = 'Baza';
  protected readonly cadences = HOME_RETURN_CADENCES;
  protected readonly healthStatus = signal<'loading' | 'ok' | 'error'>('loading');
  protected readonly healthDetail = signal<string>('Ładowanie…');

  ngOnInit(): void {
    const url = `${environment.apiBaseUrl}/api/health`;
    this.http.get<HealthResponse>(url).subscribe({
      next: (res) => {
        this.healthStatus.set('ok');
        this.healthDetail.set(
          `${res.status} · ${res.service} · ${res.timestamp}`
        );
      },
      error: (err: unknown) => {
        this.healthStatus.set('error');
        const message =
          err && typeof err === 'object' && 'message' in err
            ? String((err as { message: unknown }).message)
            : 'Nie udało się pobrać /api/health';
        this.healthDetail.set(message);
      },
    });
  }
}
