import { Route } from '@angular/router';
import { companyAuthGuard } from './core/guards/company-auth.guard';
import { guestAuthGuard } from './core/guards/guest-auth.guard';
import { HomePage } from './pages/home/home';
import { LoginPage } from './pages/login/login';
import { RegisterPage } from './pages/register/register';
import { CompanyInboxPlaceholder } from './pages/company/company-inbox-placeholder';
import { CompanyProfilePlaceholder } from './pages/company/company-profile-placeholder';
import { CompanyPublicProfilePage } from './pages/companies/company-public-profile';

export const appRoutes: Route[] = [
  { path: '', component: HomePage },
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
    component: CompanyProfilePlaceholder,
    canActivate: [companyAuthGuard],
  },
  {
    path: 'company/inbox',
    component: CompanyInboxPlaceholder,
    canActivate: [companyAuthGuard],
  },
  { path: '**', redirectTo: '' },
];
