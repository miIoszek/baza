import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  OnDestroy,
  OnInit,
  afterNextRender,
  computed,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import type { AuthMeCompany } from '@baza/shared-types';
import { firstValueFrom, map, startWith } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/auth.service';
import { coordinatesValidator, formatCoordinates, parseCoordinates } from '../../core/coordinates';
import { nipValidator } from '../../core/form-validators';
import {
  BazaLogoAvatar,
  BazaSkeleton,
  BazaStateBlock,
  OfferRouteMapComponent,
} from '../../ui';

const PHOTO_MAX_BYTES = 5 * 1024 * 1024;
const PHOTO_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

/**
 * Company profile (canvas "ProfilFirmy"). Until the address search lands, the base
 * is an address line plus coordinates pasted by hand; the map shows where they point.
 */
@Component({
  selector: 'baza-company-profile-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    BazaLogoAvatar,
    BazaSkeleton,
    BazaStateBlock,
    OfferRouteMapComponent,
  ],
  templateUrl: './company-profile-page.html',
  styleUrl: './company-profile-page.scss',
})
export class CompanyProfilePage implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);
  private readonly injector = inject(Injector);

  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly submitting = signal(false);
  protected readonly company = signal<AuthMeCompany | null>(null);
  protected readonly photoPreview = signal<string | null>(null);
  protected readonly photoName = signal<string | null>(null);
  protected readonly photoError = signal<string | null>(null);
  protected readonly showCoordinates = signal(false);
  private photoFile: File | null = null;

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]],
    nip: ['', [Validators.required, nipValidator()]],
    description: ['', [Validators.required, Validators.maxLength(2000)]],
    baseLocation: ['', [Validators.required, Validators.maxLength(200)]],
    coordinates: ['', [coordinatesValidator()]],
  });

  /** The base as the map should show it, following what is typed. */
  protected readonly pin = toSignal(
    this.form.controls.coordinates.valueChanges.pipe(
      startWith(null),
      map(() => parseCoordinates(this.form.controls.coordinates.value))
    ),
    { requireSync: true }
  );

  protected readonly pinLabel = computed(() => {
    const pin = this.pin();
    return pin ? formatCoordinates(pin) : null;
  });

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  ngOnDestroy(): void {
    this.revokePreview();
  }

  protected async retryLoad(): Promise<void> {
    if (!this.loading()) {
      await this.load();
    }
  }

  protected revealCoordinates(): void {
    this.showCoordinates.set(true);
    afterNextRender(
      () => this.host.nativeElement.querySelector<HTMLElement>('#profile-coordinates')?.focus(),
      { injector: this.injector }
    );
  }

  protected onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    input.value = '';
    if (!file) {
      return;
    }
    if (!PHOTO_MIME.has(file.type)) {
      this.photoError.set('Logo musi być plikiem PNG, JPG lub WebP.');
      return;
    }
    if (file.size > PHOTO_MAX_BYTES) {
      this.photoError.set('Logo może mieć najwyżej 5 MB.');
      return;
    }
    this.photoError.set(null);
    this.revokePreview();
    this.photoFile = file;
    this.photoName.set(file.name);
    this.photoPreview.set(URL.createObjectURL(file));
  }

  /** "Anuluj": back to what is saved. */
  protected discardChanges(): void {
    const company = this.company();
    if (company) {
      this.applyCompany(company);
    }
  }

  protected async onSubmit(): Promise<void> {
    if (this.submitting()) {
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      if (this.form.controls.coordinates.invalid) {
        this.showCoordinates.set(true);
      }
      this.focusFirstInvalid();
      return;
    }

    const raw = this.form.getRawValue();
    const coords = parseCoordinates(raw.coordinates);
    const formData = new FormData();
    formData.append('name', raw.name.trim());
    formData.append('nip', raw.nip.replace(/[\s-]/g, ''));
    formData.append('description', raw.description);
    formData.append('baseLocation', raw.baseLocation.trim());
    formData.append('baseLat', coords ? String(coords.lat) : '');
    formData.append('baseLng', coords ? String(coords.lng) : '');
    if (this.photoFile) {
      formData.append('photo', this.photoFile);
    }

    this.submitting.set(true);
    try {
      const updated = await firstValueFrom(
        this.http.patch<AuthMeCompany>(`${environment.apiBaseUrl}/api/company/profile`, formData)
      );
      this.applyCompany(updated);
      // The app bar shows the name and logo too.
      await this.auth.refreshMe();
      this.snackBar.open('Profil zapisany', 'OK', { duration: 4000 });
    } catch (err: unknown) {
      this.snackBar.open(this.extractError(err), 'OK', { duration: 7000 });
    } finally {
      this.submitting.set(false);
    }
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(null);
    await this.auth.whenReady();
    await this.auth.refreshMe();
    const error = this.auth.meLoadError();
    const company = this.auth.company();
    if (error) {
      this.loadError.set(error);
    } else if (company) {
      this.applyCompany(company);
      // No pin yet: the coordinates field is the only way to set one, so show it.
      this.showCoordinates.set(company.baseLat == null || company.baseLng == null);
    }
    this.loading.set(false);
  }

  private applyCompany(company: AuthMeCompany): void {
    this.company.set(company);
    const hasPin = company.baseLat != null && company.baseLng != null;
    this.form.reset({
      name: company.name,
      nip: company.nip,
      description: company.description,
      baseLocation: company.baseLocation,
      coordinates: hasPin ? `${company.baseLat}, ${company.baseLng}` : '',
    });
    this.photoFile = null;
    this.photoName.set(null);
    this.photoError.set(null);
    this.revokePreview();
    const urls = company.photoUrls;
    this.photoPreview.set(urls ? (urls['s192'] ?? urls['s96'] ?? urls['original'] ?? null) : null);
  }

  /** Focus the first field showing an error, once the error states are drawn. */
  private focusFirstInvalid(): void {
    afterNextRender(
      () =>
        this.host.nativeElement
          .querySelector('mat-error')
          ?.closest('mat-form-field')
          ?.querySelector<HTMLElement>('input, textarea')
          ?.focus(),
      { injector: this.injector }
    );
  }

  private revokePreview(): void {
    const previous = this.photoPreview();
    if (previous?.startsWith('blob:')) {
      URL.revokeObjectURL(previous);
    }
    this.photoPreview.set(null);
  }

  private extractError(err: unknown): string {
    if (err instanceof HttpErrorResponse && err.status >= 400 && err.status < 500) {
      const msg = (err.error as { message?: unknown } | null)?.message;
      if (typeof msg === 'string') {
        return msg;
      }
      if (Array.isArray(msg)) {
        return msg.join(', ');
      }
    }
    return 'Nie udało się zapisać profilu. Spróbuj ponownie.';
  }
}
