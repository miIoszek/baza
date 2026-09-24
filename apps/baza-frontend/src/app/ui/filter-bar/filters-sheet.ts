import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_BOTTOM_SHEET_DATA,
  MatBottomSheetRef,
} from '@angular/material/bottom-sheet';
import { MatIconModule } from '@angular/material/icon';
import type { CountryOption } from '@baza/shared-types';
import { BazaFilterBar } from './filter-bar';
import type { OfferFiltersVm } from './filter-bar.vm';

export type FiltersSheetData = {
  value: OfferFiltersVm;
  resultCount: number;
  cadenceLabels: Record<string, string>;
  countries: readonly CountryOption[];
};

export type FiltersSheetDismiss = OfferFiltersVm | 'use-location';

@Component({
  selector: 'baza-filters-sheet',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatIconModule, BazaFilterBar],
  template: `
    <div class="baza-filters-sheet">
      <div class="baza-filters-sheet__header">
        <h2 class="baza-filters-sheet__title">Filtry</h2>
        <button
          mat-icon-button
          type="button"
          aria-label="Zamknij"
          (click)="sheet.dismiss()"
        >
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <div class="baza-filters-sheet__body">
        <baza-filter-bar
          [value]="draft"
          [resultCount]="data.resultCount"
          [cadenceLabels]="data.cadenceLabels"
          [countries]="data.countries"
          (valueChange)="onDraftChange($event)"
          (clear)="clearDraft()"
          (useLocation)="useLocation()"
        />
      </div>

      <div class="baza-filters-sheet__actions">
        <button mat-stroked-button type="button" (click)="sheet.dismiss()">
          Anuluj
        </button>
        <button mat-flat-button color="primary" type="button" (click)="apply()">
          Pokaż wyniki
        </button>
      </div>
    </div>
  `,
  styles: `
    .baza-filters-sheet {
      display: flex;
      flex-direction: column;
      gap: 0;
      max-height: min(88dvh, 720px);
    }

    .baza-filters-sheet__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 8px 8px 0 20px;
    }

    .baza-filters-sheet__title {
      margin: 0;
      font: var(--mat-sys-title-medium);
      font-weight: 700;
    }

    .baza-filters-sheet__body {
      flex: 1 1 auto;
      min-height: 0;
      overflow-y: auto;
      padding: 8px 20px 12px;
    }

    .baza-filters-sheet__actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      padding: 12px 20px calc(16px + env(safe-area-inset-bottom, 0px));
      border-top: 1px solid var(--baza-border);
      background: var(--baza-surface);
    }
  `,
})
export class BazaFiltersSheet {
  protected readonly sheet = inject(
    MatBottomSheetRef<BazaFiltersSheet, FiltersSheetDismiss>
  );
  protected readonly data = inject<FiltersSheetData>(MAT_BOTTOM_SHEET_DATA);
  private readonly cdr = inject(ChangeDetectorRef);

  protected draft: OfferFiltersVm = {
    routeCountries: [...this.data.value.routeCountries],
    cadences: [...this.data.value.cadences],
    licences: [...this.data.value.licences],
    transports: [...this.data.value.transports],
    employmentForms: [...this.data.value.employmentForms],
  };

  protected onDraftChange(value: OfferFiltersVm): void {
    this.draft = value;
    this.cdr.markForCheck();
  }

  protected clearDraft(): void {
    this.draft = {
      routeCountries: [],
      cadences: [],
      licences: [],
      transports: [],
      employmentForms: [],
    };
    this.cdr.markForCheck();
  }

  protected useLocation(): void {
    this.sheet.dismiss('use-location');
  }

  protected apply(): void {
    this.sheet.dismiss({ ...this.draft });
  }
}
