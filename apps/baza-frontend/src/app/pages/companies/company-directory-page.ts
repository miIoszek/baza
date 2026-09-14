import { Component, OnInit, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import type { CompanyDirectoryItem } from '@baza/shared-types';
import { AsyncStatus } from '@baza/ui';
import { environment } from '../../../environments/environment';
import { pickCompanyLogoUrl } from '../job-offers/company-logo-url';

@Component({
  selector: 'baza-company-directory-page',
  standalone: true,
  imports: [MatButtonModule, AsyncStatus],
  templateUrl: './company-directory-page.html',
  styleUrl: './company-directory-page.scss',
})
export class CompanyDirectoryPage implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly companies = signal<CompanyDirectoryItem[]>([]);

  ngOnInit(): void {
    this.load();
  }

  protected retryLoad(): void {
    this.load();
  }

  protected openCompany(id: string): void {
    void this.router.navigate(['/companies', id]);
  }

  protected onCardKeydown(event: KeyboardEvent, id: string): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.openCompany(id);
    }
  }

  protected logoUrl(company: CompanyDirectoryItem): string | null {
    return pickCompanyLogoUrl(company.photoUrls);
  }

  protected hasAddress(company: CompanyDirectoryItem): boolean {
    return company.baseLocation.trim().length > 0;
  }

  private load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.http
      .get<CompanyDirectoryItem[]>(
        `${environment.apiBaseUrl}/api/companies`
      )
      .subscribe({
        next: (list) => {
          this.companies.set(list);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Nie udało się pobrać listy pracodawców');
          this.loading.set(false);
        },
      });
  }
}
