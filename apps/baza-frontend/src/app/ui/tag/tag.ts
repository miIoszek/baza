import {
  ChangeDetectionStrategy,
  Component,
  input,
} from '@angular/core';

export type BazaTagVariant =
  | 'route'
  | 'cadence'
  | 'neutral'
  | 'published'
  | 'draft';

export type BazaTagIcon = 'home' | 'arrow';

@Component({
  selector: 'baza-tag',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tag.html',
  styleUrl: './tag.scss',
  host: {
    class: 'baza-tag',
    '[class.baza-tag--route]': "variant() === 'route'",
    '[class.baza-tag--cadence]': "variant() === 'cadence'",
    '[class.baza-tag--neutral]': "variant() === 'neutral'",
    '[class.baza-tag--published]': "variant() === 'published'",
    '[class.baza-tag--draft]': "variant() === 'draft'",
  },
})
export class BazaTag {
  readonly variant = input<BazaTagVariant>('neutral');
  readonly icon = input<BazaTagIcon | null>(null);
}
