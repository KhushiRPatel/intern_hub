'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { Modal } from '@/app/components/ui/Modal';
import { Input, Select } from '@/app/components/ui/Input';
import { Button } from '@/app/components/ui/Button';
import { Spinner } from '@/app/components/ui/Spinner';
import { GET_INTERN_PROFILE } from '@/graphql/queries';
import { UPDATE_INTERN } from '@/graphql/mutations';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  internId: string;
}

export function InternProfileModal({ isOpen, onClose, internId }: Props) {
  const { data, loading, error, refetch } = useQuery<any>(GET_INTERN_PROFILE, {
    variables: { id: internId },
    skip: !isOpen || !internId,
    fetchPolicy: 'network-only',
  });

  const [updateIntern] = useMutation<any>(UPDATE_INTERN);

  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');


  useEffect(() => {
    if (data?.interns_by_pk) {
      // Initialize form data, ensuring nulls are empty strings so inputs are controlled
      const initial: Record<string, any> = {};
      Object.entries(data.interns_by_pk).forEach(([key, val]) => {
        initial[key] = val === null ? '' : val;
      });
      setFormData(initial);
    }
  }, [data]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError('');
    try {
      // Exclude generated/internal fields that shouldn't be updated by the intern
      const {
        id, user_id, department_id, created_at, updated_at, created_by,
        status, email, name, __typename, start_date, end_date,
        duration_months, mentor_id, stipend, work_mode,
        ...updateData
      } = formData;

      // Ensure empty strings are treated as null in the DB
      const cleanedData = Object.fromEntries(
        Object.entries(updateData).map(([k, v]) => [k, v === '' ? null : v])
      );

      // Perform GraphQL mutation instead of fetch API
      await updateIntern({
        variables: {
          id: internId,
          set: cleanedData
        }
      });

      refetch();
      onClose();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal open={isOpen} onClose={onClose} title="Complete Your Profile" size="xl">
      {loading ? (
        <div className="py-12 flex justify-center"><Spinner size="lg" /></div>
      ) : error ? (
        <div className="text-red-500 py-4">Error loading profile: {error.message}</div>
      ) : (
        <div className="space-y-8 py-2 max-h-[70vh] overflow-y-auto px-1">
          {saveError && <div className="text-red-600 bg-red-50 p-3 rounded-lg text-sm">{saveError}</div>}

          {/* PERSONAL INFO */}
          <section>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4 border-b pb-2">Personal & Identity</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Input label="Phone" name="phone" value={formData.phone || ''} onChange={handleChange} required />
              <Input label="Alternate Phone" name="alternate_phone" value={formData.alternate_phone || ''} onChange={handleChange} />
              <Input type="date" label="Date of Birth" name="date_of_birth" value={formData.date_of_birth || ''} onChange={handleChange} />
              <Select label="Gender" name="gender" value={formData.gender || ''} onChange={handleChange}>
                <option value="">Select Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
                <option value="prefer_not_to_say">Prefer not to say</option>
              </Select>
              <Select label="Blood Group" name="blood_group" value={formData.blood_group || ''} onChange={handleChange}>
                <option value="">Select Blood Group</option>
                <option value="A+">A+</option><option value="A-">A-</option>
                <option value="B+">B+</option><option value="B-">B-</option>
                <option value="AB+">AB+</option><option value="AB-">AB-</option>
                <option value="O+">O+</option><option value="O-">O-</option>
              </Select>
              <Input label="Nationality" name="nationality" value={formData.nationality || 'Indian'} onChange={handleChange} />
              <Input label="Aadhar Number" name="aadhar_number" value={formData.aadhar_number || ''} onChange={handleChange} />
              <Input label="PAN Number" name="pan_number" value={formData.pan_number || ''} onChange={handleChange} className="uppercase" />
            </div>
          </section>

          {/* ADDRESS */}
          <section>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4 border-b pb-2">Address Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="sm:col-span-2 lg:col-span-3">
                <Input label="Address Line 1" name="address_line1" value={formData.address_line1 || ''} onChange={handleChange} required />
              </div>
              <div className="sm:col-span-2 lg:col-span-3">
                <Input label="Address Line 2" name="address_line2" value={formData.address_line2 || ''} onChange={handleChange} />
              </div>
              <Input label="City" name="city" value={formData.city || ''} onChange={handleChange} required />
              <Input label="State" name="state" value={formData.state || ''} onChange={handleChange} required />
              <Input label="Pincode" name="pincode" value={formData.pincode || ''} onChange={handleChange} required />
              <Input label="Country" name="country" value={formData.country || 'India'} onChange={handleChange} />
            </div>
          </section>

          {/* ACADEMIC */}
          <section>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4 border-b pb-2">Academic Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Input label="College/Institute" name="college" value={formData.college || ''} onChange={handleChange} required />
              <Input label="University" name="university" value={formData.university || ''} onChange={handleChange} />
              <Input label="Degree" name="degree" value={formData.degree || ''} onChange={handleChange} placeholder="e.g. B.Tech, MCA" required />
              <Input label="Branch" name="branch" value={formData.branch || ''} onChange={handleChange} placeholder="e.g. Computer Science" required />
              <Input label="Specialization" name="specialization" value={formData.specialization || ''} onChange={handleChange} />
              <Input type="number" label="Graduation Year" name="graduation_year" value={formData.graduation_year || ''} onChange={handleChange} />
              <Input type="number" label="Current Year" name="current_year" value={formData.current_year || ''} onChange={handleChange} />
              <Input type="number" step="0.01" label="CGPA" name="cgpa" value={formData.cgpa || ''} onChange={handleChange} />
              <Input type="number" step="0.01" label="Percentage" name="percentage" value={formData.percentage || ''} onChange={handleChange} />
              <Input label="College Student ID" name="student_id" value={formData.student_id || ''} onChange={handleChange} />
            </div>
          </section>

          {/* SOCIAL */}
          <section>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4 border-b pb-2">Social & Links</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Input label="LinkedIn URL" name="linkedin_url" value={formData.linkedin_url || ''} onChange={handleChange} />
              <Input label="GitHub URL" name="github_url" value={formData.github_url || ''} onChange={handleChange} />
              <Input label="Portfolio Website" name="portfolio_url" value={formData.portfolio_url || ''} onChange={handleChange} />
            </div>
          </section>

          <div className="sticky bottom-0 bg-white dark:bg-slate-900 pt-4 pb-2 flex justify-end gap-3 mt-8 border-t border-slate-100 dark:border-slate-800">
            <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
            <Button onClick={handleSave} loading={isSaving} disabled={isSaving}>Save Profile</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
