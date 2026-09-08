import { Component, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/auth.service';

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const password = group.get('password')?.value;
  const confirm = group.get('confirmPassword')?.value;
  if (!password || !confirm) {
    return null;
  }
  return password === confirm ? null : { passwordMismatch: true };
}

@Component({
  selector: 'baza-register-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
    MatSnackBarModule,
  ],
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export class RegisterPage {
  private readonly fb = new FormBuilder();
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly hidePassword = signal(true);
  protected readonly hideConfirm = signal(true);
  protected readonly submitting = signal(false);
  protected readonly photoPreview = signal<string | null>(null);
  private photoFile: File | null = null;

  protected readonly form = this.fb.nonNullable.group(
    {
      companyName: ['', [Validators.required]],
      nip: ['', [Validators.required, Validators.minLength(10)]],
      email: ['', [Validators.required, Validators.email]],
      location: ['', [Validators.required]],
      description: ['', [Validators.required]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
      terms: [false, [Validators.requiredTrue]],
    },
    { validators: passwordsMatch }
  );

  protected onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;

    const previousPreview = this.photoPreview();
    if (previousPreview) {
      URL.revokeObjectURL(previousPreview);
    }

    if (!file) {
      this.photoFile = null;
      this.photoPreview.set(null);
      return;
    }

    const allowed = new Set(['image/jpeg', 'image/png', 'image/webp']);
    const maxBytes = 5 * 1024 * 1024;

    if (!allowed.has(file.type)) {
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

    if (file.size > maxBytes) {
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
      formData.append('name', raw.companyName);
      formData.append('nip', raw.nip);
      formData.append('email', raw.email);
      formData.append('password', raw.password);
      formData.append('description', raw.description);
      formData.append('baseLocation', raw.location);
      formData.append('termsAccepted', String(raw.terms));
      if (this.photoFile) {
        formData.append('photo', this.photoFile);
      }

      await firstValueFrom(
        this.http.post(`${environment.apiBaseUrl}/api/auth/register`, formData)
      );

      const { error } = await this.auth.signIn(raw.email, raw.password);
      if (error) {
        this.snackBar.open(error, 'OK', { duration: 5000 });
        return;
      }

      await this.router.navigateByUrl('/company/profile');
    } catch (err: unknown) {
      const message = this.extractError(err);
      this.snackBar.open(message, 'OK', { duration: 6000 });
    } finally {
      this.submitting.set(false);
    }
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
      return err.message || 'Rejestracja nie powiodła się';
    }
    if (err instanceof Error) {
      return err.message;
    }
    return 'Rejestracja nie powiodła się';
  }
}
