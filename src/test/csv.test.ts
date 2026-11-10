import { describe, it, expect } from 'vitest';
import { toCsv } from '../lib/csv';

describe('csv export', () => {
  it('joins the header and the rows', () => {
    const csv = toCsv(['Employee', 'Status'], [['Arun Kumar', 'present']]);
    expect(csv).toBe('Employee,Status\r\nArun Kumar,present');
  });

  it('quotes cells that contain a comma, a quote or a newline', () => {
    const csv = toCsv(['Name', 'Note'], [['Kumar, Arun', 'He said "hi"'], ['B', 'line1\nline2']]);
    expect(csv).toContain('"Kumar, Arun"');
    expect(csv).toContain('"He said ""hi"""');
    expect(csv).toContain('"line1\nline2"');
  });

  it('writes empty cells for null and undefined', () => {
    const csv = toCsv(['a', 'b'], [[null, undefined]]);
    expect(csv).toBe('a,b\r\n,');
  });
});
