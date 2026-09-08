import { Component, inject, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { AppShell } from '@baza/ui';
import { AuthService } from './core/auth.service';

@Component({
  imports: [AppShell, RouterModule],
  selector: 'baza-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  ngOnInit(): void {
    void this.auth.init();
  }

  protected async onLogout(): Promise<void> {
    await this.auth.signOut();
    await this.router.navigateByUrl('/');
  }
}
