import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { BreakpointObserver } from '@angular/cdk/layout';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import {
  HOME_RETURN_CADENCES,
  TRANSPORT_TYPES,
  type CountryCentroid,
  type JobOffer,
} from '@baza/shared-types';
import { forkJoin, map, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { OfferRouteMapComponent } from './offer-route-map';
import {
  buildRouteMapLegs,
  hasRouteMapGeometry,
} from './route-map-geometry';

const CADENCE_LABELS: Record<(typeof HOME_RETURN_CADENCES)[number], string> = {
  daily: 'Codziennie',
  weekly: 'Co tydzień',
  biweekly: 'Co dwa tygodnie',
  monthly: 'Co miesiąc',
  flexible: 'Elastycznie',
};

@Component({
  selector: 'baza-job-offer-detail-page',
  standalone: true,
  imports: [
    RouterLink,
    MatCardModule,
    MatButtonModule,
    OfferRouteMapComponent,
  ],
  templateUrl: './job-offer-detail-page.html',
  styleUrl: './job-offer-detail-page.scss',
})
export class JobOfferDetailPage implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly breakpoint = inject(BreakpointObserver);

  protected readonly loading = signal(true);
  protected readonly notFound = signal(false);
  protected readonly offer = signal<JobOffer | null>(null);
  protected readonly centroids = signal<CountryCentroid[]>([]);

  protected readonly showMapPane = toSignal(
    this.breakpoint.observe('(min-width: 768px)').pipe(map((r) => r.matches)),
    { initialValue: false }
  );

  protected readonly routeLegs = computed(() => {
    const o = this.offer();
    if (!o) {
      return [];
    }
    return buildRouteMapLegs(o.routes, this.centroids());
  });

  protected readonly hasMapGeometry = computed(() => {
    const o = this.offer();
    if (!o) {
      return false;
    }
    return hasRouteMapGeometry(o.baseLocation, this.routeLegs());
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.loading.set(false);
      this.notFound.set(true);
      return;
    }

    forkJoin({
      offer: this.http.get<JobOffer>(
        `${environment.apiBaseUrl}/api/offers/${id}`
      ),
      centroids: this.http
        .get<CountryCentroid[]>(`${environment.apiBaseUrl}/api/geo/countries`)
        .pipe(catchError(() => of([] as CountryCentroid[]))),
    }).subscribe({
      next: ({ offer, centroids }) => {
        this.offer.set(offer);
        this.centroids.set(centroids);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.loading.set(false);
        if (
          err instanceof HttpErrorResponse &&
          (err.status === 404 || err.status === 400)
        ) {
          this.notFound.set(true);
          return;
        }
        this.notFound.set(true);
      },
    });
  }

  protected cadenceLabel(code: string): string {
    return CADENCE_LABELS[code as keyof typeof CADENCE_LABELS] ?? code;
  }

  protected transportLabel(code: string): string {
    return TRANSPORT_TYPES.find((t) => t.code === code)?.namePl ?? code;
  }

  protected salaryText(offer: JobOffer): string | null {
    const s = offer.salary;
    if (!s) {
      return null;
    }
    const parts: string[] = [];
    if (s.min != null && s.max != null) {
      parts.push(`${s.min}–${s.max}`);
    } else if (s.min != null) {
      parts.push(`od ${s.min}`);
    } else if (s.max != null) {
      parts.push(`do ${s.max}`);
    }
    if (parts.length === 0) {
      return null;
    }
    return `${parts.join(' ')} ${s.currency}`;
  }
}
