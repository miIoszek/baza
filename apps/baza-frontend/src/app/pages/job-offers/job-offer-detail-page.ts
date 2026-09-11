import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { BreakpointObserver } from '@angular/cdk/layout';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import {
  APPLICATION_FIELD_LIMITS,
  HOME_RETURN_CADENCES,
  TRANSPORT_TYPES,
  type CountryCentroid,
  type CreateJobApplicationResponse,
  type JobOffer,
} from '@baza/shared-types';
import { firstValueFrom, forkJoin, map, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  buildApplicationFormData,
  applicationPhoneValidator,
  validateApplicationCv,
} from './application-form.helpers';
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
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    OfferRouteMapComponent,
  ],
  templateUrl: './job-offer-detail-page.html',
  styleUrl: './job-offer-detail-page.scss',
})
export class JobOfferDetailPage implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly breakpoint = inject(BreakpointObserver);
  private readonly fb = new FormBuilder();

  protected readonly fieldLimits = APPLICATION_FIELD_LIMITS;
  protected readonly loading = signal(true);
  protected readonly notFound = signal(false);
  protected readonly offer = signal<JobOffer | null>(null);
  protected readonly centroids = signal<CountryCentroid[]>([]);
  protected readonly applySuccess = signal(false);
  protected readonly applying = signal(false);
  protected readonly applyError = signal<string | null>(null);
  protected readonly cvError = signal<string | null>(null);
  private cvFile: File | null = null;

  protected readonly applyForm = this.fb.nonNullable.group({
    email: [
      '',
      [
        Validators.required,
        Validators.email,
        Validators.maxLength(APPLICATION_FIELD_LIMITS.email),
      ],
    ],
    phone: [
      '',
      [
        Validators.required,
        Validators.maxLength(APPLICATION_FIELD_LIMITS.phone),
        applicationPhoneValidator(),
      ],
    ],
    message: ['', [Validators.maxLength(APPLICATION_FIELD_LIMITS.message)]],
    consentAccepted: [false, [Validators.requiredTrue]],
  });

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

  protected onCvSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.cvFile = file;
    this.cvError.set(validateApplicationCv(file));
  }

  protected async onApply(): Promise<void> {
    const offer = this.offer();
    if (!offer || this.applying()) {
      return;
    }
    this.applyForm.markAllAsTouched();
    const cvMsg = validateApplicationCv(this.cvFile);
    this.cvError.set(cvMsg);
    if (this.applyForm.invalid || cvMsg || !this.cvFile) {
      return;
    }

    this.applying.set(true);
    this.applyError.set(null);
    try {
      const raw = this.applyForm.getRawValue();
      const body = buildApplicationFormData({
        email: raw.email,
        phone: raw.phone,
        message: raw.message,
        consentAccepted: raw.consentAccepted,
        cv: this.cvFile,
      });
      await firstValueFrom(
        this.http.post<CreateJobApplicationResponse>(
          `${environment.apiBaseUrl}/api/offers/${offer.id}/applications`,
          body
        )
      );
      this.applySuccess.set(true);
      this.applyForm.reset({
        email: '',
        phone: '',
        message: '',
        consentAccepted: false,
      });
      this.cvFile = null;
      this.cvError.set(null);
    } catch (err: unknown) {
      this.applyError.set(this.extractError(err));
    } finally {
      this.applying.set(false);
    }
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
    return 'Nie udało się wysłać aplikacji';
  }
}
