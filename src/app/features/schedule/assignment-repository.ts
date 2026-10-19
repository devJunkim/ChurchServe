import { Observable } from 'rxjs';
import {
  AssignmentBoard,
  AssignVolunteerCommand,
  AssignVolunteerResult,
} from './assignment';

export abstract class AssignmentRepository {
  abstract loadBoard(eventId: string): Observable<AssignmentBoard>;
  abstract assign(command: AssignVolunteerCommand): Observable<AssignVolunteerResult>;
}

export class AssignmentConflictError extends Error {
  constructor(
    message: string,
    readonly board: AssignmentBoard,
  ) {
    super(message);
    this.name = 'AssignmentConflictError';
  }
}
