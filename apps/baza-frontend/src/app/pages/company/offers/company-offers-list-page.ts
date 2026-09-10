import { Component, OnInit, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import type { JobOffer } from '@baza/shared-types';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'baza-company-offers-list-page',
  standalone: true,
  imports: [RouterLink, MatCardModule, MatButtonModule, MatSnackBarModule],
  templateUrl: './company-offers-list-page.html',
  styleUrl: './company-offers-list-page.scss',
})
export class CompanyOffersListPage implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly loading = signal(true);
  protected readonly offers = signal<JobOffer[]>([]);

  async ngOnInit(): Promise<void> {
    await this.reload();
  }

  protected async unpublish(id: string): Promise<void> {
    try {
      await firstValueFrom(
        this.http.patch(
          `${environment.apiBaseUrl}/api/company/offers/${id}/unpublish`,
          {}
        )
      );
      this.snackBar.open('Oferta wycofana', 'OK', { duration: 4000 });
      await this.reload();
    } catch (err: unknown) {
      this.snackBar.open(this.extractError(err), 'OK', { duration: 6000 });
    }
  }

  private async reload(): Promise<void> {
    this.loading.set(true);
    try {
      const list = await firstValueFrom(
        this.http.get<JobOffer[]>(
          `${environment.apiBaseUrl}/api/company/offers`
        )
      );
      this.offers.set(list);
    } catch (err: unknown) {
      this.snackBar.open(this.extractError(err), 'OK', { duration: 6000 });
    } finally {
      this.loading.set(false);
    }
  }

  private extractError(err: unknown): string {
    if (err instanceof HttpErrorResponse && typeof err.error?.message === 'string') {
      return err.error.message;
    }
    return 'Operacja nie powiodła się';
  }
}
