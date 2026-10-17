import { ServiceEvent } from '../service-event';

export interface ServiceEventDto {
  readonly id: string;
  readonly title: string;
  readonly startsAt: string;
  readonly endsAt: string;
  readonly location: string;
  readonly requiredPositions: number;
  readonly assignedPositions: number;
  readonly version: number;
}

export function parseServiceEvent(value: unknown): ServiceEvent {
  if (!isServiceEventDto(value)) {
    throw new Error('The service-event response did not match the expected contract.');
  }

  return {
    id: value.id,
    title: value.title,
    startsAt: value.startsAt,
    endsAt: value.endsAt,
    location: value.location,
    requiredPositions: value.requiredPositions,
    assignedPositions: value.assignedPositions,
  };
}

export function parseServiceEventList(value: unknown): readonly ServiceEvent[] {
  if (!Array.isArray(value)) {
    throw new Error('The service-event list response was not an array.');
  }

  return value.map(parseServiceEvent);
}

function isServiceEventDto(value: unknown): value is ServiceEventDto {
  return (
    isRecord(value) &&
    hasNonEmptyString(value, 'id') &&
    hasNonEmptyString(value, 'title') &&
    hasIsoDateString(value, 'startsAt') &&
    hasIsoDateString(value, 'endsAt') &&
    hasNonEmptyString(value, 'location') &&
    isNonNegativeInteger(value['requiredPositions']) &&
    isNonNegativeInteger(value['assignedPositions']) &&
    isNonNegativeInteger(value['version'])
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasNonEmptyString(value: Record<string, unknown>, key: string): boolean {
  return typeof value[key] === 'string' && value[key].trim().length > 0;
}

function hasIsoDateString(value: Record<string, unknown>, key: string): boolean {
  const candidate = value[key];
  return (
    typeof candidate === 'string' &&
    /^\d{4}-\d{2}-\d{2}T/.test(candidate) &&
    !Number.isNaN(Date.parse(candidate))
  );
}

function isNonNegativeInteger(value: unknown): boolean {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}
