import { Injectable } from '@angular/core';

export abstract class KeyValueStorage {
  abstract get(key: string): string | null;
  abstract set(key: string, value: string): void;
  abstract remove(key: string): void;
}

@Injectable()
export class BrowserKeyValueStorage extends KeyValueStorage {
  get(key: string): string | null {
    return localStorage.getItem(key);
  }

  set(key: string, value: string): void {
    localStorage.setItem(key, value);
  }

  remove(key: string): void {
    localStorage.removeItem(key);
  }
}
