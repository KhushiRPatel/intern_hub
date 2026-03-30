'use client';

import { useMemo, useState, useCallback, useEffect } from 'react';
import type { InternData, DepartmentData } from '@/lib/constants';
import { Modal } from '@/app/components/ui/Modal';
import { Button } from '@/app/components/ui/Button';
import { Select } from '@/app/components/ui/Input';
import {
  INTERN_EXPORT_COLUMNS,
  type InternExportColumnKey,
  buildDepartmentLookup,
  sortInternsForExport,
  buildExportSheetRows,
  defaultSelectedExportKeys,
} from '@/lib/internExportExcel';

interface Props {
  open: boolean;
  onClose: () => void;
  interns: InternData[];
  departments: DepartmentData[];
}

export default function ExportInternsModal({ open, onClose, interns, departments }: Props) {
  const [selected, setSelected] = useState<Set<InternExportColumnKey>>(
    () => new Set(defaultSelectedExportKeys()),
  );
  const [sortKey, setSortKey] = useState<InternExportColumnKey>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (open) {
      setSelected(new Set(defaultSelectedExportKeys()));
      setSortKey('name');
      setSortDir('asc');
    }
  }, [open]);

  const deptLookup = useMemo(() => buildDepartmentLookup(departments), [departments]);

  const toggle = useCallback((key: InternExportColumnKey) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const selectAll = () => setSelected(new Set(INTERN_EXPORT_COLUMNS.map((c) => c.key)));
  const clearAll = () => setSelected(new Set());

  const handleExport = async () => {
    const keys = INTERN_EXPORT_COLUMNS.map((c) => c.key).filter((k) => selected.has(k));
    if (keys.length === 0 || interns.length === 0) return;

    setExporting(true);
    try {
      const sorted = sortInternsForExport(interns, sortKey, sortDir, deptLookup);
      const rows = buildExportSheetRows(sorted, keys, deptLookup);
      const XLSX = await import('xlsx');
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Interns');
      const stamp = new Date().toISOString().slice(0, 16).replace(/[:-]/g, '').replace('T', '-');
      XLSX.writeFile(wb, `interns-export-${stamp}.xlsx`);
      onClose();
    } finally {
      setExporting(false);
    }
  };

  const selectedCount = selected.size;
  const canExport = interns.length > 0 && selectedCount > 0;

  return (
    <Modal open={open} onClose={onClose} title="Export to Excel" size="lg">
      <div className="px-6 py-5 space-y-6 max-h-[min(70vh,32rem)] overflow-y-auto">
        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          Exports the <strong>{interns.length}</strong> intern{interns.length !== 1 ? 's' : ''} currently
          shown (same filters as the table). Choose columns and sort order, then download.
        </p>

        {interns.length === 0 ? (
          <div className="rounded-xl border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-950/20 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
            No rows match the current filters. Adjust filters or add interns first.
          </div>
        ) : null}

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Columns to export
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={selectAll}
                className="text-xs font-medium text-primary-600 dark:text-primary-400 hover:underline"
              >
                Select all
              </button>
              <button
                type="button"
                onClick={clearAll}
                className="text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              >
                Clear all
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 rounded-xl border border-slate-200 dark:border-slate-700 p-3 bg-slate-50/80 dark:bg-slate-900/40">
            {INTERN_EXPORT_COLUMNS.map(({ key, label }) => (
              <label
                key={key}
                className="flex items-center gap-2.5 cursor-pointer text-sm text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
              >
                <input
                  type="checkbox"
                  checked={selected.has(key)}
                  onChange={() => toggle(key)}
                  className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
          {selectedCount === 0 && interns.length > 0 ? (
            <p className="text-xs text-red-600 dark:text-red-400">Select at least one column.</p>
          ) : null}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Sort by column"
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as InternExportColumnKey)}
          >
            {INTERN_EXPORT_COLUMNS.map(({ key, label }) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </Select>
          <Select label="Sort direction" value={sortDir} onChange={(e) => setSortDir(e.target.value as 'asc' | 'desc')}>
            <option value="asc">Ascending (A → Z, oldest → newest)</option>
            <option value="desc">Descending (Z → A, newest → oldest)</option>
          </Select>
        </div>

        <div className="flex gap-3 pt-1">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            className="flex-1"
            loading={exporting}
            disabled={!canExport}
            onClick={handleExport}
          >
            {exporting ? 'Building file…' : 'Download .xlsx'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
