export const DEPARTMENTS = ['.NET', 'SAP', 'AI', 'MOBILE', 'ODDO', 'RPA', 'PHP', 'QC'] as const;
export type DepartmentName = typeof DEPARTMENTS[number];

export const INTERN_STATUSES = ['applied', 'selected', 'active', 'completed', 'terminated', 'on_leave'] as const;
export type InternStatus = typeof INTERN_STATUSES[number];

export type UserRole = 'admin' | 'department_person' | 'intern';

export interface InternData {
    // System
    id: string;
    user_id?: string;
    created_at: string;
    
    // Personal
    name: string;
    email: string;
    phone?: string;
    alternate_phone?: string | null;
    date_of_birth?: string | null;
    gender?: string | null;
    blood_group?: string | null;
    nationality?: string | null;
    
    // Address
    address_line1?: string | null;
    address_line2?: string | null;
    city?: string | null;
    state?: string | null;
    pincode?: string | null;
    country?: string | null;
    
    // Academic
    college: string;
    university?: string | null;
    college_email?: string | null;
    college_city?: string | null;
    college_state?: string | null;
    degree?: string;
    branch?: string;
    specialization?: string | null;
    graduation_year?: number | null;
    current_year?: number | null;
    cgpa?: number | null;
    percentage?: number | null;
    student_id?: string | null;
    
    // Internship
    department_id: string;
    department?: { id: string; name: string };
    start_date: string;
    end_date?: string | null;
    status: InternStatus;
    duration_months?: number | null;
    work_mode?: string | null;
    stipend?: number | null;
    offer_letter_date?: string | null;
    joining_letter_date?: string | null;
    
    // Skills
    skills?: string[] | null;
    languages_known?: string[] | null;
    tools?: string[] | null;
    
    // Social
    linkedin_url?: string | null;
    github_url?: string | null;
    portfolio_url?: string | null;
    
    // Identity
    aadhar_number?: string | null;
    pan_number?: string | null;
    
    // Reference
    reference_name?: string | null;
    reference_contact?: string | null;
    
    // Notes
    notes?: string | null;
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
