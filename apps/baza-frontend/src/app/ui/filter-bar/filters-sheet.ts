import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_BOTTOM_SHEET_DATA,
  MatBottomSheetRef,
} from '@angular/material/bottom-sheet';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import {
  COUNTRIES,
  DRIVER_LICENSES,
  HOME_RETURN_CADENCES,
  TRANSPORT_TYPES,
} from '@baza/shared-types';
import type { OfferFiltersVm } from './filter-bar.vm';

export type FiltersSheetData = {
  value: OfferFiltersVm;
  cadenceLabels: Record<string, string>;
};

@Component({
  selector: 'baza-filters-sheet',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, MatButtonModule, MatFormFieldModule, MatSelectModule],
  template: `
    <div class="baza-filters-sheet">
      <h2 class="baza-filters-sheet__title">Filtry</h2>
      <mat-form-field appearance="fill">
        <mat-label>Kraje trasy</mat-label>
        <mat-select [(ngModel)]="draft.routeCountries" multiple>
          @for (c of countries; track c.code) {
            <mat-option [value]="c.code">{{ c.namePl }} ({{ c.code }})</mat-option>
          }
        </mat-select>
      </mat-form-field>
      <mat-form-field appearance="fill">
        <mat-label>Powrót do domu</mat-label>
        <mat-select [(ngModel)]="draft.cadence">
          <mat-option [value]="null">Dowolna</mat-option>
          @for (c of cadences; track c) {
            <mat-option [value]="c">{{ data.cadenceLabels[c] }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
      <mat-form-field appearance="fill">
        <mat-label>Prawo jazdy</mat-label>
        <mat-select [(ngModel)]="draft.licence">
          <mat-option [value]="null">Dowolna</mat-option>
          @for (l of licenses; track l.code) {
            <mat-option [value]="l.code">{{ l.label }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
      <mat-form-field appearance="fill">
        <mat-label>Typ transportu</mat-label>
        <mat-select [(ngModel)]="draft.transport">
          <mat-option [value]="null">Dowolny</mat-option>
          @for (t of transportTypes; track t.code) {
            <mat-option [value]="t.code">{{ t.namePl }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
      <div class="baza-filters-sheet__actions">
        <button mat-button type="button" (click)="sheet.dismiss()">Anuluj</button>
        <button mat-flat-button color="primary" type="button" (click)="apply()">
          Zastosuj
        </button>
      </div>
    </div>
  `,
  styles: `
    .baza-filters-sheet {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      padding: 1.25rem 1.25rem 1.5rem;
    }
    .baza-filters-sheet__title {
      margin: 0 0 0.5rem;
      font-size: 1.125rem;
      font-weight: 700;
    }
    .baza-filters-sheet__actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
      margin-top: 0.5rem;
    }
  `,
})
export class BazaFiltersSheet {
  protected readonly sheet = inject(MatBottomSheetRef<BazaFiltersSheet, OfferFiltersVm>);
  protected readonly data = inject<FiltersSheetData>(MAT_BOTTOM_SHEET_DATA);
  protected readonly countries = COUNTRIES;
  protected readonly cadences = HOME_RETURN_CADENCES;
  protected readonly licenses = DRIVER_LICENSES;
  protected readonly transportTypes = TRANSPORT_TYPES;
  protected readonly draft: OfferFiltersVm = {
    routeCountries: [...this.data.value.routeCountries],
    cadence: this.data.value.cadence,
    licence: this.data.value.licence,
    transport: this.data.value.transport,
  };

  protected apply(): void {
    this.sheet.dismiss({ ...this.draft });
  }
}
