export type DepartmentPersonRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  is_active: boolean | null;
};

export type DepartmentAdminRow = {
  id: string;
  name: string;
  code: string;
  description: string | null;
  head_name: string | null;
  head_email: string | null;
  location: string | null;
  max_interns: number | null;
  is_active: boolean | null;
  created_at: string;
  updated_at: string;
  users: DepartmentPersonRow[];
};
