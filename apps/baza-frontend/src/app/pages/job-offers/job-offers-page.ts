import {
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { BreakpointObserver } from '@angular/cdk/layout';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import {
  COUNTRIES,
  DRIVER_LICENSES,
  HOME_RETURN_CADENCES,
  TRANSPORT_TYPES,
  type JobOffer,
} from '@baza/shared-types';
import { catchError, debounceTime, map, of, switchMap, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { OffersMapComponent, type OfferMapMarker } from './offers-map';

const CADENCE_LABELS: Record<(typeof HOME_RETURN_CADENCES)[number], string> = {
  daily: 'Codziennie',
  weekly: 'Co tydzień',
  biweekly: 'Co dwa tygodnie',
  monthly: 'Co miesiąc',
  flexible: 'Elastycznie',
};

export type JobOffersQueryModel = {
  countries: string[];
  cadence: string;
  license: string;
  nearLat: number | null;
  nearLng: number | null;
};

/** Pure helpers — unit-tested without TestBed. */
export function parseJobOffersQueryParams(
  get: (key: string) => string | null
): JobOffersQueryModel {
  const countriesRaw = get('countries') ?? '';
  const countries = countriesRaw
    ? countriesRaw
        .split(',')
        .map((c) => c.trim().toUpperCase())
        .filter(Boolean)
    : [];
  const nearLatRaw = get('nearLat');
  const nearLngRaw = get('nearLng');
  const nearLat =
    nearLatRaw != null && nearLatRaw !== '' ? Number(nearLatRaw) : null;
  const nearLng =
    nearLngRaw != null && nearLngRaw !== '' ? Number(nearLngRaw) : null;
  return {
    countries,
    cadence: get('cadence') ?? '',
    license: get('license') ?? '',
    nearLat: nearLat != null && !Number.isNaN(nearLat) ? nearLat : null,
    nearLng: nearLng != null && !Number.isNaN(nearLng) ? nearLng : null,
  };
}

export function jobOffersQueryToHttpParams(
  model: JobOffersQueryModel
): HttpParams {
  let params = new HttpParams();
  if (model.countries.length) {
    params = params.set('countries', model.countries.join(','));
  }
  if (model.cadence) {
    params = params.set('cadence', model.cadence);
  }
  if (model.license) {
    params = params.set('license', model.license);
  }
  if (model.nearLat != null && model.nearLng != null) {
    params = params.set('nearLat', String(model.nearLat));
    params = params.set('nearLng', String(model.nearLng));
  }
  return params;
}

export function jobOffersQueryToRouterParams(
  model: JobOffersQueryModel
): Record<string, string | null> {
  return {
    countries: model.countries.length ? model.countries.join(',') : null,
    cadence: model.cadence || null,
    license: model.license || null,
    nearLat: model.nearLat != null ? String(model.nearLat) : null,
    nearLng: model.nearLng != null ? String(model.nearLng) : null,
  };
}

export function hasActiveJobOfferFilters(model: JobOffersQueryModel): boolean {
  return (
    model.countries.length > 0 ||
    !!model.cadence ||
    !!model.license ||
    (model.nearLat != null && model.nearLng != null)
  );
}

@Component({
  selector: 'baza-job-offers-page',
  standalone: true,
  imports: [
    RouterLink,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
    OffersMapComponent,
  ],
  templateUrl: './job-offers-page.html',
  styleUrl: './job-offers-page.scss',
})
export class JobOffersPage implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly breakpoint = inject(BreakpointObserver);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly countries = COUNTRIES;
  protected readonly cadences = HOME_RETURN_CADENCES;
  protected readonly licenses = DRIVER_LICENSES;
  protected readonly cadenceLabels = CADENCE_LABELS;

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly geoError = signal<string | null>(null);
  protected readonly offers = signal<JobOffer[]>([]);
  protected readonly filters = signal<JobOffersQueryModel>({
    countries: [],
    cadence: '',
    license: '',
    nearLat: null,
    nearLng: null,
  });

  protected readonly hasFilters = computed(() =>
    hasActiveJobOfferFilters(this.filters())
  );

  protected readonly showMap = toSignal(
    this.breakpoint.observe('(min-width: 768px)').pipe(map((r) => r.matches)),
    { initialValue: false }
  );

  protected readonly mapMarkers = computed<OfferMapMarker[]>(() => {
    const markers: OfferMapMarker[] = [];
    for (const o of this.offers()) {
      const point = o.baseLocation;
      if (point) {
        markers.push({
          id: o.id,
          title: o.title,
          point,
          href: `/job-offers/${o.id}`,
        });
      }
    }
    return markers;
  });

  ngOnInit(): void {
    this.route.queryParamMap
      .pipe(
        tap((params) => {
          this.filters.set(parseJobOffersQueryParams((k) => params.get(k)));
        }),
        debounceTime(200),
        switchMap((params) => {
          const model = parseJobOffersQueryParams((k) => params.get(k));
          this.loading.set(true);
          this.error.set(null);
          return this.http
            .get<JobOffer[]>(`${environment.apiBaseUrl}/api/offers`, {
              params: jobOffersQueryToHttpParams(model),
            })
            .pipe(
              catchError((err: unknown) => {
                this.error.set(this.extractError(err));
                return of([] as JobOffer[]);
              })
            );
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((list) => {
        this.offers.set(list);
        this.loading.set(false);
      });
  }

  protected onCountriesChange(codes: string[]): void {
    this.writeQuery({ ...this.filters(), countries: codes });
  }

  protected onCadenceChange(cadence: string): void {
    this.writeQuery({ ...this.filters(), cadence: cadence ?? '' });
  }

  protected onLicenseChange(license: string): void {
    this.writeQuery({ ...this.filters(), license: license ?? '' });
  }

  protected clearFilters(): void {
    this.geoError.set(null);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {},
    });
  }

  protected useMyLocation(): void {
    this.geoError.set(null);
    if (!navigator.geolocation) {
      this.geoError.set('Twoja przeglądarka nie obsługuje geolokalizacji');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.writeQuery({
          ...this.filters(),
          nearLat: pos.coords.latitude,
          nearLng: pos.coords.longitude,
        });
      },
      () => {
        this.geoError.set(
          'Nie udało się pobrać lokalizacji. Sprawdź uprawnienia w przeglądarce.'
        );
      },
      { enableHighAccuracy: false, timeout: 10000 }
    );
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

  private writeQuery(model: JobOffersQueryModel): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: jobOffersQueryToRouterParams(model),
      queryParamsHandling: '',
    });
  }

  private extractError(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      const msg = err.error?.message;
      if (typeof msg === 'string') {
        return msg;
      }
      if (Array.isArray(msg)) {
        return msg.join(', ');
      }
    }
    return 'Nie udało się pobrać ofert';
  }
}
