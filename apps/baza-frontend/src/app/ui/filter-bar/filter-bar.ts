import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
} from '@angular/core';
import { MatBottomSheet, MatBottomSheetModule } from '@angular/material/bottom-sheet';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import {
  COUNTRIES,
  DRIVER_LICENSES,
  HOME_RETURN_CADENCES,
  TRANSPORT_TYPES,
} from '@baza/shared-types';
import { BazaFiltersSheet } from './filters-sheet';
import {
  cadenceChipLabel,
  countriesChipLabel,
  hasOfferFilters,
  licenceChipLabel,
  offerCountLabel,
  transportChipLabel,
  type OfferFiltersVm,
} from './filter-bar.vm';

@Component({
  selector: 'baza-filter-bar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatBottomSheetModule,
    MatButtonModule,
    MatCheckboxModule,
    MatChipsModule,
    MatIconModule,
    MatMenuModule,
  ],
  templateUrl: './filter-bar.html',
  styleUrl: './filter-bar.scss',
})
export class BazaFilterBar {
  private readonly sheet = inject(MatBottomSheet);

  readonly value = input.required<OfferFiltersVm>();
  readonly resultCount = input(0);
  readonly view = input<'list' | 'map'>('list');
  readonly mobile = input(false);
  readonly cadenceLabels = input.required<Record<string, string>>();

  readonly valueChange = output<OfferFiltersVm>();
  readonly clear = output<void>();
  readonly useLocation = output<void>();
  readonly viewChange = output<'list' | 'map'>();

  protected readonly countries = COUNTRIES;
  protected readonly cadences = HOME_RETURN_CADENCES;
  protected readonly licenses = DRIVER_LICENSES;
  protected readonly transportTypes = TRANSPORT_TYPES;

  protected readonly countLabel = computed(() =>
    offerCountLabel(this.resultCount())
  );
  protected readonly countriesLabel = computed(() =>
    countriesChipLabel(this.value().routeCountries)
  );
  protected readonly cadenceLabel = computed(() =>
    cadenceChipLabel(this.value().cadence, this.cadenceLabels())
  );
  protected readonly licenceLabel = computed(() =>
    licenceChipLabel(this.value().licence)
  );
  protected readonly transportLabel = computed(() =>
    transportChipLabel(this.value().transport)
  );
  protected readonly hasFilters = computed(() => hasOfferFilters(this.value()));

  protected emit(patch: Partial<OfferFiltersVm>): void {
    this.valueChange.emit({ ...this.value(), ...patch });
  }

  protected toggleCountry(code: string): void {
    const current = this.value().routeCountries;
    const next = current.includes(code)
      ? current.filter((c) => c !== code)
      : [...current, code];
    this.emit({ routeCountries: next });
  }

  protected isCountrySelected(code: string): boolean {
    return this.value().routeCountries.includes(code);
  }

  protected clearCountries(event?: Event): void {
    event?.stopPropagation();
    this.emit({ routeCountries: [] });
  }

  protected clearCadence(event?: Event): void {
    event?.stopPropagation();
    this.emit({ cadence: null });
  }

  protected clearLicence(event?: Event): void {
    event?.stopPropagation();
    this.emit({ licence: null });
  }

  protected clearTransport(event?: Event): void {
    event?.stopPropagation();
    this.emit({ transport: null });
  }

  protected openSheet(): void {
    this.sheet
      .open(BazaFiltersSheet, {
        data: {
          value: this.value(),
          cadenceLabels: this.cadenceLabels(),
        },
      })
      .afterDismissed()
      .subscribe((next) => {
        if (next) {
          this.valueChange.emit(next);
        }
      });
  }
}
