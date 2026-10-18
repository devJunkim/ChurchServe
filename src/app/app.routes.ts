import { Routes } from '@angular/router';
import { signedInGuard } from './core/auth/signed-in.guard';
import { unsavedChangesGuard } from './core/routing/unsaved-changes.guard';
import { serviceEventResolver } from './features/schedule/service-event-detail/service-event.resolver';
import { ScheduleStore } from './features/schedule/schedule-store';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./features/home/home').then((module) => module.Home),
    title: 'ChurchServe | Ministry scheduling',
  },
  {
    path: 'sign-in',
    loadComponent: () => import('./features/sign-in/sign-in').then((module) => module.SignIn),
    title: 'Sign in | ChurchServe',
  },
  {
    path: 'schedule',
    canActivate: [signedInGuard],
    providers: [ScheduleStore],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/schedule/schedule').then((module) => module.Schedule),
        title: 'Schedule | ChurchServe',
      },
      {
        path: 'new',
        canDeactivate: [unsavedChangesGuard],
        loadComponent: () =>
          import('./features/schedule/service-event-create/service-event-create').then(
            (module) => module.ServiceEventCreate,
          ),
        title: 'Create service | ChurchServe',
      },
      {
        path: ':eventId',
        resolve: { serviceEvent: serviceEventResolver },
        loadComponent: () =>
          import('./features/schedule/service-event-detail/service-event-detail').then(
            (module) => module.ServiceEventDetail,
          ),
        title: 'Service details | ChurchServe',
      },
    ],
  },
  {
    path: 'volunteers',
    canActivate: [signedInGuard],
    loadComponent: () =>
      import('./features/volunteers/volunteers').then((module) => module.Volunteers),
    title: 'Volunteers | ChurchServe',
  },
  {
    path: 'unavailable',
    loadComponent: () =>
      import('./features/navigation-unavailable/navigation-unavailable').then(
        (module) => module.NavigationUnavailable,
      ),
    title: 'Page unavailable | ChurchServe',
  },
  {
    path: 'not-found',
    loadComponent: () => import('./features/not-found/not-found').then((module) => module.NotFound),
    title: 'Page not found | ChurchServe',
  },
  { path: '**', redirectTo: 'not-found' },
];
