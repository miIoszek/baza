import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';

export type BazaStateVariant = 'loading' | 'empty' | 'error';
export type BazaStateIcon = 'search' | 'inbox' | 'offers' | 'alert' | 'pin';

@Component({
  selector: 'baza-state-block',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule],
  templateUrl: './state-block.html',
  styleUrl: './state-block.scss',
})
export class BazaStateBlock {
  readonly variant = input<BazaStateVariant>('empty');
  readonly title = input<string | undefined>(undefined);
  readonly message = input<string | undefined>(undefined);
  readonly actionLabel = input<string | undefined>(undefined);
  readonly icon = input<BazaStateIcon | undefined>(undefined);
  readonly action = output<void>();
}
