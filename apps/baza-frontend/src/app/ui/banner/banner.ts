import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type BazaBannerVariant = 'error' | 'warn' | 'success' | 'info';

/**
 * Inline message above a form or list: what went wrong or what happened, in place, instead of a
 * snackbar that disappears. Errors and warnings are announced (role="alert").
 */
@Component({
  selector: 'baza-banner',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './banner.html',
  styleUrl: './banner.scss',
  host: {
    class: 'baza-banner',
    '[class.baza-banner--error]': "variant() === 'error'",
    '[class.baza-banner--warn]': "variant() === 'warn'",
    '[class.baza-banner--success]': "variant() === 'success'",
    '[attr.role]': "variant() === 'error' || variant() === 'warn' ? 'alert' : 'status'",
  },
})
export class BazaBanner {
  readonly variant = input<BazaBannerVariant>('error');
  readonly title = input<string | null>(null);
}
