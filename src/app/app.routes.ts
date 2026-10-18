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
    loadChildren: () =>
      import('./features/schedule/schedule.routes').then((module) => module.SCHEDULE_ROUTES),
  },
  {
    path: 'volunteers',
    loadChildren: () =>
      import('./features/volunteers/volunteers.routes').then((module) => module.VOLUNTEER_ROUTES),
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
