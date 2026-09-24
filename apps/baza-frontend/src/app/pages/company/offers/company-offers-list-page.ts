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
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import type { JobOffer } from '@baza/shared-types';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { pluralPl } from '../../../core/polish-plural';
import {
  BazaConfirmDialog,
  BazaSkeleton,
  BazaStateBlock,
  BazaTag,
  type BazaConfirmData,
} from '../../../ui';

const DATE = new Intl.DateTimeFormat('pl-PL', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

/** Company's own offers (canvas "MojeOferty"): status, edit, withdraw, delete. */
@Component({
  selector: 'baza-company-offers-list-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatButtonModule, BazaSkeleton, BazaStateBlock, BazaTag],
  templateUrl: './company-offers-list-page.html',
  styleUrl: './company-offers-list-page.scss',
})
export class CompanyOffersListPage implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);
  private readonly heading = viewChild.required<ElementRef<HTMLElement>>('heading');

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly offers = signal<JobOffer[]>([]);
  protected readonly busyId = signal<string | null>(null);
  protected readonly skeletons = [1, 2, 3];

  protected readonly counter = computed(() => {
    const all = this.offers();
    const published = all.filter((o) => o.published).length;
    return all.length
      ? `${pluralPl(all.length, 'oferta', 'oferty', 'ofert')} · ${pluralPl(published, 'opublikowana', 'opublikowane', 'opublikowanych')}`
      : '0 ofert';
  });

  async ngOnInit(): Promise<void> {
    await this.reload();
  }

  protected addedOn(offer: JobOffer): string {
    const date = new Date(offer.publishedAt);
    return Number.isNaN(date.getTime()) ? '' : `Dodana ${DATE.format(date)}`;
  }

  protected async retryLoad(): Promise<void> {
    if (!this.loading()) {
      await this.reload();
      // The retry button is gone by now; keep keyboard focus on the page, not <body>.
      this.heading().nativeElement.focus();
    }
  }

  protected async unpublish(offer: JobOffer): Promise<void> {
    this.busyId.set(offer.id);
    try {
      await firstValueFrom(
        this.http.patch(`${environment.apiBaseUrl}/api/company/offers/${offer.id}/unpublish`, {})
      );
      this.snackBar.open('Oferta wycofana — kierowcy już jej nie widzą', 'OK', { duration: 4000 });
      await this.reload();
    } catch (err: unknown) {
      this.snackBar.open(this.extractError(err), 'OK', { duration: 6000 });
    } finally {
      this.busyId.set(null);
    }
  }

  protected async confirmDelete(offer: JobOffer): Promise<void> {
    const data: BazaConfirmData = {
      title: 'Usunąć ofertę?',
      message: `„${offer.title}” zniknie z Bazy i przestanie być widoczna dla kierowców. Tej operacji nie można cofnąć.`,
      // The database removes an offer's applications with it; say so before it happens.
      detail: 'Razem z nią znikną aplikacje kierowców i ich CV.',
      confirmLabel: 'Usuń ofertę',
      destructive: true,
    };
    const confirmed = await firstValueFrom(
      this.dialog.open(BazaConfirmDialog, { data, width: '460px', maxWidth: 'calc(100vw - 32px)' }).afterClosed()
    );
    if (confirmed !== true) {
      return;
    }
    this.busyId.set(offer.id);
    try {
      await firstValueFrom(
        this.http.delete(`${environment.apiBaseUrl}/api/company/offers/${offer.id}`)
      );
      this.snackBar.open('Oferta usunięta', 'OK', { duration: 4000 });
      await this.reload();
    } catch (err: unknown) {
      this.snackBar.open(this.extractError(err), 'OK', { duration: 6000 });
    } finally {
      this.busyId.set(null);
    }
  }

  private async reload(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const list = await firstValueFrom(
        this.http.get<JobOffer[]>(`${environment.apiBaseUrl}/api/company/offers`)
      );
      this.offers.set(list);
    } catch (err: unknown) {
      this.error.set(this.extractError(err, 'Nie udało się pobrać ofert'));
    } finally {
      this.loading.set(false);
    }
  }

  private extractError(err: unknown, fallback = 'Operacja nie powiodła się'): string {
    if (!(err instanceof HttpErrorResponse) || err.status === 0) {
      return fallback;
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
    if (msg && !/failed to fetch|networkerror|load failed/i.test(msg)) {
      return msg;
    }
    return fallback;
  }
}
