import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { BreakpointObserver } from '@angular/cdk/layout';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import {
  HOME_RETURN_CADENCES,
  TRANSPORT_TYPES,
  type JobOffer,
} from '@baza/shared-types';
import { map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { OffersMapComponent, type OfferMapMarker } from './offers-map';

const CADENCE_LABELS: Record<(typeof HOME_RETURN_CADENCES)[number], string> = {
  daily: 'Codziennie',
  weekly: 'Co tydzień',
  biweekly: 'Co dwa tygodnie',
  monthly: 'Co miesiąc',
  flexible: 'Elastycznie',
};

@Component({
  selector: 'baza-job-offers-page',
  standalone: true,
  imports: [RouterLink, MatCardModule, MatButtonModule, OffersMapComponent],
  templateUrl: './job-offers-page.html',
  styleUrl: './job-offers-page.scss',
})
export class JobOffersPage implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly breakpoint = inject(BreakpointObserver);

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly offers = signal<JobOffer[]>([]);

  protected readonly showMap = toSignal(
    this.breakpoint.observe('(min-width: 768px)').pipe(map((r) => r.matches)),
    { initialValue: false }
  );

  protected readonly mapMarkers = computed<OfferMapMarker[]>(() =>
    this.offers()
      .filter((o) => o.baseLocation != null)
      .map((o) => ({
        id: o.id,
        title: o.title,
        point: o.baseLocation!,
        href: `/job-offers/${o.id}`,
      }))
  );

  ngOnInit(): void {
    this.http.get<JobOffer[]>(`${environment.apiBaseUrl}/api/offers`).subscribe({
      next: (list) => {
        this.offers.set(list);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.loading.set(false);
        this.error.set(this.extractError(err));
      },
    });
  }

  protected cadenceLabel(code: string): string {
    return CADENCE_LABELS[code as keyof typeof CADENCE_LABELS] ?? code;
  }

  protected transportLabel(code: string): string {
    return TRANSPORT_TYPES.find((t) => t.code === code)?.namePl ?? code;
  }

  protected routesSummary(offer: JobOffer): string {
    return offer.routes
      .map((r) => `${r.from.code}→${r.to.code}`)
      .join(', ');
  }

  private extractError(err: unknown): string {
    if (err instanceof HttpErrorResponse && typeof err.error?.message === 'string') {
      return err.error.message;
    }
    return 'Nie udało się pobrać ofert';
  }
}
