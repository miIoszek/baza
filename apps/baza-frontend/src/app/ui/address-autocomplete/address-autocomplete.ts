import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import {
  LOCALITY_QUERY_MIN_LENGTH,
  LOCALITY_SEARCH_LIMIT,
  type LocalitySuggestion,
} from '@baza/shared-types';
import { Subject, catchError, debounceTime, map, of, switchMap } from 'rxjs';
import { ADDRESS_LOOKUP } from '../../core/address-lookup';

export type BazaAddressStatus = 'idle' | 'searching' | 'results' | 'empty' | 'error';

/**
 * Picks the locality the company base stands in (mat-autocomplete: combobox role,
 * arrow keys, Escape). A pick emits the locality with its coordinates; leaving the
 * field without picking clears it and emits null.
 */
@Component({
  selector: 'baza-address-autocomplete',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatAutocompleteModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './address-autocomplete.html',
  styleUrl: './address-autocomplete.scss',
})
export class BazaAddressAutocomplete {
  private readonly lookup = inject(ADDRESS_LOOKUP);

  readonly value = input<LocalitySuggestion | null>(null);
  readonly valueChange = output<LocalitySuggestion | null>();

  /**
   * Holds the pick only: with requireSelection the trigger does not pass typed text to
   * the control, so the query arrives through `typed` instead.
   */
  protected readonly picked = new FormControl<LocalitySuggestion | null>(null);
  protected readonly status = signal<BazaAddressStatus>('idle');
  protected readonly suggestions = signal<LocalitySuggestion[]>([]);
  protected readonly limit = LOCALITY_SEARCH_LIMIT;
  private readonly typed = new Subject<string>();

  constructor() {
    // The page decides what is picked (e.g. "Anuluj" clears it).
    effect(() => {
      const value = this.value();
      untracked(() => this.picked.setValue(value, { emitEvent: false }));
    });

    // Leaving the field without picking clears it (requireSelection).
    this.picked.valueChanges.pipe(takeUntilDestroyed()).subscribe((value) => {
      if (value === null) {
        this.valueChange.emit(null);
      }
    });

    this.typed
      .pipe(
        map((text) => text.trim()),
        debounceTime(250),
        switchMap((q) => {
          if (q.length < LOCALITY_QUERY_MIN_LENGTH) {
            return of({ status: 'idle' as const, items: [] });
          }
          this.status.set('searching');
          return this.lookup.search(q).pipe(
            map((items) => ({ status: items.length ? ('results' as const) : ('empty' as const), items })),
            catchError(() => of({ status: 'error' as const, items: [] }))
          );
        }),
        takeUntilDestroyed()
      )
      .subscribe(({ status, items }) => {
        this.suggestions.set(items);
        this.status.set(status);
      });
  }

  /** Text the field shows for a picked locality. */
  protected readonly display = (value: LocalitySuggestion | string | null): string =>
    typeof value === 'string' ? value : value ? `${value.name}, ${value.area}` : '';

  protected onInput(event: Event): void {
    this.typed.next((event.target as HTMLInputElement).value);
  }

  protected pick(locality: LocalitySuggestion): void {
    this.status.set('idle');
    this.valueChange.emit(locality);
  }
}
