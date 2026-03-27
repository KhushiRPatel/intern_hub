export const DEPARTMENTS = ['.NET', 'SAP', 'AI', 'MOBILE', 'ODDO', 'RPA', 'PHP', 'QC'] as const;
export type DepartmentName = typeof DEPARTMENTS[number];

export const INTERN_STATUSES = ['active', 'completed', 'terminated'] as const;
export type InternStatus = typeof INTERN_STATUSES[number];

export type UserRole = 'admin' | 'department_person' | 'intern';

export interface InternData {
    id: string;
    name: string;
    email: string;
    phone?: string;
    college: string;
    degree: string;
    branch: string;
    department_id: string;
    department?: { id: string; name: string };
    start_date: string;
    end_date?: string;
    status: InternStatus;
    user_id?: string;
    created_at: string;
}

export interface UserData {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    department_id?: string | null;
    department_name?: string | null;
    intern_id?: string; // For interns, their intern record ID
}

export interface DepartmentData {
    id: string;
    name: string;
}

// Fixed department IDs (used in demo mode and for Hasura seed data)
export const DEMO_DEPARTMENTS: DepartmentData[] = [
    { id: 'dept-dotnet-001', name: '.NET' },
    { id: 'dept-sap-001', name: 'SAP' },
    { id: 'dept-ai-001', name: 'AI' },
    { id: 'dept-mobile-001', name: 'MOBILE' },
    { id: 'dept-oddo-001', name: 'ODDO' },
    { id: 'dept-rpa-001', name: 'RPA' },
    { id: 'dept-php-001', name: 'PHP' },
    { id: 'dept-qc-001', name: 'QC' },
];

export const STATUS_COLORS: Record<InternStatus, string> = {
    active: 'bg-green-100 text-green-700',
    completed: 'bg-blue-100  text-blue-700',
    terminated: 'bg-red-100   text-red-700',
};

export const ROLE_COLORS: Record<UserRole, string> = {
    admin: 'bg-purple-600 text-white',
    department_person: 'bg-blue-600   text-white',
    intern: 'bg-green-600  text-white',
};

export const ROLE_LABELS: Record<UserRole, string> = {
    admin: 'Admin',
    department_person: 'Dept. Person',
    intern: 'Intern',
};
