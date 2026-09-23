import {
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { BreakpointObserver } from '@angular/cdk/layout';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router } from '@angular/router';
import {
  DRIVER_LICENSES,
  EMPLOYMENT_FORMS,
  HOME_RETURN_CADENCES,
  TRANSPORT_TYPES,
  type CountryOption,
  type JobOffer,
} from '@baza/shared-types';
import {
  BazaFilterBar,
  BazaOfferCard,
  BazaOfferCardSkeleton,
  BazaStateBlock,
  toOfferCardVm,
  type OfferFiltersVm,
} from '../../ui';
import { catchError, combineLatest, debounceTime, map, of, switchMap, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { pickCompanyLogoUrl } from './company-logo-url';
import {
  BazaFiltersSheet,
  type FiltersSheetData,
  type FiltersSheetDismiss,
} from '../../ui/filter-bar/filters-sheet';

const CADENCE_LABELS: Record<(typeof HOME_RETURN_CADENCES)[number], string> = {
  daily: 'Codziennie',
  weekly: 'Co tydzień',
  biweekly: 'Co dwa tygodnie',
  monthly: 'Co miesiąc',
  flexible: 'Elastycznie',
};

export type JobOffersQueryModel = {
  countries: string[];
  cadences: string[];
  licenses: string[];
  transports: string[];
  employmentForms: string[];
  nearLat: number | null;
  nearLng: number | null;
  view: 'list' | 'map';
};

function parseCsvQueryParam(
  get: (key: string) => string | null,
  key: string
): string[] {
  const raw = get(key) ?? '';
  if (!raw) {
    return [];
  }
  return raw
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

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
    cadences: parseCsvQueryParam(get, 'cadence'),
    licenses: parseCsvQueryParam(get, 'license'),
    transports: parseCsvQueryParam(get, 'transport'),
    employmentForms: parseCsvQueryParam(get, 'employment'),
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
  if (model.cadences.length) {
    params = params.set('cadence', model.cadences.join(','));
  }
  if (model.licenses.length) {
    params = params.set('license', model.licenses.join(','));
  }
  if (model.transports.length) {
    params = params.set('transport', model.transports.join(','));
  }
  if (model.employmentForms.length) {
    params = params.set('employment', model.employmentForms.join(','));
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
    cadence: model.cadences.length ? model.cadences.join(',') : null,
    license: model.licenses.length ? model.licenses.join(',') : null,
    transport: model.transports.length ? model.transports.join(',') : null,
    employment: model.employmentForms.length
      ? model.employmentForms.join(',')
      : null,
    nearLat: model.nearLat != null ? String(model.nearLat) : null,
    nearLng: model.nearLng != null ? String(model.nearLng) : null,
    view: model.view === 'map' ? 'map' : null,
  };
}

export function hasActiveJobOfferFilters(model: JobOffersQueryModel): boolean {
  return (
    model.countries.length > 0 ||
    model.cadences.length > 0 ||
    model.licenses.length > 0 ||
    model.transports.length > 0 ||
    model.employmentForms.length > 0 ||
    (model.nearLat != null && model.nearLng != null)
  );
}

export function removeFilterTagFromQuery(
  query: JobOffersQueryModel,
  tagId: string
): JobOffersQueryModel {
  if (tagId.startsWith('country:')) {
    const code = tagId.slice('country:'.length);
    return {
      ...query,
      countries: query.countries.filter((c) => c !== code),
    };
  }
  if (tagId.startsWith('cadence:')) {
    const cadence = tagId.slice('cadence:'.length);
    return {
      ...query,
      cadences: query.cadences.filter((c) => c !== cadence),
    };
  }
  if (tagId.startsWith('license:')) {
    const license = tagId.slice('license:'.length);
    return {
      ...query,
      licenses: query.licenses.filter((l) => l !== license),
    };
  }
  if (tagId.startsWith('transport:')) {
    const transport = tagId.slice('transport:'.length);
    return {
      ...query,
      transports: query.transports.filter((t) => t !== transport),
    };
  }
  if (tagId.startsWith('employment:')) {
    const form = tagId.slice('employment:'.length);
    return {
      ...query,
      employmentForms: query.employmentForms.filter((f) => f !== form),
    };
  }
  if (tagId === 'near') {
    return { ...query, nearLat: null, nearLng: null };
  }
  return query;
}

export type ActiveFilterTag = {
  id: string;
  label: string;
};

export function buildActiveFilterTags(
  query: JobOffersQueryModel,
  cadenceLabels: Record<string, string>,
  countries: readonly CountryOption[]
): ActiveFilterTag[] {
  const nameByCode = new Map(countries.map((c) => [c.code, c.namePl]));
  const tags: ActiveFilterTag[] = [];
  for (const code of query.countries) {
    tags.push({
      id: `country:${code}`,
      label: nameByCode.get(code) ?? code,
    });
  }
  for (const cadence of query.cadences) {
    tags.push({
      id: `cadence:${cadence}`,
      label: cadenceLabels[cadence] ?? cadence,
    });
  }
  for (const license of query.licenses) {
    const licenceLabel =
      DRIVER_LICENSES.find((l) => l.code === license)?.label ?? license;
    tags.push({ id: `license:${license}`, label: licenceLabel });
  }
  for (const transport of query.transports) {
    const transportLabel =
      TRANSPORT_TYPES.find((t) => t.code === transport)?.namePl ?? transport;
    tags.push({ id: `transport:${transport}`, label: transportLabel });
  }
  for (const form of query.employmentForms) {
    const formLabel =
      EMPLOYMENT_FORMS.find((f) => f.code === form)?.namePl ?? form;
    tags.push({ id: `employment:${form}`, label: formLabel });
  }
  if (query.nearLat != null && query.nearLng != null) {
    tags.push({ id: 'near', label: 'Blisko mnie' });
  }
  return tags;
}

export function filtersVmFromQuery(model: JobOffersQueryModel): OfferFiltersVm {
  return {
    routeCountries: model.countries,
    cadences: model.cadences,
    licences: model.licenses,
    transports: model.transports,
    employmentForms: model.employmentForms,
  };
}

@Component({
  selector: 'baza-job-offers-page',
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule,
    BazaFilterBar,
    BazaOfferCard,
    BazaOfferCardSkeleton,
    BazaStateBlock,
  ],
  templateUrl: './job-offers-page.html',
  styleUrl: './job-offers-page.scss',
})
export class JobOffersPage implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly bottomSheet = inject(MatBottomSheet);
  private readonly breakpoint = inject(BreakpointObserver);

  protected readonly isMobile = toSignal(
    this.breakpoint
      .observe('(max-width: 899px)')
      .pipe(map((state) => state.matches)),
    { initialValue: false }
  );

  protected readonly cadenceLabels = CADENCE_LABELS;

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly geoError = signal<string | null>(null);
  protected readonly offers = signal<JobOffer[]>([]);
  protected readonly routeCountries = signal<CountryOption[]>([]);
  protected readonly filters = signal<JobOffersQueryModel>({
    countries: [],
    cadences: [],
    licenses: [],
    transports: [],
    employmentForms: [],
    nearLat: null,
    nearLng: null,
    view: 'list',
  });

  /** Bumped by retryLoad() so refetch shares the queryParamMap → switchMap pipe. */
  private readonly reloadTick = signal(0);
  private readonly reloadTick$ = toObservable(this.reloadTick);

  protected readonly hasFilters = computed(() =>
    hasActiveJobOfferFilters(this.filters())
  );
  protected readonly filtersVm = computed(() =>
    filtersVmFromQuery(this.filters())
  );
  protected readonly activeFilterTags = computed(() =>
    buildActiveFilterTags(
      this.filters(),
      this.cadenceLabels,
      this.routeCountries()
    )
  );
  protected readonly offerCards = computed(() =>
    this.offers().map((o) =>
      toOfferCardVm(o, pickCompanyLogoUrl(o.companyPhotoUrls))
    )
  );
  protected readonly skeletons = [0, 1, 2];

  ngOnInit(): void {
    this.http
      .get<CountryOption[]>(`${environment.apiBaseUrl}/api/offers/countries`)
      .pipe(
        catchError(() => of([] as CountryOption[])),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((countries) => {
        this.routeCountries.set(countries);
      });

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
      cadences: value.cadences,
      licenses: value.licences,
      transports: value.transports,
      employmentForms: value.employmentForms,
    });
  }

  protected removeFilterTag(tagId: string): void {
    const next = removeFilterTagFromQuery(this.filters(), tagId);
    if (tagId === 'near') {
      this.geoError.set(null);
    }
    this.writeQuery(next);
  }

  protected openFiltersSheet(): void {
    const data: FiltersSheetData = {
      value: this.filtersVm(),
      resultCount: this.offers().length,
      cadenceLabels: this.cadenceLabels,
      countries: this.routeCountries(),
    };
    const ref = this.bottomSheet.open(BazaFiltersSheet, {
      data,
      panelClass: 'baza-filters-sheet-panel',
    });
    ref
      .afterDismissed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result: FiltersSheetDismiss | undefined) => {
        if (result === 'use-location') {
          this.useMyLocation();
          return;
        }
        if (result) {
          this.onFiltersChange(result);
        }
      });
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
