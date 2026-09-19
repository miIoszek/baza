import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'baza-split-list-map',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="baza-split">
      <div class="baza-split__list">
        <ng-content select="[bazaList]" />
      </div>
      <div class="baza-split__map">
        <ng-content select="[bazaMap]" />
      </div>
    </div>
  `,
  styleUrl: './split-list-map.scss',
})
export class BazaSplitListMap {}
