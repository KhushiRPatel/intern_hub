import type { InternData } from '@/lib/constants';

/** Keys we can export (includes computed `department` name). */
export const INTERN_EXPORT_COLUMNS = [
  { key: 'name', label: 'Full name' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'alternate_phone', label: 'Alternate phone' },
  { key: 'college', label: 'College / institute' },
  { key: 'university', label: 'University' },
  { key: 'college_email', label: 'College email' },
  { key: 'degree', label: 'Degree' },
  { key: 'branch', label: 'Branch / major' },
  { key: 'specialization', label: 'Specialization' },
  { key: 'graduation_year', label: 'Graduation year' },
  { key: 'department', label: 'Department' },
  { key: 'status', label: 'Status' },
  { key: 'start_date', label: 'Start date' },
  { key: 'end_date', label: 'End date' },
  { key: 'id', label: 'Record ID' },
  { key: 'user_id', label: 'Linked user ID' },
  { key: 'created_at', label: 'Created at' },
] as const;

export type InternExportColumnKey = (typeof INTERN_EXPORT_COLUMNS)[number]['key'];

export function buildDepartmentLookup(
  departments: { id: string; name: string }[],
): Record<string, string> {
  return Object.fromEntries(departments.map((d) => [d.id, d.name]));
}

export function formatInternExportCell(
  intern: InternData,
  key: InternExportColumnKey,
  deptLookup: Record<string, string>,
): string {
  if (key === 'department') {
    return intern.department?.name ?? deptLookup[intern.department_id] ?? intern.department_id ?? '';
  }
  const raw = (intern as Record<string, unknown>)[key];
  if (raw === null || raw === undefined) return '';
  if (key === 'created_at' && typeof raw === 'string') {
    try {
      return new Date(raw).toISOString().replace('T', ' ').slice(0, 19);
    } catch {
      return String(raw);
    }
  }
  return String(raw);
}

export function sortInternsForExport(
  interns: InternData[],
  sortKey: InternExportColumnKey,
  direction: 'asc' | 'desc',
  deptLookup: Record<string, string>,
): InternData[] {
  const mult = direction === 'desc' ? -1 : 1;
  return [...interns].sort((a, b) => {
    const sa = formatInternExportCell(a, sortKey, deptLookup);
    const sb = formatInternExportCell(b, sortKey, deptLookup);

    if (sortKey === 'graduation_year') {
      const na = a.graduation_year ?? -1;
      const nb = b.graduation_year ?? -1;
      if (na !== nb) return na < nb ? -mult : mult;
      return 0;
    }
    if (
      sortKey === 'start_date' ||
      sortKey === 'end_date' ||
      sortKey === 'created_at'
    ) {
      const ta = Date.parse(sa) || 0;
      const tb = Date.parse(sb) || 0;
      if (ta !== tb) return ta < tb ? -mult : mult;
      return 0;
    }

    return sa.localeCompare(sb, undefined, { numeric: true, sensitivity: 'base' }) * mult;
  });
}

export function buildExportSheetRows(
  interns: InternData[],
  selectedKeys: InternExportColumnKey[],
  deptLookup: Record<string, string>,
): Record<string, string>[] {
  const labels = Object.fromEntries(
    INTERN_EXPORT_COLUMNS.map((c) => [c.key, c.label]),
  ) as Record<InternExportColumnKey, string>;

  return interns.map((intern) => {
    const row: Record<string, string> = {};
    for (const key of selectedKeys) {
      row[labels[key]] = formatInternExportCell(intern, key, deptLookup);
    }
    return row;
  });
}

export function defaultSelectedExportKeys(): InternExportColumnKey[] {
  return INTERN_EXPORT_COLUMNS.map((c) => c.key);
}
