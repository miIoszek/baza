import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';

export interface BazaConfirmData {
  title: string;
  message: string;
  /** An extra line under the message (e.g. what else goes with it). */
  detail?: string;
  confirmLabel: string;
  cancelLabel?: string;
  /** Red confirm button for irreversible actions. */
  destructive?: boolean;
}

/**
 * Confirmation for an action that cannot be undone. MatDialog brings the focus trap, Escape and
 * focus return; open it with `dialog.open(BazaConfirmDialog, { data })` and read `afterClosed()`
 * (true = confirmed).
 */
@Component({
  selector: 'baza-confirm-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content>
      <p class="baza-confirm__message">{{ data.message }}</p>
      @if (data.detail) {
        <p class="baza-confirm__detail">{{ data.detail }}</p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <!-- Focus starts on the safe choice -->
      <button mat-stroked-button type="button" [mat-dialog-close]="false" cdkFocusInitial>
        {{ data.cancelLabel ?? 'Anuluj' }}
      </button>
      <button
        mat-flat-button
        type="button"
        [class.baza-danger]="data.destructive"
        [mat-dialog-close]="true"
      >
        {{ data.confirmLabel }}
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .baza-confirm__message,
    .baza-confirm__detail {
      margin: 0;
      font-size: 14.5px;
      line-height: 1.55;
    }

    .baza-confirm__detail {
      margin-top: 8px;
      color: var(--baza-text-secondary);
    }
  `,
})
export class BazaConfirmDialog {
  protected readonly data = inject<BazaConfirmData>(MAT_DIALOG_DATA);
}
