import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { PageShell } from '@baza/ui';
import { HOME_RETURN_CADENCES } from '@baza/shared-types';

@Component({
  imports: [PageShell, RouterModule],
  selector: 'baza-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly brand = 'Baza';
  protected readonly cadences = HOME_RETURN_CADENCES;
}
