import { provideHttpClient } from '@angular/common/http';
import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { ServiceEventRepository } from '../service-event-repository';
import { HttpServiceEventRepository } from './http-service-event-repository';

export function provideServiceEventApi(): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideHttpClient(),
    { provide: ServiceEventRepository, useClass: HttpServiceEventRepository },
  ]);
}
