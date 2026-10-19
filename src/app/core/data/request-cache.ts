import { defer, finalize, Observable, of, shareReplay, tap } from 'rxjs';

export interface RequestCacheOptions {
  readonly maxAgeMs: number;
  readonly maxEntries: number;
  readonly now?: () => number;
}

type CacheLookup<T> = { readonly hit: true; readonly value: T } | { readonly hit: false };

interface CacheEntry<T> {
  readonly value: T;
  readonly storedAt: number;
}

export class RequestCache<TKey, TValue> {
  private readonly values = new Map<TKey, CacheEntry<TValue>>();
  private readonly requests = new Map<TKey, Observable<TValue>>();
  private readonly now: () => number;
  private generation = 0;

  constructor(private readonly options: RequestCacheOptions) {
    if (options.maxAgeMs < 0) {
      throw new Error('Request cache maxAgeMs cannot be negative.');
    }

    if (!Number.isInteger(options.maxEntries) || options.maxEntries < 1) {
      throw new Error('Request cache maxEntries must be a positive integer.');
    }

    this.now = options.now ?? Date.now;
  }

  read(key: TKey): CacheLookup<TValue> {
    const entry = this.values.get(key);
    if (!entry) {
      return { hit: false };
    }

    if (this.now() - entry.storedAt > this.options.maxAgeMs) {
      this.values.delete(key);
      return { hit: false };
    }

    // Reinsert fresh hits so Map insertion order acts as a small LRU list.
    this.values.delete(key);
    this.values.set(key, entry);
    return { hit: true, value: entry.value };
  }

  getOrLoad(key: TKey, load: () => Observable<TValue>, forceRefresh = false): Observable<TValue> {
    if (!forceRefresh) {
      const cached = this.read(key);
      if (cached.hit) {
        return of(cached.value);
      }
    } else {
      this.values.delete(key);
    }

    const pending = this.requests.get(key);
    if (pending) {
      return pending;
    }

    const requestGeneration = this.generation;
    let request!: Observable<TValue>;
    request = defer(load).pipe(
      tap((value) => {
        if (this.generation === requestGeneration) {
          this.set(key, value);
        }
      }),
      finalize(() => {
        if (this.requests.get(key) === request) {
          this.requests.delete(key);
        }
      }),
      shareReplay({ bufferSize: 1, refCount: true }),
    );
    this.requests.set(key, request);
    return request;
  }

  set(key: TKey, value: TValue): void {
    this.values.delete(key);
    this.values.set(key, { value, storedAt: this.now() });

    while (this.values.size > this.options.maxEntries) {
      const oldest = this.values.keys().next();
      if (oldest.done) {
        break;
      }
      this.values.delete(oldest.value);
    }
  }

  invalidate(key: TKey): void {
    this.values.delete(key);
  }

  clear(): void {
    this.generation++;
    this.values.clear();
    this.requests.clear();
  }
}
