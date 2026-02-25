'use client';

import { useState, useMemo } from 'react';
import { Search, ChevronUp, ChevronDown, Eye, Pencil, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';

export type Column<T> = {
  key: string;
  label: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
  headerIcon?: React.ReactNode;
};

type DataTableProps<T extends Record<string, unknown>> = {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (row: T) => string;
  searchPlaceholder?: string;
  searchKeys?: (keyof T)[];
  pageSize?: number;
  actions?: (row: T) => { label: string; icon: 'view' | 'edit' | 'delete'; onClick: () => void }[];
  emptyMessage?: string;
};

const iconMap = { view: Eye, edit: Pencil, delete: Trash2 };

export function DataTable<T extends Record<string, unknown>>({
  data,
  columns,
  keyExtractor,
  searchPlaceholder = 'Buscar...',
  searchKeys = [],
  pageSize = 10,
  actions,
  emptyMessage = 'Nenhum registro encontrado.',
}: DataTableProps<T>) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const filtered = useMemo(() => {
    let list = [...data];
    if (search.trim() && searchKeys.length > 0) {
      const s = search.trim().toLowerCase();
      list = list.filter((row) =>
        searchKeys.some((k) => String(row[k] ?? '').toLowerCase().includes(s))
      );
    }
    if (sortKey) {
      list.sort((a, b) => {
        const va = a[sortKey];
        const vb = b[sortKey];
        const cmp = String(va).localeCompare(String(vb), undefined, { numeric: true });
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }
    return list;
  }, [data, search, searchKeys, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = useMemo(
    () => filtered.slice((page - 1) * pageSize, page * pageSize),
    [filtered, page, pageSize]
  );

  const toggleSort = (key: string) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  return (
    <div className="space-y-4">
      {searchKeys.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder={searchPlaceholder}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white text-slate-800 placeholder:text-slate-400"
          />
        </div>
      )}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-slate-600 border-b border-slate-200">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 md:px-6 py-4 font-medium ${col.className ?? ''} ${col.sortable ? 'cursor-pointer select-none hover:bg-slate-100' : ''}`}
                  onClick={() => col.sortable && toggleSort(col.key)}
                >
                  <span className="inline-flex items-center gap-1.5">
                    {col.headerIcon}
                    {col.label}
                    {col.sortable && sortKey === col.key && (sortDir === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
                  </span>
                </th>
              ))}
              {actions && <th className="px-4 md:px-6 py-4 font-medium text-right w-28">Ações</th>}
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (actions ? 1 : 0)} className="px-6 py-12 text-center text-slate-500">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paginated.map((row) => (
                <tr key={keyExtractor(row)} className="border-b border-slate-100 hover:bg-slate-50/50 transition">
                  {columns.map((col) => (
                    <td key={col.key} className={`px-4 md:px-6 py-4 ${col.className ?? ''}`}>
                      {col.render ? col.render(row) : String(row[col.key] ?? '—')}
                    </td>
                  ))}
                  {actions && (
                    <td className="px-4 md:px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {actions(row).map((a, i) => {
                          const Icon = iconMap[a.icon];
                          return (
                            <button
                              key={i}
                              type="button"
                              onClick={a.onClick}
                              title={a.label}
                              className={`p-2 rounded-lg transition ${a.icon === 'delete' ? 'text-red-600 hover:bg-red-50' : 'text-teal-600 hover:bg-teal-50'}`}
                            >
                              <Icon className="w-4 h-4" />
                            </button>
                          );
                        })}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between flex-wrap gap-2">
          <p className="text-sm text-slate-500">
            {filtered.length} registro(s) · Página {page} de {totalPages}
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
