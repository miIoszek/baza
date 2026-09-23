import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import {
  DRIVER_LICENSES,
  EMPLOYMENT_FORMS,
  HOME_RETURN_CADENCES,
  TRANSPORT_TYPES,
  type CountryOption,
} from '@baza/shared-types';
import {
  hasOfferFilters,
  offerCountLabel,
  visibleCountryChips,
  type OfferFiltersVm,
} from './filter-bar.vm';

@Component({
  selector: 'baza-filter-bar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatChipsModule],
  templateUrl: './filter-bar.html',
  styleUrl: './filter-bar.scss',
})
export class BazaFilterBar {
  readonly value = input.required<OfferFiltersVm>();
  readonly resultCount = input(0);
  readonly cadenceLabels = input.required<Record<string, string>>();
  readonly countries = input<readonly CountryOption[]>([]);

  readonly valueChange = output<OfferFiltersVm>();
  readonly clear = output<void>();
  readonly useLocation = output<void>();

  protected readonly cadences = HOME_RETURN_CADENCES;
  protected readonly licenses = DRIVER_LICENSES;
  protected readonly transportTypes = TRANSPORT_TYPES;
  protected readonly employmentFormOptions = EMPLOYMENT_FORMS;

  protected readonly countLabel = computed(() =>
    offerCountLabel(this.resultCount())
  );
  protected readonly hasFilters = computed(() => hasOfferFilters(this.value()));
  protected readonly countriesExpanded = signal(false);
  private readonly countryChipState = computed(() =>
    visibleCountryChips(
      this.countries(),
      this.value().routeCountries,
      this.countriesExpanded()
    )
  );
  protected readonly visibleCountries = computed(
    () => this.countryChipState().visible
  );
  protected readonly hiddenCountryCount = computed(
    () => this.countryChipState().hiddenCount
  );
  protected readonly canCollapseCountries = computed(
    () => this.countries().length > 5 && this.countriesExpanded()
  );

  protected expandCountries(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.countriesExpanded.set(true);
  }

  protected collapseCountries(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.countriesExpanded.set(false);
  }

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

  protected toggleCadence(cadence: string): void {
    const current = this.value().cadences;
    const next = current.includes(cadence)
      ? current.filter((c) => c !== cadence)
      : [...current, cadence];
    this.emit({ cadences: next });
  }

  protected isCadenceSelected(cadence: string): boolean {
    return this.value().cadences.includes(cadence);
  }

  protected toggleLicence(licence: string): void {
    const current = this.value().licences;
    const next = current.includes(licence)
      ? current.filter((l) => l !== licence)
      : [...current, licence];
    this.emit({ licences: next });
  }

  protected isLicenceSelected(licence: string): boolean {
    return this.value().licences.includes(licence);
  }

  protected toggleTransport(transport: string): void {
    const current = this.value().transports;
    const next = current.includes(transport)
      ? current.filter((t) => t !== transport)
      : [...current, transport];
    this.emit({ transports: next });
  }

  protected isTransportSelected(transport: string): boolean {
    return this.value().transports.includes(transport);
  }

  protected toggleEmployment(code: string): void {
    const current = this.value().employmentForms;
    const next = current.includes(code)
      ? current.filter((c) => c !== code)
      : [...current, code];
    this.emit({ employmentForms: next });
  }

  protected isEmploymentSelected(code: string): boolean {
    return this.value().employmentForms.includes(code);
  }
}
