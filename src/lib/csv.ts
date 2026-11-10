// ============================================================
// Clixhora HRMS — CSV export helper
//
// Builds a CSV file from rows and hands it to the browser as a download.
// Used by the attendance report export.
// ============================================================

const escapeCell = (value: unknown): string => {
  const text = value === null || value === undefined ? '' : String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
};

export const toCsv = (header: string[], rows: (string | number | null | undefined)[][]): string =>
  [header, ...rows]
    .map(row => row.map(escapeCell).join(','))
    .join('\r\n');

export const downloadCsv = (filename: string, header: string[], rows: (string | number | null | undefined)[][]): void => {
  const csv = toCsv(header, rows);
  // The BOM keeps Excel happy with UTF-8 content.
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
