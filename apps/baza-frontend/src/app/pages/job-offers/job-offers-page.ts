import {
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { BreakpointObserver } from '@angular/cdk/layout';
import { NgTemplateOutlet } from '@angular/common';
import {
  HOME_RETURN_CADENCES,
  type CountryCentroid,
  type JobOffer,
} from '@baza/shared-types';
import {
  BazaFilterBar,
  BazaOfferCard,
  BazaOfferCardSkeleton,
  BazaSplitListMap,
  BazaStateBlock,
  toOfferCardVm,
  type OfferFiltersVm,
} from '../../ui';
import { catchError, combineLatest, debounceTime, map, of, switchMap, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { pickCompanyLogoUrl } from './company-logo-url';
import { OfferRouteMapComponent } from './offer-route-map';
import {
  buildRouteMapLegs,
  type MapBasePin,
} from './route-map-geometry';

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
  transport: string;
  nearLat: number | null;
  nearLng: number | null;
  view: 'list' | 'map';
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
    transport: get('transport') ?? '',
    nearLat: nearLat != null && !Number.isNaN(nearLat) ? nearLat : null,
    nearLng: nearLng != null && !Number.isNaN(nearLng) ? nearLng : null,
    view: get('view') === 'map' ? 'map' : 'list',
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
  if (model.transport) {
    params = params.set('transport', model.transport);
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
    transport: model.transport || null,
    nearLat: model.nearLat != null ? String(model.nearLat) : null,
    nearLng: model.nearLng != null ? String(model.nearLng) : null,
    view: model.view === 'map' ? 'map' : null,
  };
}

export function hasActiveJobOfferFilters(model: JobOffersQueryModel): boolean {
  return (
    model.countries.length > 0 ||
    !!model.cadence ||
    !!model.license ||
    !!model.transport ||
    (model.nearLat != null && model.nearLng != null)
  );
}

export function filtersVmFromQuery(model: JobOffersQueryModel): OfferFiltersVm {
  return {
    routeCountries: model.countries,
    cadence: model.cadence || null,
    licence: model.license || null,
    transport: model.transport || null,
  };
}

@Component({
  selector: 'baza-job-offers-page',
  standalone: true,
  imports: [
    NgTemplateOutlet,
    BazaFilterBar,
    BazaOfferCard,
    BazaOfferCardSkeleton,
    BazaSplitListMap,
    BazaStateBlock,
    OfferRouteMapComponent,
  ],
  templateUrl: './job-offers-page.html',
  styleUrl: './job-offers-page.scss',
})
export class JobOffersPage implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly breakpoint = inject(BreakpointObserver);

  protected readonly cadenceLabels = CADENCE_LABELS;

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly geoError = signal<string | null>(null);
  protected readonly offers = signal<JobOffer[]>([]);
  protected readonly centroids = signal<CountryCentroid[]>([]);
  protected readonly highlightedOfferId = signal<string | null>(null);
  protected readonly filters = signal<JobOffersQueryModel>({
    countries: [],
    cadence: '',
    license: '',
    transport: '',
    nearLat: null,
    nearLng: null,
    view: 'list',
  });

  /** Bumped by retryLoad() so refetch shares the queryParamMap → switchMap pipe. */
  private readonly reloadTick = signal(0);
  private readonly reloadTick$ = toObservable(this.reloadTick);

  protected readonly isDesktop = toSignal(
    this.breakpoint
      .observe('(min-width: 900px)')
      .pipe(map((r) => r.matches)),
    { initialValue: false }
  );

  protected readonly hasFilters = computed(() =>
    hasActiveJobOfferFilters(this.filters())
  );
  protected readonly filtersVm = computed(() =>
    filtersVmFromQuery(this.filters())
  );
  protected readonly offerCards = computed(() =>
    this.offers().map((o) =>
      toOfferCardVm(o, pickCompanyLogoUrl(o.companyPhotoUrls))
    )
  );
  protected readonly skeletons = [0, 1, 2];
  protected readonly mapBases = computed((): MapBasePin[] =>
    this.offers()
      .filter(
        (o) =>
          o.baseLocation &&
          Number.isFinite(o.baseLocation.lat) &&
          Number.isFinite(o.baseLocation.lng)
      )
      .map((o) => ({
        id: o.id,
        lat: o.baseLocation!.lat,
        lng: o.baseLocation!.lng,
        label: o.title,
      }))
  );
  protected readonly mapLegs = computed(() => {
    const centroids = this.centroids();
    return this.offers().flatMap((offer) =>
      buildRouteMapLegs(offer.routes, centroids).map((leg) => ({
        ...leg,
        label: offer.id,
      }))
    );
  });

  ngOnInit(): void {
    this.http
      .get<CountryCentroid[]>(`${environment.apiBaseUrl}/api/geo/countries`)
      .pipe(
        catchError(() => of([] as CountryCentroid[])),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((list) => this.centroids.set(list));

    combineLatest([this.route.queryParamMap, this.reloadTick$])
      .pipe(
        tap(([params]) => {
          this.filters.set(parseJobOffersQueryParams((k) => params.get(k)));
        }),
        debounceTime(200),
        switchMap(([params]) => {
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

  protected retryLoad(): void {
    this.reloadTick.update((n) => n + 1);
  }

  protected onFiltersChange(value: OfferFiltersVm): void {
    this.writeQuery({
      ...this.filters(),
      countries: value.routeCountries,
      cadence: value.cadence ?? '',
      license: value.licence ?? '',
      transport: value.transport ?? '',
    });
  }

  protected onViewChange(view: 'list' | 'map'): void {
    this.writeQuery({ ...this.filters(), view });
  }

  protected onCardHovered(id: string | null): void {
    if (this.isDesktop()) {
      this.highlightedOfferId.set(id);
    }
  }

  protected onPinHovered(id: string | null): void {
    this.highlightedOfferId.set(id);
  }

  protected onPinClicked(id: string): void {
    void this.router.navigate(['/job-offers', id], {
      queryParamsHandling: 'preserve',
    });
  }

  protected clearFilters(): void {
    this.geoError.set(null);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { view: this.filters().view === 'map' ? 'map' : null },
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
          'Nie udało się ustalić Twojej lokalizacji. Sprawdź uprawnienia w przeglądarce albo wybierz kraje tras ręcznie.'
        );
      },
      { enableHighAccuracy: false, timeout: 10000 }
    );
  }

  private writeQuery(model: JobOffersQueryModel): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: jobOffersQueryToRouterParams(model),
      queryParamsHandling: '',
    });
  }

  private extractError(err: unknown): string {
    if (!(err instanceof HttpErrorResponse)) {
      return 'Nie udało się wczytać ofert';
    }
    if (err.status === 0) {
      return 'Nie udało się wczytać ofert';
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
    if (
      msg &&
      !msg.toLowerCase().includes('failed to fetch') &&
      !msg.toLowerCase().includes('networkerror') &&
      !msg.toLowerCase().includes('load failed')
    ) {
      return msg;
    }
    return 'Nie udało się wczytać ofert';
  }
}
