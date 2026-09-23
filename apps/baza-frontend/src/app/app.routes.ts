import { Route } from '@angular/router';
import { companyAuthGuard } from './core/guards/company-auth.guard';
import { guestAuthGuard } from './core/guards/guest-auth.guard';

// Every page is lazy: drivers (most traffic, phones) never download the auth
// or company panel code, and each screen ships only the Material it uses.
export const appRoutes: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/job-offers/job-offers-page').then((m) => m.JobOffersPage),
  },
  {
    path: 'health',
    loadComponent: () => import('./pages/home/home').then((m) => m.HomePage),
  },
  {
    path: 'job-offers',
    pathMatch: 'full',
    redirectTo: '',
  },
  {
    path: 'job-offers/:id',
    loadComponent: () =>
      import('./pages/job-offers/job-offer-detail-page').then(
        (m) => m.JobOfferDetailPage
      ),
  },
  {
    path: 'companies',
    pathMatch: 'full',
    loadComponent: () =>
      import('./pages/companies/company-directory-page').then(
        (m) => m.CompanyDirectoryPage
      ),
  },
  {
    path: 'companies/:id',
    loadComponent: () =>
      import('./pages/companies/company-public-profile').then(
        (m) => m.CompanyPublicProfilePage
      ),
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login').then((m) => m.LoginPage),
    canActivate: [guestAuthGuard],
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./pages/register/register').then((m) => m.RegisterPage),
    canActivate: [guestAuthGuard],
  },
  {
    path: 'check-email',
    loadComponent: () =>
      import('./pages/check-email/check-email').then((m) => m.CheckEmailPage),
    canActivate: [guestAuthGuard],
  },
  {
    path: 'verify-email',
    loadComponent: () =>
      import('./pages/verify-email/verify-email').then((m) => m.VerifyEmailPage),
  },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./pages/forgot-password/forgot-password').then(
        (m) => m.ForgotPasswordPage
      ),
    canActivate: [guestAuthGuard],
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./pages/reset-password/reset-password').then(
        (m) => m.ResetPasswordPage
      ),
  },
  {
    path: 'company',
    // Checked on every child navigation, like the per-route guards before.
    canActivateChild: [companyAuthGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'profile' },
      {
        path: 'profile',
        loadComponent: () =>
          import('./pages/company/company-profile-page').then(
            (m) => m.CompanyProfilePage
          ),
      },
      {
        path: 'offers',
        loadComponent: () =>
          import('./pages/company/offers/company-offers-list-page').then(
            (m) => m.CompanyOffersListPage
          ),
      },
      {
        path: 'offers/new',
        loadComponent: () =>
          import('./pages/company/offers/company-offer-form-page').then(
            (m) => m.CompanyOfferFormPage
          ),
      },
      {
        path: 'offers/:id/edit',
        loadComponent: () =>
          import('./pages/company/offers/company-offer-form-page').then(
            (m) => m.CompanyOfferFormPage
          ),
      },
      {
        path: 'inbox',
        loadComponent: () =>
          import('./pages/company/company-inbox-page').then(
            (m) => m.CompanyInboxPage
          ),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
