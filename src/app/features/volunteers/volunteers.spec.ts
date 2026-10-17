import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Observable, of, Subject, throwError } from 'rxjs';
import { Volunteer } from './volunteer';
import { VolunteerRepository } from './volunteer-repository';
import { Volunteers } from './volunteers';

class VolunteerRepositoryStub extends VolunteerRepository {
  readonly search = vi.fn<(query: string) => Observable<readonly Volunteer[]>>(() => of([]));
}

describe('Volunteers', () => {
  let fixture: ComponentFixture<Volunteers>;
  let repository: VolunteerRepositoryStub;
  let input: HTMLInputElement;

  beforeEach(() => {
    vi.useFakeTimers();
    repository = new VolunteerRepositoryStub();
    TestBed.configureTestingModule({
      imports: [Volunteers],
      providers: [{ provide: VolunteerRepository, useValue: repository }],
    });
    fixture = TestBed.createComponent(Volunteers);
    fixture.detectChanges();
    input = fixture.nativeElement.querySelector('input');
  });

  afterEach(() => vi.useRealTimers());

  it('waits for two normalized characters and the debounce period', async () => {
    enterQuery('  a  ');
    await vi.advanceTimersByTimeAsync(300);
    expect(repository.search).not.toHaveBeenCalled();

    enterQuery('  anna   brooks  ');
    await vi.advanceTimersByTimeAsync(249);
    expect(repository.search).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);

    expect(repository.search).toHaveBeenCalledOnce();
    expect(repository.search).toHaveBeenCalledWith('anna brooks');
  });

  it('cancels stale results when a newer query arrives', async () => {
    const first = new Subject<readonly Volunteer[]>();
    const second = new Subject<readonly Volunteer[]>();
    repository.search.mockReturnValueOnce(first).mockReturnValueOnce(second);

    enterQuery('ann');
    await vi.advanceTimersByTimeAsync(250);
    enterQuery('anna');
    expect(first.observed).toBe(false);
    await vi.advanceTimersByTimeAsync(250);

    first.next([{ id: 'ann', displayName: 'Ann', eligibleMinistries: [] }]);
    second.next([{ id: 'anna', displayName: 'Anna', eligibleMinistries: ['welcome'] }]);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Anna');
    expect(fixture.nativeElement.textContent).not.toContain('AnnEligible');
  });

  it('shows an error and retries the current query', async () => {
    repository.search
      .mockReturnValueOnce(throwError(() => new Error('offline')))
      .mockReturnValueOnce(
        of([{ id: 'anna', displayName: 'Anna Brooks', eligibleMinistries: ['welcome'] }]),
      );

    enterQuery('anna');
    await vi.advanceTimersByTimeAsync(250);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain(
      'search is unavailable',
    );

    (fixture.nativeElement.querySelector('button') as HTMLButtonElement).click();
    await vi.advanceTimersByTimeAsync(250);
    fixture.detectChanges();

    expect(repository.search).toHaveBeenCalledTimes(2);
    expect(fixture.nativeElement.textContent).toContain('Anna Brooks');
  });

  function enterQuery(value: string): void {
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }
});
