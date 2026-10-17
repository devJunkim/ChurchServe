import { Provider } from '@angular/core';
import { ServiceEventRepository } from '../service-event-repository';
import { BrowserKeyValueStorage, KeyValueStorage } from './key-value-storage';
import { LocalStorageServiceEventRepository } from './local-storage-service-event-repository';

export function provideLocalPersistence(): Provider[] {
  return [
    { provide: KeyValueStorage, useClass: BrowserKeyValueStorage },
    { provide: ServiceEventRepository, useClass: LocalStorageServiceEventRepository },
  ];
}
