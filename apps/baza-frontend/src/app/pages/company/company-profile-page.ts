import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import type { AuthMeCompany } from '@baza/shared-types';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/auth.service';

const NIP_PATTERN = /^\d{10}$/;
const PHOTO_MAX_BYTES = 5 * 1024 * 1024;
const PHOTO_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

@Component({
  selector: 'baza-company-profile-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
  ],
  templateUrl: './company-profile-page.html',
  styleUrl: './company-profile-page.scss',
})
export class CompanyProfilePage implements OnInit, OnDestroy {
  private readonly fb = new FormBuilder();
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly loading = signal(true);
  protected readonly submitting = signal(false);
  protected readonly companyId = signal<string | null>(null);
  protected readonly photoPreview = signal<string | null>(null);
  private photoFile: File | null = null;

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]],
    nip: [
      '',
      [Validators.required, Validators.pattern(NIP_PATTERN)],
    ],
    baseLocation: [
      '',
      [Validators.required, Validators.minLength(1), Validators.maxLength(200)],
    ],
    description: [
      '',
      [Validators.required, Validators.minLength(1), Validators.maxLength(2000)],
    ],
  });

  async ngOnInit(): Promise<void> {
    await this.auth.whenReady();
    await this.auth.refreshMe();
    const company = this.auth.company();
    if (!company) {
      this.loading.set(false);
      this.snackBar.open('Nie znaleziono profilu firmy', 'OK', {
        duration: 5000,
      });
      return;
    }
    this.applyCompany(company);
    this.loading.set(false);
  }

  ngOnDestroy(): void {
    this.revokePreview();
  }

  protected onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;

    this.revokePreview();

    if (!file) {
      this.photoFile = null;
      this.photoPreview.set(null);
      return;
    }

    if (!PHOTO_MIME.has(file.type)) {
      input.value = '';
      this.photoFile = null;
      this.photoPreview.set(null);
      this.snackBar.open(
        'Dozwolone są tylko pliki JPEG, PNG lub WebP',
        'OK',
        { duration: 5000 }
      );
      return;
    }

    if (file.size > PHOTO_MAX_BYTES) {
      input.value = '';
      this.photoFile = null;
      this.photoPreview.set(null);
      this.snackBar.open('Logo może mieć max. 5 MB', 'OK', { duration: 5000 });
      return;
    }

    this.photoFile = file;
    this.photoPreview.set(URL.createObjectURL(file));
  }

  protected async onSubmit(): Promise<void> {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    this.submitting.set(true);
    try {
      const formData = new FormData();
      formData.append('name', raw.name);
      formData.append('nip', raw.nip);
      formData.append('description', raw.description);
      formData.append('baseLocation', raw.baseLocation);
      if (this.photoFile) {
        formData.append('photo', this.photoFile);
      }

      const updated = await firstValueFrom(
        this.http.patch<AuthMeCompany>(
          `${environment.apiBaseUrl}/api/company/profile`,
          formData
        )
      );

      // Drop blob preview first, then show server URLs (versioned R2 keys).
      this.photoFile = null;
      this.revokePreview();
      this.applyCompany(updated);
      await this.auth.refreshMe();
      this.snackBar.open('Profil zapisany', 'OK', { duration: 4000 });
    } catch (err: unknown) {
      this.snackBar.open(this.extractError(err), 'OK', { duration: 6000 });
    } finally {
      this.submitting.set(false);
    }
  }

  private applyCompany(company: AuthMeCompany): void {
    this.companyId.set(company.id);
    this.form.setValue({
      name: company.name,
      nip: company.nip,
      baseLocation: company.baseLocation,
      description: company.description,
    });
    const urls = company.photoUrls;
    if (urls && !this.photoFile) {
      const url =
        urls['s192'] ?? urls['s96'] ?? urls['original'] ?? null;
      this.photoPreview.set(url);
    }
  }

  private revokePreview(): void {
    const previous = this.photoPreview();
    if (previous?.startsWith('blob:')) {
      URL.revokeObjectURL(previous);
    }
    this.photoPreview.set(null);
  }

  private extractError(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      const body = err.error as { message?: string | string[] } | string | null;
      if (typeof body === 'string' && body.trim()) {
        return body;
      }
      if (body && typeof body === 'object' && body.message) {
        return Array.isArray(body.message)
          ? body.message.join(', ')
          : body.message;
      }
      return err.message || 'Nie udało się zapisać profilu';
    }
    if (err instanceof Error) {
      return err.message;
    }
    return 'Nie udało się zapisać profilu';
  }
}
