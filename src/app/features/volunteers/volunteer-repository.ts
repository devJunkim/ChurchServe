import { Observable } from 'rxjs';
import { Volunteer } from '../../shared/domain/volunteer';

export abstract class VolunteerRepository {
  abstract search(query: string): Observable<readonly Volunteer[]>;
}
