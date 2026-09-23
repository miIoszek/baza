import { HttpClient } from '@angular/common/http';
import { InjectionToken, inject } from '@angular/core';
import type { LocalitySuggestion } from '@baza/shared-types';
import type { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

/** Where base-address suggestions come from; components never know which provider it is. */
export interface AddressLookup {
  search(query: string): Observable<LocalitySuggestion[]>;
}

/** Default: Polish localities from the PRNG register, served by the API. */
export const ADDRESS_LOOKUP = new InjectionToken<AddressLookup>('ADDRESS_LOOKUP', {
  providedIn: 'root',
  factory: () => {
    const http = inject(HttpClient);
    return {
      search: (query) =>
        http.get<LocalitySuggestion[]>(`${environment.apiBaseUrl}/api/geo/localities`, {
          params: { q: query },
        }),
    };
  },
});
