import { Component, OnInit, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  FormArray,
  FormBuilder,
  ReactiveFormsModule,
  Validators,
  type AbstractControl,
  type ValidationErrors,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import {
  COUNTRIES,
  HOME_RETURN_CADENCES,
  TRANSPORT_TYPES,
  countryNamePl,
  type JobOffer,
} from '@baza/shared-types';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/auth.service';

const CADENCE_LABELS: Record<string, string> = {
  daily: 'Codziennie',
  weekly: 'Co tydzień',
  biweekly: 'Co dwa tygodnie',
  monthly: 'Co miesiąc',
  flexible: 'Elastycznie',
};

function salaryRangeValidator(
  group: AbstractControl
): ValidationErrors | null {
  const min = group.get('salaryMin')?.value;
  const max = group.get('salaryMax')?.value;
  const currency = group.get('salaryCurrency')?.value as string | null;
  const hasAmount = min != null || max != null;
  if (hasAmount) {
    if (!currency || currency.length !== 3) {
      return { salaryCurrencyRequired: true };
    }
    if (min != null && max != null && Number(min) > Number(max)) {
      return { salaryRange: true };
    }
  }
  return null;
}

@Component({
  selector: 'baza-company-offer-form-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatSnackBarModule,
  ],
  templateUrl: './company-offer-form-page.html',
  styleUrl: './company-offer-form-page.scss',
})
export class CompanyOfferFormPage implements OnInit {
  private readonly fb = new FormBuilder();
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly countries = COUNTRIES;
  protected readonly transportTypes = TRANSPORT_TYPES;
  protected readonly cadences = HOME_RETURN_CADENCES;
  protected readonly cadenceLabels = CADENCE_LABELS;
  protected readonly loading = signal(true);
  protected readonly submitting = signal(false);
  protected readonly editId = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group(
    {
      title: [
        '',
        [Validators.required, Validators.minLength(2), Validators.maxLength(120)],
      ],
      description: [
        '',
        [Validators.required, Validators.minLength(1), Validators.maxLength(2000)],
      ],
      homeReturnCadence: ['weekly' as string, Validators.required],
      requiredYearsExperience: [0, [Validators.required, Validators.min(0)]],
      requiredTransportType: ['curtain' as string, Validators.required],
      routes: this.fb.array([this.newRouteGroup()]),
      salaryMin: [null as number | null, [Validators.min(0)]],
      salaryMax: [null as number | null, [Validators.min(0)]],
      salaryCurrency: [
        'PLN',
        [Validators.minLength(3), Validators.maxLength(3)],
      ],
      published: [true],
    },
    { validators: [salaryRangeValidator] }
  );

  protected get routes(): FormArray {
    return this.form.controls.routes;
  }

  async ngOnInit(): Promise<void> {
    await this.auth.whenReady();
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.editId.set(id);
      await this.loadOffer(id);
    }
    this.loading.set(false);
  }

  protected addRoute(): void {
    this.routes.push(this.newRouteGroup());
  }

  protected removeRoute(index: number): void {
    if (this.routes.length > 1) {
      this.routes.removeAt(index);
    }
  }

  protected onFromCode(index: number, code: string): void {
    const group = this.routes.at(index);
    group.get('fromCode')?.setValue(code);
    group.get('fromName')?.setValue(countryNamePl(code) ?? code);
  }

  protected onToCode(index: number, code: string): void {
    const group = this.routes.at(index);
    group.get('toCode')?.setValue(code);
    group.get('toName')?.setValue(countryNamePl(code) ?? code);
  }

  protected async onSubmit(): Promise<void> {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    const body = {
      title: raw.title,
      description: raw.description,
      homeReturnCadence: raw.homeReturnCadence,
      requiredYearsExperience: Number(raw.requiredYearsExperience),
      requiredTransportType: raw.requiredTransportType,
      routes: raw.routes.map((r) => ({
        from: { code: r.fromCode, name: r.fromName },
        to: { code: r.toCode, name: r.toName },
      })),
      salaryMin: raw.salaryMin,
      salaryMax: raw.salaryMax,
      salaryCurrency:
        raw.salaryMin != null || raw.salaryMax != null
          ? raw.salaryCurrency || 'PLN'
          : null,
      published: raw.published,
    };

    this.submitting.set(true);
    try {
      const editId = this.editId();
      if (editId) {
        await firstValueFrom(
          this.http.patch<JobOffer>(
            `${environment.apiBaseUrl}/api/company/offers/${editId}`,
            body
          )
        );
        this.snackBar.open('Oferta zapisana', 'OK', { duration: 4000 });
      } else {
        await firstValueFrom(
          this.http.post<JobOffer>(
            `${environment.apiBaseUrl}/api/company/offers`,
            body
          )
        );
        this.snackBar.open('Oferta utworzona', 'OK', { duration: 4000 });
      }
      await this.router.navigateByUrl('/company/offers');
    } catch (err: unknown) {
      this.snackBar.open(this.extractError(err), 'OK', { duration: 7000 });
    } finally {
      this.submitting.set(false);
    }
  }

  private newRouteGroup() {
    return this.fb.nonNullable.group({
      fromCode: ['PL', Validators.required],
      fromName: ['Polska', Validators.required],
      toCode: ['DE', Validators.required],
      toName: ['Niemcy', Validators.required],
    });
  }

  private async loadOffer(id: string): Promise<void> {
    try {
      const offers = await firstValueFrom(
        this.http.get<JobOffer[]>(
          `${environment.apiBaseUrl}/api/company/offers`
        )
      );
      const offer = offers.find((o) => o.id === id);
      if (!offer) {
        this.snackBar.open('Nie znaleziono oferty', 'OK', { duration: 5000 });
        await this.router.navigateByUrl('/company/offers');
        return;
      }
      while (this.routes.length) {
        this.routes.removeAt(0);
      }
      for (const r of offer.routes) {
        this.routes.push(
          this.fb.nonNullable.group({
            fromCode: [r.from.code, Validators.required],
            fromName: [r.from.name, Validators.required],
            toCode: [r.to.code, Validators.required],
            toName: [r.to.name, Validators.required],
          })
        );
      }
      this.form.patchValue({
        title: offer.title,
        description: offer.description,
        homeReturnCadence: offer.homeReturnCadence,
        requiredYearsExperience: offer.requiredYearsExperience,
        requiredTransportType: offer.requiredTransportType,
        salaryMin: offer.salary?.min ?? null,
        salaryMax: offer.salary?.max ?? null,
        salaryCurrency: offer.salary?.currency ?? 'PLN',
        published: offer.published,
      });
    } catch (err: unknown) {
      this.snackBar.open(this.extractError(err), 'OK', { duration: 6000 });
    }
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
    return 'Nie udało się zapisać oferty';
  }
}
