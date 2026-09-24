import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type BazaSkeletonShape = 'text' | 'box' | 'circle';

@Component({
  selector: 'baza-skeleton',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '',
  styleUrl: './skeleton.scss',
  host: {
    class: 'baza-skeleton',
    '[class.baza-skeleton--circle]': "shape() === 'circle'",
    '[style.width]': 'width() ?? null',
    '[style.height]': 'height() ?? null',
    '[style.border-radius]': 'radius() ?? null',
    '[attr.aria-hidden]': 'true',
  },
})
export class BazaSkeleton {
  readonly shape = input<BazaSkeletonShape>('text');
  readonly width = input<string | undefined>(undefined);
  readonly height = input<string | undefined>(undefined);
  readonly radius = input<string | undefined>(undefined);
}
