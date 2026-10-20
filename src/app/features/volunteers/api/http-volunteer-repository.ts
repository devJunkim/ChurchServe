import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { normalizeHttpProblem } from '../../../core/http/app-problem';
import { retryTransientRead } from '../../../core/http/retry-transient-read';
import { Volunteer } from '../../../shared/domain/volunteer';
import { VolunteerRepository } from '../volunteer-repository';
import { parseVolunteerList } from './volunteer-dto';

@Injectable()
export class HttpVolunteerRepository extends VolunteerRepository {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/volunteers';

  search(query: string): Observable<readonly Volunteer[]> {
    const params = new HttpParams().set('query', query);
    return this.http
      .get<unknown>(this.baseUrl, { params })
      .pipe(retryTransientRead(), map(parseVolunteerList), normalizeHttpProblem());
  }
}
