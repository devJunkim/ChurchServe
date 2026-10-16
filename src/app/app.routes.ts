import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./features/home/home').then((module) => module.Home),
    title: 'ChurchServe | Ministry scheduling',
  },
  {
    path: 'schedule',
    loadComponent: () => import('./features/schedule/schedule').then((module) => module.Schedule),
    title: 'Schedule | ChurchServe',
  },
  {
    path: 'volunteers',
    loadComponent: () =>
      import('./features/volunteers/volunteers').then((module) => module.Volunteers),
    title: 'Volunteers | ChurchServe',
  },
  { path: '**', redirectTo: '' },
];
