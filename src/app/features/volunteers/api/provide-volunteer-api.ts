import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { VolunteerRepository } from '../volunteer-repository';
import { HttpVolunteerRepository } from './http-volunteer-repository';

export function provideVolunteerApi(): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: VolunteerRepository, useClass: HttpVolunteerRepository },
  ]);
}
