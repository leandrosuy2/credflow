/**
 * Gera e faz download de arquivo CSV (compatível com Excel ao usar sep=; e BOM).
 */
function escapeCsvCell(value: unknown): string {
  if (value == null) return '';
  const s = String(value);
  if (/[",;\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export type CsvColumn<T> = {
  key: string;
  label: string;
  getValue?: (row: T) => unknown;
};

export function exportToCsv<T>(
  data: T[],
  columns: CsvColumn<T>[],
  filename: string,
  options?: { excel?: boolean }
): void {
  const sep = options?.excel ? ';' : ',';
  const BOM = options?.excel ? '\uFEFF' : '';
  const header = columns.map((c) => escapeCsvCell(c.label)).join(sep);
  const rows = data.map((row) =>
    columns
      .map((col) => {
        const raw = col.getValue ? col.getValue(row) : (row as Record<string, unknown>)[col.key];
        return escapeCsvCell(raw);
      })
      .join(sep)
  );
  const csv = BOM + header + '\n' + rows.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
