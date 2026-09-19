import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type BazaLogoSize = 32 | 48 | 64 | 96;

@Component({
  selector: 'baza-logo-avatar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './logo-avatar.html',
  styleUrl: './logo-avatar.scss',
})
export class BazaLogoAvatar {
  readonly name = input.required<string>();
  readonly logoUrl = input<string | null | undefined>(undefined);
  readonly size = input<BazaLogoSize>(48);

  protected readonly initial = computed(() => {
    const n = this.name().trim();
    return n ? n.charAt(0).toUpperCase() : '?';
  });
}
