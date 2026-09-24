import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { BreakpointObserver } from '@angular/cdk/layout';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import {
  driverLicenseLabel,
  employmentFormsLabel,
  type CountryCentroid,
  type CreateJobApplicationResponse,
  type JobOffer,
} from '@baza/shared-types';
import { firstValueFrom, forkJoin, map, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  BazaApplicationForm,
  BazaLogoAvatar,
  BazaSkeleton,
  BazaStateBlock,
  BazaTag,
  OfferRouteMapComponent,
  buildRouteMapLegs,
  cadenceLabel,
  formatSalary,
  hasRouteMapGeometry,
  routeLegLabel,
  transportLabel,
  yearsLabel,
  type BazaApplicationState,
  type BazaApplicationSubmit,
} from '../../ui';
import { buildApplicationFormData } from './application-form.helpers';
import { pickCompanyLogoUrl } from './company-logo-url';

@Component({
  selector: 'baza-job-offer-detail-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    MatButtonModule,
    BazaApplicationForm,
    BazaLogoAvatar,
    BazaSkeleton,
    BazaStateBlock,
    BazaTag,
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
  protected readonly applyState = signal<BazaApplicationState>('idle');
  protected readonly applyErrorMessage = signal<string | null>(null);
  protected readonly hoveredRouteLabel = signal<string | null>(null);
  /** Mobile map strip: short by default so the offer stays in view. */
  protected readonly mapExpanded = signal(false);
  protected readonly skeletonRows = [1, 2, 3, 4, 5];

  protected readonly isDesktop = toSignal(
    this.breakpoint.observe('(min-width: 900px)').pipe(map((r) => r.matches)),
    { initialValue: true }
  );

  protected readonly routeLegs = computed(() => {
    const o = this.offer();
    return o ? buildRouteMapLegs(o.routes, this.centroids()) : [];
  });

  protected readonly hasMapGeometry = computed(() => {
    const o = this.offer();
    return !!o && hasRouteMapGeometry(o.baseLocation, this.routeLegs());
  });

  protected readonly routeKey = routeLegLabel;
  protected readonly cadenceLabel = cadenceLabel;
  protected readonly transportLabel = transportLabel;
  protected readonly yearsLabel = yearsLabel;
  protected readonly salaryText = formatSalary;
  protected readonly licenseLabel = driverLicenseLabel;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.loading.set(false);
      this.notFound.set(true);
      return;
    }

    forkJoin({
      offer: this.http.get<JobOffer>(`${environment.apiBaseUrl}/api/offers/${id}`),
      centroids: this.http
        .get<CountryCentroid[]>(`${environment.apiBaseUrl}/api/geo/countries`)
        .pipe(catchError(() => of([] as CountryCentroid[]))),
    }).subscribe({
      next: ({ offer, centroids }) => {
        this.offer.set(offer);
        this.centroids.set(centroids);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.notFound.set(true);
      },
    });
  }

  protected hoverRoute(fromCode: string, toCode: string): void {
    this.hoveredRouteLabel.set(routeLegLabel(fromCode, toCode));
  }

  protected clearHoveredRoute(): void {
    this.hoveredRouteLabel.set(null);
  }

  protected employmentLabel(offer: JobOffer): string {
    return employmentFormsLabel(offer.employmentForms);
  }

  protected logoUrl(offer: JobOffer): string | null {
    return pickCompanyLogoUrl(offer.companyPhotoUrls);
  }

  protected scrollToApply(): void {
    const target = document.getElementById('aplikuj');
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    target?.focus({ preventScroll: true });
  }

  protected async onApply(submit: BazaApplicationSubmit): Promise<void> {
    const offer = this.offer();
    if (!offer || this.applyState() === 'sending') {
      return;
    }
    this.applyState.set('sending');
    this.applyErrorMessage.set(null);
    try {
      await firstValueFrom(
        this.http.post<CreateJobApplicationResponse>(
          `${environment.apiBaseUrl}/api/offers/${offer.id}/applications`,
          buildApplicationFormData({ ...submit, consentAccepted: true })
        )
      );
      this.applyState.set('sent');
    } catch (err: unknown) {
      if (err instanceof HttpErrorResponse && err.status === 409) {
        this.applyState.set('error-duplicate');
        return;
      }
      this.applyErrorMessage.set(serverReason(err));
      this.applyState.set('error-network');
    }
  }
}

/** A readable API reason for 4xx; null (generic connection text) otherwise. */
function serverReason(err: unknown): string | null {
  if (!(err instanceof HttpErrorResponse) || err.status < 400 || err.status >= 500) {
    return null;
  }
  const msg = err.error?.message;
  if (typeof msg === 'string') {
    return msg;
  }
  return Array.isArray(msg) ? msg.join(', ') : null;
}
