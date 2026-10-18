import { Routes } from '@angular/router';
import { signedInGuard } from '../../core/auth/signed-in.guard';
import { provideVolunteerApi } from './api/provide-volunteer-api';

export const VOLUNTEER_ROUTES: Routes = [
  {
    path: '',
    canActivate: [signedInGuard],
    providers: [provideVolunteerApi()],
    loadComponent: () => import('./volunteers').then((module) => module.Volunteers),
    title: 'Volunteers | ChurchServe',
  },
];
