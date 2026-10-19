import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { AssignmentRepository } from '../assignment-repository';
import { HttpAssignmentRepository } from './http-assignment-repository';

export function provideAssignmentApi(): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: AssignmentRepository, useClass: HttpAssignmentRepository },
  ]);
}
