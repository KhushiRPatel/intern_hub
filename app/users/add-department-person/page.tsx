"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@apollo/client/react";
import { useAuth } from "@/app/context/AuthContext";
import { DEMO_DEPARTMENTS, DepartmentData } from "@/lib/constants";
import { GET_DEPARTMENTS } from "@/graphql/queries";
import { Toast, ToastType } from "@/app/components/ui/Toast";

const IS_DEMO = process.env.NEXT_PUBLIC_DEMO_MODE !== "false";

type FormValues = { name: string; email: string; department_id: string; mobile_number: string };

interface ToastState {
  message: string;
  type: ToastType;
}

async function resJsonSafe<T = unknown>(res: Response): Promise<T> {
  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Server returned non-JSON: ${text.slice(0, 140)}`);
  }
}

export default function AddDepartmentPersonPage() {
  const { user, token, isLoading } = useAuth();
  const router = useRouter();

  // ── Auth guard ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (user.role !== "admin") router.replace("/dashboard");
  }, [isLoading, user, router]);

  // ── Departments via GraphQL ────────────────────────────────────────────────
  const {
    data: deptData,
    loading: deptsLoading,
    error: deptGqlError,
  } = useQuery<{
    departments: DepartmentData[];
  }>(GET_DEPARTMENTS, { skip: IS_DEMO });

  const departments: DepartmentData[] = IS_DEMO
    ? DEMO_DEPARTMENTS
    : (deptData?.departments ?? []);
  const deptsError = deptGqlError?.message ?? null;
  const showNoDepts =
    !IS_DEMO && !deptsLoading && !deptsError && departments.length === 0;

  // ── Form state ─────────────────────────────────────────────────────────────
  const [form, setForm] = useState<FormValues>({
    name: "",
    email: "",
    department_id: "",
    mobile_number: "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = (message: string, type: ToastType) =>
    setToast({ message, type });

  const set =
    (field: keyof FormValues) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((p) => ({ ...p, [field]: e.target.value }));

  // ── Mobile number handler with validation ──────────────────────────────────
  const handleMobileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow digits, max 10
    let value = e.target.value.replace(/\D/g, "").slice(0, 10);
    setForm((p) => ({ ...p, mobile_number: value }));

    // Real-time validation
    if (value && value.length !== 10) {
      setFormErrors((p) => ({
        ...p,
        mobile_number: "Mobile number must be exactly 10 digits",
      }));
    } else {
      setFormErrors((p) => {
        const updated = { ...p };
        delete updated.mobile_number;
        return updated;
      });
    }
  };

  const validate = () => {
    if (!form.name.trim()) return "Name is required";
    if (!form.email.trim()) return "Email is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return "Invalid email";
    if (!form.department_id) return "Department is required";
    if (form.mobile_number.trim() && !/^\d{10}$/.test(form.mobile_number.trim())) return "Mobile number must be exactly 10 digits";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const vErr = validate();
    if (vErr) {
      showToast(vErr, "error");
      return;
    }

    setSubmitting(true);
    try {
      if (IS_DEMO) {
        setForm({ name: "", email: "", department_id: "", mobile_number: "" });
        showToast("Department person created successfully!", "success");
        return;
      }

      const res = await fetch("/api/users/create-department-person", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          department_id: form.department_id,
          mobile_number: form.mobile_number.trim() || null,
        }),
      });

      const data = await resJsonSafe<{
        message?: string;
        credentials?: { email: string; tempPassword: string };
        resetLink?: string;
        emailSent?: boolean;
        emailNote?: string;
      }>(res);

      if (!res.ok)
        throw new Error(data.message || "Failed to create department person");

      setForm({ name: "", email: "", department_id: "", mobile_number: "" });
      showToast(
        data.emailSent
          ? "Department person created! Password setup email sent."
          : "Department person created! Password setup link sent to console.",
        "success",
      );
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Failed to create department person",
        "error",
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ── Loading state ──────────────────────────────────────────────────────────
  if (isLoading || (!IS_DEMO && deptsLoading)) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* ── Toast ── */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* ── Header ── */}
      <div className="mb-6">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors mb-4"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back
        </button>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
          Add Department Person
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          An account will be created and a password-setup email will be sent
          automatically.
        </p>
      </div>

      {/* ── Alerts ── */}
      {deptsError && (
        <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 rounded-xl text-sm">
          {deptsError}
        </div>
      )}
      {showNoDepts && (
        <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 rounded-xl text-sm">
          No departments found. Seed the <code>departments</code> table first.
        </div>
      )}

      {/* ── Form ── */}
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm px-6 py-5 space-y-4"
      >
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Full Name *
          </label>
          <input
            type="text"
            value={form.name}
            onChange={set("name")}
            placeholder="e.g. Sarah Sharma"
            className="w-full px-3 py-2.5 text-sm border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-slate-800 dark:text-slate-200 dark:bg-slate-800"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Email *
          </label>
          <input
            type="email"
            value={form.email}
            onChange={set("email")}
            placeholder="sarah@example.com"
            className="w-full px-3 py-2.5 text-sm border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-slate-800 dark:text-slate-200 dark:bg-slate-800"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Department *
          </label>
          <select
            value={form.department_id}
            onChange={set("department_id")}
            className="w-full px-3 py-2.5 text-sm border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-slate-800 dark:text-slate-200 dark:bg-slate-800"
          >
            <option value="">Select department</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Mobile Number
            </label>
            <input
              type="tel"
              value={form.mobile_number}
              onChange={handleMobileChange}
              placeholder="e.g. 9876543210"
              maxLength={10}
              className={`w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 text-slate-800 dark:text-slate-200 dark:bg-slate-800 transition-colors ${
                formErrors.mobile_number
                  ? "border-red-400 dark:border-red-400 focus:ring-red-400"
                  : "border-slate-300 dark:border-slate-600 focus:ring-blue-400"
              }`}
            />
            {formErrors.mobile_number ? (
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">{formErrors.mobile_number}</p>
            ) : (
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Optional. Must be exactly 10 digits.</p>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="flex-1 px-4 py-2.5 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || showNoDepts}
              className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating…
                </>
              ) : (
                "Create Department Person"
              )}
            </button>
          </div>
        </form>

    </div>
  );
}
