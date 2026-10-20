import { Routes } from '@angular/router';
import { signedInGuard } from '../../core/auth/signed-in.guard';
import { permissionGuard } from '../../core/auth/permission.guard';
import { PERMISSIONS } from '../../core/auth/current-user';
import { provideVolunteerApi } from './api/provide-volunteer-api';

export const VOLUNTEER_ROUTES: Routes = [
  {
    path: '',
    canActivate: [signedInGuard, permissionGuard],
    data: { permission: PERMISSIONS.volunteerRead },
    providers: [provideVolunteerApi()],
    loadComponent: () => import('./volunteers').then((module) => module.Volunteers),
    title: 'Volunteers | ChurchServe',
  },
];
