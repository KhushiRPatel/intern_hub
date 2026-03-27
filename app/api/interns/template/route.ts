import { NextResponse } from 'next/server';
import * as xlsx from 'xlsx';

export async function GET() {
  const headers = ['Name', 'Email', 'Phone', 'College', 'Department', 'Start Date', 'End Date', 'Status'];

  const examples = [
    ['Alice Johnson', 'alice@example.com', '+91 9876543210', 'IIT Mumbai', 'AI', '2025-01-15', '2025-07-15', 'active'],
    ['Bob Kumar', 'bob@college.edu', '', 'NIT Delhi', 'PHP', '2025-02-01', '', 'active'],
    ['Carol Sharma', 'carol@university.ac.in', '+91 8765432109', 'BITS Pilani', '.NET', '2025-03-01', '2025-08-31', 'active'],
  ];

  const notes = [
    [],
    ['ℹ️ INSTRUCTIONS:'],
    ['• Required columns: Name, Email, College, Department, Start Date'],
    ['• Optional columns: Phone, End Date, Status'],
    ['• Valid Departments: .NET, SAP, AI, MOBILE, ODDO, RPA, PHP, QC'],
    ['• Valid Statuses: active, completed, terminated (default: active)'],
    ['• Date format: YYYY-MM-DD  (e.g., 2025-01-15)'],
    ['• Do NOT delete or rename the header row'],
    ['• Delete these example rows before importing'],
  ];

  const ws = xlsx.utils.aoa_to_sheet([headers, ...examples, ...notes]);

  ws['!cols'] = [
    { wch: 22 }, { wch: 30 }, { wch: 18 }, { wch: 25 },
    { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 12 },
  ];

  const wb = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(wb, ws, 'Interns');

  const buf: Buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
  const arrayBuffer = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);

  return new NextResponse(arrayBuffer as ArrayBuffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="intern_import_template.xlsx"',
    },
  });
}
