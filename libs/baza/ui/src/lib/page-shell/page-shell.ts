import { Component, Input } from '@angular/core';

/** Lightweight page shell for Baza screens — grow this into the design system. */
@Component({
  selector: 'baza-page-shell',
  standalone: true,
  imports: [],
  templateUrl: './page-shell.html',
  styleUrl: './page-shell.scss',
})
export class PageShell {
  @Input() title = '';
  @Input() subtitle = '';
}
