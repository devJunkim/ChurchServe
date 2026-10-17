import { Routes } from '@angular/router';

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
    loadComponent: () => import('./features/schedule/schedule').then((module) => module.Schedule),
    title: 'Schedule | ChurchServe',
  },
  {
    path: 'schedule/new',
    loadComponent: () =>
      import('./features/schedule/service-event-create/service-event-create').then(
        (module) => module.ServiceEventCreate,
      ),
    title: 'Create service | ChurchServe',
  },
  {
    path: 'schedule/:eventId',
    loadComponent: () =>
      import('./features/schedule/service-event-detail/service-event-detail').then(
        (module) => module.ServiceEventDetail,
      ),
    title: 'Service details | ChurchServe',
  },
  {
    path: 'volunteers',
    loadComponent: () =>
      import('./features/volunteers/volunteers').then((module) => module.Volunteers),
    title: 'Volunteers | ChurchServe',
  },
  {
    path: 'not-found',
    loadComponent: () => import('./features/not-found/not-found').then((module) => module.NotFound),
    title: 'Page not found | ChurchServe',
  },
  { path: '**', redirectTo: 'not-found' },
];
