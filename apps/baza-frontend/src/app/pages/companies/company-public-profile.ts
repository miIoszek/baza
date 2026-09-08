import { Component, inject, OnInit, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import type { CompanyPublicProfile } from '@baza/shared-types';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'baza-company-public-profile',
  standalone: true,
  imports: [MatCardModule],
  templateUrl: './company-public-profile.html',
  styleUrl: './company-public-profile.scss',
})
export class CompanyPublicProfilePage implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);

  protected readonly loading = signal(true);
  protected readonly notFound = signal(false);
  protected readonly profile = signal<CompanyPublicProfile | null>(null);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.loading.set(false);
      this.notFound.set(true);
      return;
    }

    this.http
      .get<CompanyPublicProfile>(
        `${environment.apiBaseUrl}/api/companies/${id}`
      )
      .subscribe({
        next: (res) => {
          this.profile.set(res);
          this.loading.set(false);
        },
        error: (err: unknown) => {
          this.loading.set(false);
          if (err instanceof HttpErrorResponse) {
            if (err.status === 404 || err.status === 400) {
              this.notFound.set(true);
              return;
            }
          }
          this.notFound.set(true);
        },
      });
  }

  protected logoUrl(profile: CompanyPublicProfile): string | null {
    const urls = profile.photoUrls;
    if (!urls) {
      return null;
    }
    return (
      urls['s192'] ??
      urls['s512'] ??
      urls['s96'] ??
      urls['original'] ??
      null
    );
  }
}
