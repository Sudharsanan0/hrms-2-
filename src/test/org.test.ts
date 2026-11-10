import { describe, it, expect } from 'vitest';
import {
  DEPARTMENTS,
  DESIGNATIONS,
  departmentName,
  departmentSlug,
  departmentOptions,
  designationOptions,
} from '../lib/org';
import { ServiceError } from '../lib/errors';

describe('org catalogue', () => {
  it('maps a slug to the display name and back', () => {
    expect(departmentName('marketing')).toBe('Marketing Team');
    expect(departmentSlug('Marketing Team')).toBe('marketing');
    expect(departmentSlug('Marketing Team'.toLowerCase())).toBe('marketing');
  });

  it('keeps the five Clixhora departments', () => {
    expect(DEPARTMENTS.map(d => d.slug)).toEqual([
      'marketing', 'production', 'software', 'telecalling', 'sales',
    ]);
    expect(departmentOptions()).toHaveLength(5);
  });

  it('returns the designations of a department', () => {
    expect(designationOptions('marketing')).toContainEqual({
      value: 'Google Ads Specialist',
      label: 'Google Ads Specialist',
    });
    expect(designationOptions('unknown-department')).toEqual([]);
    expect(Object.keys(DESIGNATIONS)).toHaveLength(5);
  });
});

describe('ServiceError', () => {
  it('keeps the kind and the original cause', () => {
    const cause = new Error('boom');
    const error = new ServiceError('permission', 'Not allowed.', cause);
    expect(error.kind).toBe('permission');
    expect(error.message).toBe('Not allowed.');
    expect(error.cause).toBe(cause);
    expect(error).toBeInstanceOf(Error);
  });
});
