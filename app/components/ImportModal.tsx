'use client';
import { useRef, useState, useCallback } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { demoStore } from '@/lib/demoStore';
import { DEMO_DEPARTMENTS, DepartmentData } from '@/lib/constants';

const IS_DEMO = process.env.NEXT_PUBLIC_DEMO_MODE !== 'false';

type RowResult = {
  row: number;
  status: 'success' | 'error' | 'skipped';
  name: string;
  email: string;
  message?: string;
  resetLink?: string;
  emailSent?: boolean;
};

interface Props {
  open: boolean;
  onClose: () => void;
  departments: DepartmentData[];
  onImportDone: () => void;
}

/* ── Status badge ───────────────────────────────────────────────── */
function RowStatusBadge({ status }: { status: RowResult['status'] }) {
  const map = {
    success: { label: 'Added', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
    error: { label: 'Error', cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
    skipped: { label: 'Skipped', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  };
  const { label, cls } = map[status];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${cls}`}>
      {label}
    </span>
  );
}

export default function ImportModal({ open, onClose, departments, onImportDone }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<RowResult[] | null>(null);
  const [summary, setSummary] = useState<{ success: number; error: number; skipped: number } | null>(null);
  const [globalError, setGlobalError] = useState('');

  const reset = () => {
    setFile(null);
    setResults(null);
    setSummary(null);
    setGlobalError('');
    setImporting(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleClose = () => { reset(); onClose(); };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f && (f.name.endsWith('.xlsx') || f.name.endsWith('.xls'))) setFile(f);
    else setGlobalError('Please upload an .xlsx or .xls file');
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) { setFile(f); setGlobalError(''); }
  };

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    setGlobalError('');
    setResults(null);

    try {
      if (IS_DEMO) {
        await importDemo(file);
      } else {
        await importProduction(file);
      }
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : 'Import failed');
      setImporting(false);
    }
  };

  const importDemo = async (f: File) => {
    // Parse client-side using xlsx (dynamic import to avoid SSR issues)
    const XLSX = await import('xlsx');
    const buffer = await f.arrayBuffer();
    const wb = XLSX.read(buffer, { type: 'array', cellDates: false });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });

    if (rawRows.length === 0) throw new Error('The file is empty or has no data rows');

    // Filter out instruction rows
    const dataRows = rawRows.filter((row) => {
      const first = String(Object.values(row)[0] ?? '').trim();
      return first !== '' && !first.startsWith('ℹ') && !first.startsWith('•') && !first.startsWith('---');
    });

    const depts = IS_DEMO ? DEMO_DEPARTMENTS : departments;
    const rowResults: RowResult[] = [];

    for (let i = 0; i < dataRows.length; i++) {
      const raw = dataRows[i];
      const rowNum = i + 2;

      const norm = (k: string) => k.toLowerCase().replace(/[\s_-]+/g, '_');
      const row: Record<string, string> = {};
      for (const [k, v] of Object.entries(raw)) row[norm(k)] = String(v).trim();

      const name = row['name'] || '';
      const email = (row['email'] || '').toLowerCase();
      const phone = row['phone'] || '';
      const college = row['college'] || '';
      const deptName = row['department'] || row['department_name'] || '';
      const startDate = String(raw['Start Date'] ?? raw['start_date'] ?? raw['start date'] ?? '').trim();
      const endDate = String(raw['End Date'] ?? raw['end_date'] ?? raw['end date'] ?? '').trim() || undefined;
      const statusRaw = (row['status'] || 'active').toLowerCase();
      const status = (['active', 'completed', 'terminated'].includes(statusRaw) ? statusRaw : 'active') as 'active' | 'completed' | 'terminated';

      if (!name || !email || !college) {
        rowResults.push({ row: rowNum, status: 'error', name, email, message: 'Missing required fields' });
        continue;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        rowResults.push({ row: rowNum, status: 'error', name, email, message: 'Invalid email' });
        continue;
      }

      const dept = depts.find((d) => d.name.toLowerCase() === deptName.toLowerCase());
      if (!dept) {
        rowResults.push({ row: rowNum, status: 'error', name, email, message: `Unknown department: "${deptName}"` });
        continue;
      }

      if (!startDate) {
        rowResults.push({ row: rowNum, status: 'error', name, email, message: 'Missing Start Date' });
        continue;
      }

      demoStore.create({
        name, email, phone: phone || undefined, college,
        department_id: dept.id,
        start_date: startDate,
        end_date: endDate || undefined,
        status,
      });

      // Send real email via server endpoint (no Hasura needed)
      let emailSent = false;
      let resetLink = '';
      try {
        const emailRes = await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email }),
        });
        const emailData = await emailRes.json();
        emailSent = emailData.sent === true;
        resetLink = emailData.resetLink || '';
      } catch {
        // email failure doesn't block import
      }

      rowResults.push({
        row: rowNum, status: 'success', name, email,
        resetLink,
        emailSent,
        message: emailSent ? undefined : 'Intern added — email could not be sent',
      });
    }

    const successCount = rowResults.filter(r => r.status === 'success').length;
    const errorCount = rowResults.filter(r => r.status === 'error').length;
    const skippedCount = rowResults.filter(r => r.status === 'skipped').length;

    setResults(rowResults);
    setSummary({ success: successCount, error: errorCount, skipped: skippedCount });
    setImporting(false);
    if (successCount > 0) onImportDone();
  };

  const importProduction = async (f: File) => {
    const formData = new FormData();
    formData.append('file', f);
    formData.append('departments', JSON.stringify(departments));

    const res = await fetch('/api/interns/import', { method: 'POST', body: formData });
    const data = await res.json();

    if (!res.ok) throw new Error(data.message || 'Import failed');

    setResults(data.results);
    setSummary({ success: data.successCount, error: data.errorCount, skipped: data.skippedCount });
    setImporting(false);
    if (data.successCount > 0) onImportDone();
  };

  return (
    <Modal open={open} onClose={handleClose} title="Import Interns from Excel" size="lg">
      <div className="px-6 pb-6 space-y-5">

        {/* Step 1: Download Template */}
        <div className="flex items-center justify-between p-4 bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/30 rounded-xl">
          <div>
            <p className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">Step 1 — Download Template</p>
            <p className="text-xs text-indigo-500 dark:text-indigo-400 mt-0.5">
              Use the official template to ensure correct column format
            </p>
          </div>
          <a
            href="/api/interns/template"
            download="intern_import_template.xlsx"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors shrink-0"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download Template
          </a>
        </div>

        {/* Step 2: Upload File */}
        {!results && (
          <>
            <div>
              <p className="text-sm font-semibold text-slate-700 dark:text-[#c4b5fd] mb-2">Step 2 — Upload Your File</p>
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                className={[
                  'relative flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-200',
                  dragging
                    ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/10 scale-[1.01]'
                    : file
                    ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/10'
                    : 'border-slate-200 dark:border-[#2d2a45] hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10',
                ].join(' ')}
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={handleFileChange}
                />

                {file ? (
                  <>
                    <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                      <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">{file.name}</p>
                      <p className="text-xs text-slate-400 dark:text-[#6d6a8a] mt-0.5">
                        {(file.size / 1024).toFixed(1)} KB · Click to change
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-[#2d2a45] flex items-center justify-center">
                      <svg className="w-6 h-6 text-slate-400 dark:text-[#6d6a8a]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-semibold text-slate-600 dark:text-[#8b88ac]">
                        Drag & drop your Excel file here
                      </p>
                      <p className="text-xs text-slate-400 dark:text-[#6d6a8a] mt-0.5">or click to browse · .xlsx, .xls</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {globalError && (
              <div className="flex items-center gap-2 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/40 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl text-sm">
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                {globalError}
              </div>
            )}


            <div className="flex gap-3 pt-1">
              <Button variant="outline" onClick={handleClose} className="flex-1">Cancel</Button>
              <Button
                onClick={handleImport}
                loading={importing}
                disabled={!file}
                className="flex-1"
                leftIcon={
                  !importing ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                  ) : undefined
                }
              >
                {importing ? 'Importing…' : 'Start Import'}
              </Button>
            </div>
          </>
        )}

        {/* Results */}
        {results && summary && (
          <>
            {/* Summary */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Added', count: summary.success, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800/40' },
                { label: 'Errors', count: summary.error, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800/40' },
                { label: 'Skipped', count: summary.skipped, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800/40' },
              ].map(({ label, count, color, bg }) => (
                <div key={label} className={`border rounded-xl p-3 text-center ${bg}`}>
                  <p className={`text-2xl font-black ${color}`}>{count}</p>
                  <p className="text-xs font-semibold text-slate-500 dark:text-[#8b88ac] mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            {/* Row-level results */}
            <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-100 dark:border-[#2d2a45]">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 dark:bg-[#2d2a45] sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-slate-500 dark:text-[#8b88ac]">Row</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-500 dark:text-[#8b88ac]">Name</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-500 dark:text-[#8b88ac]">Email</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-500 dark:text-[#8b88ac]">Status</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-500 dark:text-[#8b88ac]">Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#2d2a45]">
                  {results.map((r) => (
                    <tr key={`${r.row}-${r.email}`} className="bg-white dark:bg-[#1e1c2f]">
                      <td className="px-3 py-2 text-slate-400 dark:text-[#6d6a8a] tabular-nums">{r.row}</td>
                      <td className="px-3 py-2 font-medium text-slate-700 dark:text-[#e8e5ff] max-w-[100px] truncate">{r.name || '—'}</td>
                      <td className="px-3 py-2 text-slate-500 dark:text-[#8b88ac] max-w-[140px] truncate">{r.email || '—'}</td>
                      <td className="px-3 py-2"><RowStatusBadge status={r.status} /></td>
                      <td className="px-3 py-2 text-slate-400 dark:text-[#6d6a8a] max-w-[160px]">
                        {r.status === 'success' ? (
                          r.emailSent
                            ? <span className="text-emerald-600 dark:text-emerald-400">✓ Email sent</span>
                            : <a href={r.resetLink} target="_blank" rel="noreferrer" className="text-indigo-500 hover:underline truncate block" title={r.resetLink}>Copy reset link ↗</a>
                        ) : (
                          <span className="text-red-400 dark:text-red-400" title={r.message}>{r.message}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex gap-3 pt-1">
              <Button variant="outline" onClick={reset} className="flex-1">Import More</Button>
              <Button onClick={handleClose} className="flex-1">Done</Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
