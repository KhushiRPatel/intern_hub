import { NextResponse } from 'next/server';
import * as xlsx from 'xlsx';

export async function GET() {
  // ── All columns (required + optional) ────────────────────────────────────
  const headers = [
    // Required
    'Name', 'Email', 'Phone', 'College', 'Degree', 'Branch', 'Department', 'Start Date',
    // Personal (optional)
    'Alternate Phone', 'Date of Birth', 'Gender', 'Blood Group', 'Nationality',
    'Address Line 1', 'Address Line 2', 'City', 'State', 'Pincode', 'Country',
    // Academic (optional)
    'University', 'Specialization', 'Graduation Year', 'Current Year',
    'CGPA', 'Percentage', 'Student ID', 'College Email', 'College City', 'College State',
    // Internship (optional)
    'End Date', 'Status', 'Work Mode', 'Stipend', 'Duration Months',
    'Offer Letter Date', 'Joining Letter Date',
    // Skills (optional — comma-separated)
    'Skills', 'Languages Known', 'Tools',
    // Social (optional)
    'LinkedIn URL', 'GitHub URL', 'Portfolio URL',
    // Documents (optional)
    'Aadhar Number', 'PAN Number',
    // Reference (optional)
    'Reference Name', 'Reference Contact',
    // Notes (optional)
    'Notes',
  ];

  const example1 = [
    'Alice Johnson', 'alice@example.com', '+91 9876543210', 'IIT Mumbai', 'B.Tech', 'Computer Science', 'AI', '2025-01-15',
    '+91 9876543211', '2002-05-10', 'Female', 'B+', 'Indian',
    '101 Main Street', 'Near Park', 'Mumbai', 'Maharashtra', '400001', 'India',
    'University of Mumbai', 'Machine Learning', '2025', '3',
    '8.5', '', 'STU001', 'alice@iit.ac.in', 'Mumbai', 'Maharashtra',
    '2025-07-15', 'active', 'onsite', '10000', '6',
    '2025-01-10', '2025-01-15',
    'Python, TensorFlow, SQL', 'English, Hindi', 'VS Code, Jupyter',
    'https://linkedin.com/in/alice', 'https://github.com/alice', '',
    '', '',
    'Prof. Sharma', '+91 9000000001',
    'Good candidate',
  ];

  const example2 = [
    'Bob Kumar', 'bob@college.edu', '+91 8888888888', 'NIT Delhi', 'MCA', 'Information Technology', 'PHP', '2025-02-01',
    '', '2001-11-20', 'Male', 'O+', 'Indian',
    '', '', 'Delhi', 'Delhi', '110001', 'India',
    'NIT Delhi', '', '2026', '2',
    '', '75', 'STU002', '', 'Delhi', 'Delhi',
    '', 'active', 'hybrid', '8000', '',
    '', '',
    'PHP, Laravel, MySQL', 'English, Hindi, Punjabi', 'PhpStorm',
    '', 'https://github.com/bobkumar', '',
    '', '',
    '', '',
    '',
  ];

  const notes = [
    [],
    ['ℹ️ INSTRUCTIONS:'],
    ['• REQUIRED columns: Name, Email, Phone, College, Degree, Branch, Department, Start Date'],
    ['• All other columns are OPTIONAL — leave blank if not applicable'],
    ['• Valid Departments: AI, PHP, .NET, SAP, RPA, QC, MOBILE, ODOO (or full names)'],
    ['• Valid Status: active, completed, terminated  (default: active)'],
    ['• Valid Work Mode: onsite, remote, hybrid  (default: onsite)'],
    ['• Date format: YYYY-MM-DD  e.g. 2025-01-15'],
    ['• Skills / Languages / Tools: comma-separated  e.g. Python, Java, SQL'],
    ['• Delete these 2 example rows before importing'],
    ['• Do NOT delete or rename the header row'],
  ];

  const ws = xlsx.utils.aoa_to_sheet([headers, example1, example2, ...notes]);

  // Column widths
  ws['!cols'] = headers.map((h) => {
    if (['Email', 'LinkedIn URL', 'GitHub URL', 'Portfolio URL', 'Skills', 'Languages Known', 'Tools'].includes(h)) return { wch: 32 };
    if (['Address Line 1', 'Address Line 2', 'Notes'].includes(h)) return { wch: 28 };
    if (['Name', 'University', 'College', 'Reference Name'].includes(h)) return { wch: 22 };
    return { wch: 16 };
  });

  // Freeze header row
  ws['!freeze'] = { xSplit: 0, ySplit: 1 };

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
