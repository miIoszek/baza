import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BazaLogoAvatar } from '../logo-avatar/logo-avatar';
import { BazaTag } from '../tag/tag';
import type { OfferCardVm } from './offer-card.vm';

@Component({
  selector: 'baza-offer-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, BazaLogoAvatar, BazaTag],
  templateUrl: './offer-card.html',
  styleUrl: './offer-card.scss',
})
export class BazaOfferCard {
  readonly offer = input.required<OfferCardVm>();
  readonly variant = input<'full' | 'compact'>('full');
}
