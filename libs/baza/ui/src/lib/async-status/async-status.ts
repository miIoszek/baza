import { Component, Input } from '@angular/core';

export type AsyncStatusKind = 'loading' | 'error' | 'empty';

/** Presentational loading / error / empty block for async list surfaces. */
@Component({
  selector: 'baza-async-status',
  standalone: true,
  imports: [],
  templateUrl: './async-status.html',
  styleUrl: './async-status.scss',
  host: {
    class: 'baza-async-status',
    '[class.baza-async-status--loading]': "kind === 'loading'",
    '[class.baza-async-status--error]': "kind === 'error'",
    '[class.baza-async-status--empty]': "kind === 'empty'",
  },
})
export class AsyncStatus {
  @Input({ required: true }) kind!: AsyncStatusKind;
  @Input({ required: true }) message!: string;
}
