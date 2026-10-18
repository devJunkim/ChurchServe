import { Volunteer } from '../../../shared/domain/volunteer';

interface VolunteerDto {
  readonly id: string;
  readonly displayName: string;
  readonly eligibleMinistries: readonly string[];
}

export function parseVolunteerList(value: unknown): readonly Volunteer[] {
  if (!Array.isArray(value)) {
    throw new Error('The volunteer response was not an array.');
  }

  return value.map(parseVolunteer);
}

function parseVolunteer(value: unknown): Volunteer {
  if (!isVolunteerDto(value)) {
    throw new Error('The API returned an invalid volunteer.');
  }

  return {
    id: value.id,
    displayName: value.displayName,
    eligibleMinistries: [...value.eligibleMinistries],
  };
}

function isVolunteerDto(value: unknown): value is VolunteerDto {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate['id'] === 'string' &&
    candidate['id'].length > 0 &&
    typeof candidate['displayName'] === 'string' &&
    candidate['displayName'].length > 0 &&
    Array.isArray(candidate['eligibleMinistries']) &&
    candidate['eligibleMinistries'].every(
      (ministry: unknown) => typeof ministry === 'string' && ministry.length > 0,
    )
  );
}
