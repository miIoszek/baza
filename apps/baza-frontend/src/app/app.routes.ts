import { Route } from '@angular/router';
import { companyAuthGuard } from './core/guards/company-auth.guard';
import { guestAuthGuard } from './core/guards/guest-auth.guard';
import { HomePage } from './pages/home/home';
import { LoginPage } from './pages/login/login';
import { RegisterPage } from './pages/register/register';
import { CompanyInboxPlaceholder } from './pages/company/company-inbox-placeholder';
import { CompanyProfilePage } from './pages/company/company-profile-page';
import { CompanyPublicProfilePage } from './pages/companies/company-public-profile';
import { CompanyOffersListPage } from './pages/company/offers/company-offers-list-page';
import { CompanyOfferFormPage } from './pages/company/offers/company-offer-form-page';

export const appRoutes: Route[] = [
  { path: '', component: HomePage },
  {
    path: 'job-offers',
    loadComponent: () =>
      import('./pages/job-offers/job-offers-page').then((m) => m.JobOffersPage),
  },
  {
    path: 'job-offers/:id',
    loadComponent: () =>
      import('./pages/job-offers/job-offer-detail-page').then(
        (m) => m.JobOfferDetailPage
      ),
  },
  {
    path: 'companies/:id',
    component: CompanyPublicProfilePage,
  },
  {
    path: 'login',
    component: LoginPage,
    canActivate: [guestAuthGuard],
  },
  {
    path: 'register',
    component: RegisterPage,
    canActivate: [guestAuthGuard],
  },
  {
    path: 'company',
    pathMatch: 'full',
    redirectTo: 'company/profile',
  },
  {
    path: 'company/profile',
    component: CompanyProfilePage,
    canActivate: [companyAuthGuard],
  },
  {
    path: 'company/offers',
    component: CompanyOffersListPage,
    canActivate: [companyAuthGuard],
  },
  {
    path: 'company/offers/new',
    component: CompanyOfferFormPage,
    canActivate: [companyAuthGuard],
  },
  {
    path: 'company/offers/:id/edit',
    component: CompanyOfferFormPage,
    canActivate: [companyAuthGuard],
  },
  {
    path: 'company/inbox',
    component: CompanyInboxPlaceholder,
    canActivate: [companyAuthGuard],
  },
  { path: '**', redirectTo: '' },
];
