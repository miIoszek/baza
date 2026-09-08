import { Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'baza-company-inbox-placeholder',
  standalone: true,
  imports: [MatCardModule],
  template: `
    <section class="company-placeholder">
      <mat-card appearance="outlined">
        <mat-card-header>
          <mat-card-title>Skrzynka aplikacji</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <p>Aplikacje kierowców — wkrótce.</p>
        </mat-card-content>
      </mat-card>
    </section>
  `,
  styles: `
    .company-placeholder {
      max-width: 40rem;
      margin: 2rem auto;
      padding: 0 1rem;
    }
  `,
})
export class CompanyInboxPlaceholder {}
