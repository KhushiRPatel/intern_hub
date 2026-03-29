/**
 * demoStore — in-memory + localStorage CRUD used when NEXT_PUBLIC_DEMO_MODE=true.
 * Mirrors the shape returned by Hasura GraphQL so UI components stay identical.
 */
import { InternData, DepartmentData, DEMO_DEPARTMENTS } from './constants';

const STORAGE_KEY = 'intern_demo_records';

const defaultInterns: InternData[] = [];

function load(): InternData[] {
    if (typeof window === 'undefined') return defaultInterns;
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : defaultInterns;
    } catch {
        return defaultInterns;
    }
}

function save(interns: InternData[]) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(interns));
}

export interface InternFilters {
    search?: string;
    department?: string;
    college?: string;
    status?: string;
    role?: string;
    userId?: string;
    departmentId?: string;
}

export const demoStore = {
    getInterns(filters?: InternFilters): InternData[] {
        let list = load();

        // Role-based row restriction
        if (filters?.role === 'intern' && filters.userId) {
            list = list.filter((i) => i.user_id === filters.userId);
        } else if (filters?.role === 'department_person' && filters.departmentId) {
            list = list.filter((i) => i.department_id === filters.departmentId);
        }

        if (filters?.search)
            list = list.filter((i) =>
                i.name.toLowerCase().includes(filters.search!.toLowerCase())
            );

        /* Filter bar uses department UUID; legacy demo data may only have department.name */
        if (filters?.department)
            list = list.filter(
                (i) =>
                    i.department_id === filters.department ||
                    i.department?.id === filters.department ||
                    i.department?.name === filters.department,
            );

        if (filters?.college)
            list = list.filter((i) =>
                i.college.toLowerCase().includes(filters.college!.toLowerCase())
            );

        if (filters?.status)
            list = list.filter((i) => i.status === filters.status);

        return list;
    },

    getById(id: string): InternData | undefined {
        return load().find((i) => i.id === id);
    },

    create(data: Omit<InternData, 'id' | 'created_at'>): InternData {
        const list = load();
        const dept = DEMO_DEPARTMENTS.find((d) => d.id === data.department_id);
        const record: InternData = {
            ...data,
            id: `intern-${Date.now()}`,
            department: dept ?? undefined,
            created_at: new Date().toISOString(),
        };
        save([...list, record]);
        return record;
    },

    update(id: string, data: Partial<InternData>): InternData | null {
        const list = load();
        const idx = list.findIndex((i) => i.id === id);
        if (idx === -1) return null;
        const dept = data.department_id
            ? DEMO_DEPARTMENTS.find((d) => d.id === data.department_id)
            : undefined;
        const updated: InternData = {
            ...list[idx],
            ...data,
            department: dept ?? list[idx].department,
        };
        list[idx] = updated;
        save(list);
        return updated;
    },

    delete(id: string): boolean {
        const list = load();
        const next = list.filter((i) => i.id !== id);
        if (next.length === list.length) return false;
        save(next);
        return true;
    },

    getDepartments(): DepartmentData[] {
        return DEMO_DEPARTMENTS;
    },

    getColleges(): string[] {
        return [...new Set(load().map((i) => i.college))].sort();
    },

    getStats() {
        const list = load();
        return {
            total: list.length,
            active: list.filter((i) => i.status === 'active').length,
            completed: list.filter((i) => i.status === 'completed').length,
            terminated: list.filter((i) => i.status === 'terminated').length,
        };
    },
};
