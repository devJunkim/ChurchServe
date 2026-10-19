import { ServiceEvent } from '../service-event';
import { Page } from '../page';

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
    version: value.version,
  };
}

export function parseServiceEventPage(value: unknown): Page<ServiceEvent> {
  if (
    !isRecord(value) ||
    !Array.isArray(value['items']) ||
    !isPositiveInteger(value['page']) ||
    !isPositiveInteger(value['pageSize']) ||
    !isNonNegativeInteger(value['totalItems'])
  ) {
    throw new Error('The service-event page response did not match the expected contract.');
  }

  return {
    items: value['items'].map(parseServiceEvent),
    page: value['page'],
    pageSize: value['pageSize'],
    totalItems: value['totalItems'],
  };
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

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function isPositiveInteger(value: unknown): value is number {
  return isNonNegativeInteger(value) && value > 0;
}
