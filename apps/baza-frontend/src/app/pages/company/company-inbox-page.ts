import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnInit,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import type { CompanyJobApplicationListItem } from '@baza/shared-types';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { pluralPl } from '../../core/polish-plural';
import { BazaSkeleton, BazaStateBlock } from '../../ui';

const DAY = new Intl.DateTimeFormat('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' });
const TIME = new Intl.DateTimeFormat('pl-PL', { hour: '2-digit', minute: '2-digit' });

/** "17 września 2026, 08:14"; empty for a date that does not parse. */
export function sentAt(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '' : `${DAY.format(date)}, ${TIME.format(date)}`;
}

/**
 * Name the CV is saved under: the driver's own file name when the API kept it,
 * otherwise one made from the e-mail (older applications). Always ends in ".pdf".
 */
export function cvDownloadName(
  app: Pick<CompanyJobApplicationListItem, 'cvFileName' | 'email'>
): string {
  const name = app.cvFileName?.trim() || `cv-${app.email.replace(/[^a-zA-Z0-9._-]+/g, '_')}`;
  return /\.pdf$/i.test(name) ? name : `${name}.pdf`;
}

/** "tel:+48600100200" — a dialable link for "+48 600 100 200". */
export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, '')}`;
}

/** Applications from drivers to the company's offers (canvas "Skrzynka"). */
@Component({
  selector: 'baza-company-inbox-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatProgressSpinnerModule, BazaSkeleton, BazaStateBlock],
  templateUrl: './company-inbox-page.html',
  styleUrl: './company-inbox-page.scss',
})
export class CompanyInboxPage implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly snackBar = inject(MatSnackBar);
  private readonly heading = viewChild.required<ElementRef<HTMLElement>>('heading');

  protected readonly loading = signal(true);
  protected readonly failed = signal(false);
  protected readonly applications = signal<CompanyJobApplicationListItem[]>([]);
  protected readonly downloadingId = signal<string | null>(null);
  protected readonly skeletons = [1, 2, 3];
  protected readonly sentAt = sentAt;
  protected readonly cvDownloadName = cvDownloadName;
  protected readonly telHref = telHref;

  protected readonly counter = computed(() =>
    pluralPl(this.applications().length, 'aplikacja', 'aplikacje', 'aplikacji')
  );

  async ngOnInit(): Promise<void> {
    await this.reload();
  }

  protected async retryLoad(): Promise<void> {
    if (!this.loading()) {
      await this.reload();
      // The retry button is gone by now; keep keyboard focus on the page, not <body>.
      this.heading().nativeElement.focus();
    }
  }

  protected async downloadCv(app: CompanyJobApplicationListItem): Promise<void> {
    // The button stays focusable while busy, so a second press lands here.
    if (this.downloadingId()) {
      return;
    }
    this.downloadingId.set(app.id);
    try {
      const blob = await firstValueFrom(
        this.http.get(`${environment.apiBaseUrl}/api/company/applications/${app.id}/cv`, {
          responseType: 'blob',
        })
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = cvDownloadName(app);
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err: unknown) {
      this.snackBar.open(await cvErrorMessage(err), 'OK', { duration: 6000 });
    } finally {
      this.downloadingId.set(null);
    }
  }

  private async reload(): Promise<void> {
    this.loading.set(true);
    this.failed.set(false);
    try {
      const list = await firstValueFrom(
        this.http.get<CompanyJobApplicationListItem[]>(
          `${environment.apiBaseUrl}/api/company/applications`
        )
      );
      this.applications.set(list);
    } catch {
      this.failed.set(true);
    } finally {
      this.loading.set(false);
    }
  }
}

/** Snackbar text for a failed CV download. A blob request gets its error body as a Blob. */
async function cvErrorMessage(err: unknown): Promise<string> {
  const fallback = 'Nie udało się pobrać CV. Spróbuj ponownie.';
  // Only 4xx bodies carry a message meant for people ("Internal server error" is not).
  if (!(err instanceof HttpErrorResponse) || err.status < 400 || err.status >= 500) {
    return fallback;
  }
  if (err.error instanceof Blob) {
    try {
      const parsed = JSON.parse(await err.error.text()) as { message?: unknown };
      if (typeof parsed?.message === 'string' && parsed.message.trim()) {
        return parsed.message;
      }
    } catch {
      // Not JSON: fall back to the generic text.
    }
  }
  return fallback;
}
