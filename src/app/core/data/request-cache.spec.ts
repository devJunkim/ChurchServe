import { Observable, Subject, of, throwError } from 'rxjs';
import { RequestCache } from './request-cache';

describe('RequestCache', () => {
  let now: number;
  let cache: RequestCache<string, string>;

  beforeEach(() => {
    now = 1_000;
    cache = new RequestCache({ maxAgeMs: 100, maxEntries: 2, now: () => now });
  });

  it('shares one in-flight request and retains its result', () => {
    const response = new Subject<string>();
    let loads = 0;
    const load = (): Observable<string> => {
      loads++;
      return response;
    };
    const values: string[] = [];

    cache.getOrLoad('events', load).subscribe((value) => values.push(value));
    cache.getOrLoad('events', load).subscribe((value) => values.push(value));
    expect(loads).toBe(1);

    response.next('page-1');
    response.complete();
    cache.getOrLoad('events', load).subscribe((value) => values.push(value));

    expect(values).toEqual(['page-1', 'page-1', 'page-1']);
    expect(loads).toBe(1);
  });

  it('refreshes expired entries using an injected clock', () => {
    let loads = 0;
    const load = () => of(`value-${++loads}`);

    cache.getOrLoad('events', load).subscribe();
    now += 100;
    cache.getOrLoad('events', load).subscribe();
    now += 1;
    cache.getOrLoad('events', load).subscribe();

    expect(loads).toBe(2);
  });

  it('does not retain failed requests', () => {
    let loads = 0;
    const load = () => {
      loads++;
      return loads === 1 ? throwError(() => new Error('offline')) : of('recovered');
    };

    cache.getOrLoad('events', load).subscribe({ error: () => undefined });
    cache.getOrLoad('events', load).subscribe();

    expect(loads).toBe(2);
    expect(cache.read('events')).toEqual({ hit: true, value: 'recovered' });
  });

  it('evicts the least recently used value when full', () => {
    cache.set('one', '1');
    cache.set('two', '2');
    cache.read('one');
    cache.set('three', '3');

    expect(cache.read('one')).toEqual({ hit: true, value: '1' });
    expect(cache.read('two')).toEqual({ hit: false });
    expect(cache.read('three')).toEqual({ hit: true, value: '3' });
  });

  it('supports forced refresh, invalidation, and clearing', () => {
    let loads = 0;
    const load = () => of(`value-${++loads}`);

    cache.getOrLoad('one', load).subscribe();
    cache.getOrLoad('one', load, true).subscribe();
    expect(loads).toBe(2);

    cache.invalidate('one');
    expect(cache.read('one')).toEqual({ hit: false });
    cache.set('two', '2');
    cache.clear();
    expect(cache.read('two')).toEqual({ hit: false });
  });

  it('does not retain a response that arrives after the cache was cleared', () => {
    const response = new Subject<string>();
    cache.getOrLoad('one', () => response).subscribe();

    cache.clear();
    response.next('old identity');
    response.complete();

    expect(cache.read('one')).toEqual({ hit: false });
  });
});
