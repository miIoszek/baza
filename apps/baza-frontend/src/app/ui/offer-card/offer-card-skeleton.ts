import { ChangeDetectionStrategy, Component } from '@angular/core';
import { BazaSkeleton } from '../skeleton/skeleton';

@Component({
  selector: 'baza-offer-card-skeleton',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BazaSkeleton],
  template: `
    <div class="baza-offer-card-skeleton">
      <div class="baza-offer-card-skeleton__company">
        <baza-skeleton shape="box" width="44px" height="44px" radius="12px" />
        <div class="baza-offer-card-skeleton__meta">
          <baza-skeleton width="110px" height="10px" />
          <baza-skeleton width="70px" height="8px" />
        </div>
      </div>
      <baza-skeleton width="80%" height="14px" />
      <baza-skeleton width="60%" height="10px" />
    </div>
  `,
  styles: `
    .baza-offer-card-skeleton {
      background: var(--baza-surface);
      border: 1px solid var(--baza-border);
      border-radius: var(--baza-card-radius);
      padding: 16px;
    }
    .baza-offer-card-skeleton__company {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 14px;
    }
    .baza-offer-card-skeleton__meta {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
  `,
})
export class BazaOfferCardSkeleton {}
