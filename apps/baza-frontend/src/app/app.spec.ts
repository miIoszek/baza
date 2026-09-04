import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { App } from './app';
import { HomePage } from './pages/home/home';
import { appRoutes } from './app.routes';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(appRoutes)],
    }).compileComponents();
  });

  it('should render AppShell brand Baza', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.baza-app-shell__brand')?.textContent).toContain(
      'Baza'
    );
    expect(compiled.querySelector('a[routerlink="/login"], a[href="/login"]')).toBeTruthy();
  });
});

describe('HomePage', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomePage],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
  });

  it('should show health ok from API', async () => {
    const fixture = TestBed.createComponent(HomePage);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();

    const req = http.expectOne('/api/health');
    expect(req.request.method).toBe('GET');
    req.flush({
      status: 'ok',
      service: 'baza-api',
      timestamp: '2026-09-04T00:00:00.000Z',
    });

    await fixture.whenStable();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('baza-api');
    http.verify();
  });
});
