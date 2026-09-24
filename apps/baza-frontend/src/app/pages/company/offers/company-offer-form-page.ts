import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  OnInit,
  afterNextRender,
  computed,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
  type AbstractControl,
  type ValidationErrors,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import type { ErrorStateMatcher } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  COUNTRIES,
  DRIVER_LICENSES,
  EMPLOYMENT_FORMS,
  HOME_RETURN_CADENCES,
  TRANSPORT_TYPES,
  countryNamePl,
  type CountryCentroid,
  type JobOffer,
} from '@baza/shared-types';
import { firstValueFrom, map, startWith } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/auth.service';
import { pluralPl } from '../../../core/polish-plural';
import {
  BazaMapPreview,
  BazaRouteEditor,
  BazaSkeleton,
  BazaStateBlock,
  cadenceLabel,
  routeGroup,
  type BazaRouteRow,
} from '../../../ui';
import { hasPublishableBaseCoords } from '../../job-offers/application-form.helpers';

function salaryRangeValidator(group: AbstractControl): ValidationErrors | null {
  const min = group.get('salaryMin')?.value;
  const max = group.get('salaryMax')?.value;
  const currency = group.get('salaryCurrency')?.value as string | null;
  if (min == null && max == null) {
    return null;
  }
  if (!currency || currency.trim().length !== 3) {
    return { salaryCurrencyRequired: true };
  }
  if (min != null && max != null && Number(min) > Number(max)) {
    return { salaryRange: true };
  }
  return null;
}

function minSelected(min: number) {
  return (control: AbstractControl): ValidationErrors | null =>
    Array.isArray(control.value) && control.value.length >= min ? null : { required: true };
}

/** New offer and editing an existing one (canvas "FormularzOferty"). */
@Component({
  selector: 'baza-company-offer-form-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    BazaMapPreview,
    BazaRouteEditor,
    BazaSkeleton,
    BazaStateBlock,
  ],
  templateUrl: './company-offer-form-page.html',
  styleUrl: './company-offer-form-page.scss',
})
export class CompanyOfferFormPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);
  private readonly injector = inject(Injector);

  protected readonly countries = COUNTRIES.map((c) => ({ code: c.code, name: c.namePl }));
  protected readonly cadences = HOME_RETURN_CADENCES.map((code) => ({ code, label: cadenceLabel(code) }));
  protected readonly transportTypes = TRANSPORT_TYPES;
  protected readonly licenses = DRIVER_LICENSES;
  protected readonly employmentFormOptions = EMPLOYMENT_FORMS;
  protected readonly skeletons = [1, 2, 3];

  protected readonly loading = signal(true);
  protected readonly loadFailed = signal(false);
  protected readonly submitting = signal(false);
  protected readonly editId = signal<string | null>(null);
  protected readonly canPublish = signal(false);
  protected readonly centroids = signal<CountryCentroid[]>([]);

  protected readonly form = this.fb.nonNullable.group(
    {
      title: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]],
      description: ['', [Validators.required, Validators.maxLength(2000)]],
      homeReturnCadence: ['weekly' as string, Validators.required],
      requiredYearsExperience: [
        0 as number | null,
        [Validators.required, Validators.min(0), Validators.max(40), Validators.pattern(/^\d+$/)],
      ],
      requiredTransportType: ['curtain' as string, Validators.required],
      licenseCategory: ['C' as string, Validators.required],
      employmentForms: [['uop'] as string[], [minSelected(1)]],
      routes: this.fb.array<BazaRouteRow>([routeGroup('PL', '')], Validators.required),
      salaryMin: [null as number | null, [Validators.min(0)]],
      salaryMax: [null as number | null, [Validators.min(0)]],
      salaryCurrency: ['PLN', [Validators.minLength(3), Validators.maxLength(3)]],
      published: [true],
    },
    { validators: [salaryRangeValidator] }
  );

  protected readonly routes = this.form.controls.routes;

  /** Current routes as a signal, for the count and the live map preview. */
  protected readonly routeRows = toSignal(
    this.routes.valueChanges.pipe(
      startWith(null),
      map(() => this.routes.getRawValue())
    ),
    { requireSync: true }
  );

  protected readonly routeCountLabel = computed(() =>
    pluralPl(this.routeRows().length, 'trasa', 'trasy', 'tras')
  );

  /** "Do" also shows the range error (it belongs to the group, not to the field). */
  protected readonly salaryMaxMatcher: ErrorStateMatcher = {
    isErrorState: (control) =>
      !!control &&
      (control.touched || this.form.controls.salaryMin.touched) &&
      (control.invalid || this.form.hasError('salaryRange')),
  };

  /** "Waluta" turns red when an amount is given without a currency. */
  protected readonly currencyMatcher: ErrorStateMatcher = {
    isErrorState: (control) =>
      !!control &&
      (control.touched ||
        this.form.controls.salaryMin.touched ||
        this.form.controls.salaryMax.touched) &&
      (control.invalid || this.form.hasError('salaryCurrencyRequired')),
  };

  async ngOnInit(): Promise<void> {
    void this.loadCentroids();
    await this.auth.whenReady();
    await this.auth.refreshMe();
    this.canPublish.set(hasPublishableBaseCoords(this.auth.company()));
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.editId.set(id);
      await this.loadOffer(id);
    }
    if (!this.canPublish()) {
      this.form.controls.published.setValue(false);
    }
    this.loading.set(false);
  }

  protected async retryLoad(): Promise<void> {
    const id = this.editId();
    if (!id || this.loading()) {
      return;
    }
    this.loading.set(true);
    await this.loadOffer(id);
    this.loading.set(false);
  }

  protected hasEmploymentForm(code: string): boolean {
    return this.form.controls.employmentForms.value.includes(code);
  }

  protected toggleEmploymentForm(code: string, checked: boolean): void {
    const control = this.form.controls.employmentForms;
    const rest = control.value.filter((c) => c !== code);
    // Keep the dictionary order whatever the click order was.
    const next = checked ? [...rest, code] : rest;
    control.setValue(this.employmentFormOptions.map((f) => f.code).filter((c) => next.includes(c)));
    control.markAsTouched();
  }

  protected setPublished(published: boolean): void {
    if (published && !this.canPublish()) {
      return;
    }
    this.form.controls.published.setValue(published);
  }

  protected async onSubmit(): Promise<void> {
    if (this.submitting()) {
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.focusFirstInvalid();
      return;
    }
    const raw = this.form.getRawValue();
    const hasSalary = raw.salaryMin != null || raw.salaryMax != null;
    const body = {
      title: raw.title.trim(),
      description: raw.description,
      homeReturnCadence: raw.homeReturnCadence,
      requiredYearsExperience: Number(raw.requiredYearsExperience),
      requiredTransportType: raw.requiredTransportType,
      licenseCategory: raw.licenseCategory,
      employmentForms: raw.employmentForms,
      routes: raw.routes.map((r) => ({
        from: { code: r.fromCountry, name: countryNamePl(r.fromCountry) ?? r.fromCountry },
        to: { code: r.toCountry, name: countryNamePl(r.toCountry) ?? r.toCountry },
      })),
      salaryMin: raw.salaryMin,
      salaryMax: raw.salaryMax,
      salaryCurrency: hasSalary ? raw.salaryCurrency.trim().toUpperCase() : null,
      published: raw.published && this.canPublish(),
    };

    this.submitting.set(true);
    try {
      const editId = this.editId();
      if (editId) {
        await firstValueFrom(
          this.http.patch<JobOffer>(`${environment.apiBaseUrl}/api/company/offers/${editId}`, body)
        );
        this.snackBar.open('Oferta zapisana', 'OK', { duration: 4000 });
      } else {
        await firstValueFrom(
          this.http.post<JobOffer>(`${environment.apiBaseUrl}/api/company/offers`, body)
        );
        this.snackBar.open(
          body.published ? 'Oferta opublikowana' : 'Szkic oferty zapisany',
          'OK',
          { duration: 4000 }
        );
      }
      await this.router.navigateByUrl('/company/offers');
    } catch (err: unknown) {
      this.snackBar.open(this.extractError(err), 'OK', { duration: 7000 });
    } finally {
      this.submitting.set(false);
    }
  }

  /** Move focus to the first field with an error, once the error states are drawn. */
  private focusFirstInvalid(): void {
    afterNextRender(
      () => {
        // First in page order: a field showing an error, an employment-form checkbox,
        // or "Dodaj trasę" when there are no routes.
        const first = this.host.nativeElement.querySelector<HTMLElement>(
          'mat-error, [data-invalid="true"] input, .baza-route-editor__empty ~ .baza-route-editor__add'
        );
        const target =
          first?.tagName === 'MAT-ERROR'
            ? first
                .closest('mat-form-field')
                ?.querySelector<HTMLElement>('input, textarea, mat-select')
            : first;
        target?.focus();
      },
      { injector: this.injector }
    );
  }

  private async loadCentroids(): Promise<void> {
    try {
      this.centroids.set(
        await firstValueFrom(
          this.http.get<CountryCentroid[]>(`${environment.apiBaseUrl}/api/geo/countries`)
        )
      );
    } catch {
      // Without centroids the preview shows an empty map; the form still works.
    }
  }

  private async loadOffer(id: string): Promise<void> {
    this.loadFailed.set(false);
    try {
      const offers = await firstValueFrom(
        this.http.get<JobOffer[]>(`${environment.apiBaseUrl}/api/company/offers`)
      );
      const offer = offers.find((o) => o.id === id);
      if (!offer) {
        this.snackBar.open('Nie znaleziono oferty', 'OK', { duration: 5000 });
        await this.router.navigateByUrl('/company/offers');
        return;
      }
      this.routes.clear();
      for (const r of offer.routes) {
        this.routes.push(routeGroup(r.from.code, r.to.code));
      }
      this.form.patchValue({
        title: offer.title,
        description: offer.description,
        homeReturnCadence: offer.homeReturnCadence,
        requiredYearsExperience: offer.requiredYearsExperience,
        requiredTransportType: offer.requiredTransportType,
        licenseCategory: offer.licenseCategory,
        employmentForms: offer.employmentForms,
        salaryMin: offer.salary?.min ?? null,
        salaryMax: offer.salary?.max ?? null,
        salaryCurrency: offer.salary?.currency ?? 'PLN',
        published: offer.published,
      });
    } catch {
      // Never show the form with defaults for an offer that did not load: saving would overwrite it.
      this.loadFailed.set(true);
    }
  }

  private extractError(err: unknown): string {
    if (err instanceof HttpErrorResponse && err.status >= 400 && err.status < 500) {
      const msg = err.error?.message;
      if (typeof msg === 'string') {
        return msg;
      }
      if (Array.isArray(msg)) {
        return msg.join(', ');
      }
    }
    return 'Nie udało się zapisać oferty. Spróbuj ponownie.';
  }
}
