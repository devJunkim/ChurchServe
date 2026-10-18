import { Routes } from '@angular/router';
import { signedInGuard } from '../../core/auth/signed-in.guard';
import { unsavedChangesGuard } from '../../core/routing/unsaved-changes.guard';
import { provideServiceEventApi } from './api/provide-service-event-api';
import { serviceEventResolver } from './service-event-detail/service-event.resolver';
import { ScheduleStore } from './schedule-store';

export const SCHEDULE_ROUTES: Routes = [
  {
    path: '',
    canActivate: [signedInGuard],
    providers: [provideServiceEventApi(), ScheduleStore],
    children: [
      {
        path: '',
        loadComponent: () => import('./schedule').then((module) => module.Schedule),
        title: 'Schedule | ChurchServe',
      },
      {
        path: 'new',
        canDeactivate: [unsavedChangesGuard],
        loadComponent: () =>
          import('./service-event-create/service-event-create').then(
            (module) => module.ServiceEventCreate,
          ),
        title: 'Create service | ChurchServe',
      },
      {
        path: ':eventId',
        resolve: { serviceEvent: serviceEventResolver },
        loadComponent: () =>
          import('./service-event-detail/service-event-detail').then(
            (module) => module.ServiceEventDetail,
          ),
        title: 'Service details | ChurchServe',
      },
    ],
  },
];
