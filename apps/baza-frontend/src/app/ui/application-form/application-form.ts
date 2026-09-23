import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { APPLICATION_FIELD_LIMITS } from '@baza/shared-types';
import { BazaBanner } from '../banner/banner';
import { BazaFileDrop } from '../file-drop/file-drop';
import { trimmedEmailValidator } from '../../core/form-validators';
import { applicationPhoneValidator } from './application-form.validators';

export type BazaApplicationState =
  | 'idle'
  | 'sending'
  | 'sent'
  | 'error-network'
  | 'error-duplicate';

export interface BazaApplicationSubmit {
  email: string;
  phone: string;
  message?: string;
  cv: File;
}

/**
 * Driver application: e-mail, phone, optional message, CV and consent. Knows no
 * HTTP — the page sends `submitted` and reports back through `state`. Entered
 * data stays in the form on errors; `sent` replaces the form.
 */
@Component({
  selector: 'baza-application-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    BazaBanner,
    BazaFileDrop,
  ],
  templateUrl: './application-form.html',
  styleUrl: './application-form.scss',
})
export class BazaApplicationForm {
  readonly state = input<BazaApplicationState>('idle');
  /** Server reason for a rejected send; replaces the generic connection hint. */
  readonly errorMessage = input<string | null>(null);
  readonly submitted = output<BazaApplicationSubmit>();

  protected readonly limits = APPLICATION_FIELD_LIMITS;
  protected readonly cv = signal<File | null>(null);
  protected readonly cvInvalid = signal(false);
  protected readonly submitAttempted = signal(false);

  protected readonly form = new FormBuilder().nonNullable.group({
    email: [
      '',
      [
        Validators.required,
        trimmedEmailValidator(),
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

  protected onCvSelected(file: File): void {
    this.cv.set(file);
    this.cvInvalid.set(false);
  }

  protected onCvRejected(): void {
    this.cv.set(null);
    this.cvInvalid.set(true);
  }

  protected consentError(): boolean {
    const consent = this.form.controls.consentAccepted;
    return consent.invalid && (consent.touched || this.submitAttempted());
  }

  protected submit(): void {
    this.submitAttempted.set(true);
    this.form.markAllAsTouched();
    const cv = this.cv();
    this.cvInvalid.set(!cv);
    if (this.form.invalid || !cv || this.state() === 'sending') {
      return;
    }
    const raw = this.form.getRawValue();
    const message = raw.message.trim();
    this.submitted.emit({
      email: raw.email.trim(),
      phone: raw.phone.trim(),
      ...(message ? { message } : {}),
      cv,
    });
  }
}
