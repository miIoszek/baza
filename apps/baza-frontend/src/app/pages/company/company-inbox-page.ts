import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import type { CompanyJobApplicationListItem } from '@baza/shared-types';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'baza-company-inbox-page',
  standalone: true,
  imports: [
    RouterLink,
    DatePipe,
    MatCardModule,
    MatButtonModule,
    MatSnackBarModule,
  ],
  templateUrl: './company-inbox-page.html',
  styleUrl: './company-inbox-page.scss',
})
export class CompanyInboxPage implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly loading = signal(true);
  protected readonly applications = signal<CompanyJobApplicationListItem[]>([]);
  protected readonly downloadingId = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    await this.reload();
  }

  protected async downloadCv(app: CompanyJobApplicationListItem): Promise<void> {
    this.downloadingId.set(app.id);
    try {
      const blob = await firstValueFrom(
        this.http.get(
          `${environment.apiBaseUrl}/api/company/applications/${app.id}/cv`,
          { responseType: 'blob' }
        )
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cv-${app.email.replace(/[^a-zA-Z0-9._-]+/g, '_')}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      this.snackBar.open(this.extractError(err), 'OK', { duration: 6000 });
    } finally {
      this.downloadingId.set(null);
    }
  }

  private async reload(): Promise<void> {
    this.loading.set(true);
    try {
      const list = await firstValueFrom(
        this.http.get<CompanyJobApplicationListItem[]>(
          `${environment.apiBaseUrl}/api/company/applications`
        )
      );
      this.applications.set(list);
    } catch (err: unknown) {
      this.snackBar.open(this.extractError(err), 'OK', { duration: 6000 });
    } finally {
      this.loading.set(false);
    }
  }

  private extractError(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      if (typeof err.error?.message === 'string') {
        return err.error.message;
      }
      if (err.error instanceof Blob) {
        return 'Nie udało się pobrać CV';
      }
    }
    return 'Operacja nie powiodła się';
  }
}
