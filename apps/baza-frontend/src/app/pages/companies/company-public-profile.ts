import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import type { CompanyPublicProfile, GeoPoint, JobOffer } from '@baza/shared-types';
import {
  BazaLogoAvatar,
  BazaOfferCard,
  OfferRouteMapComponent,
  BazaStateBlock,
  toOfferCardVm,
} from '../../ui';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'baza-company-public-profile',
  standalone: true,
  imports: [
    MatButtonModule,
    RouterLink,
    BazaLogoAvatar,
    BazaOfferCard,
    OfferRouteMapComponent,
    BazaStateBlock,
  ],
  templateUrl: './company-public-profile.html',
  styleUrl: './company-public-profile.scss',
})
export class CompanyPublicProfilePage implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);

  protected readonly loading = signal(true);
  protected readonly notFound = signal(false);
  protected readonly profile = signal<CompanyPublicProfile | null>(null);
  protected readonly offers = signal<JobOffer[]>([]);
  protected readonly offersLoading = signal(false);
  protected readonly offersError = signal<string | null>(null);
  protected readonly offerCards = computed(() =>
    this.offers().map((o) => toOfferCardVm(o))
  );
  private companyId: string | null = null;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.loading.set(false);
      this.notFound.set(true);
      return;
    }
    this.companyId = id;

    this.http
      .get<CompanyPublicProfile>(
        `${environment.apiBaseUrl}/api/companies/${id}`
      )
      .subscribe({
        next: (res) => {
          this.profile.set(res);
          this.loading.set(false);
          this.loadOffers(id);
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

  protected retryOffers(): void {
    if (this.companyId) {
      this.loadOffers(this.companyId);
    }
  }

  /** The base pin, or null while the company has not placed one. */
  protected basePin(profile: CompanyPublicProfile): GeoPoint | null {
    return profile.baseLat !== null && profile.baseLng !== null
      ? { lat: profile.baseLat, lng: profile.baseLng }
      : null;
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

  private loadOffers(companyId: string): void {
    this.offersLoading.set(true);
    this.offersError.set(null);
    this.http
      .get<JobOffer[]>(
        `${environment.apiBaseUrl}/api/companies/${companyId}/offers`
      )
      .subscribe({
        next: (list) => {
          this.offers.set(list);
          this.offersLoading.set(false);
        },
        error: () => {
          this.offers.set([]);
          this.offersLoading.set(false);
          this.offersError.set('Nie udało się pobrać ofert. Spróbuj ponownie.');
        },
      });
  }
}
