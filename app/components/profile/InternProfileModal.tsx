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

interface FormErrors {
  [key: string]: string;
}

export function InternProfileModal({ isOpen, onClose, internId }: Props) {
  const { data, loading, error, refetch } = useQuery<any>(GET_INTERN_PROFILE, {
    variables: { id: internId },
    skip: !isOpen || !internId,
    fetchPolicy: 'network-only',
  });

  const [updateIntern] = useMutation<any>(UPDATE_INTERN);

  const [formData, setFormData] = useState<Record<string, any>>({});
  const [formErrors, setFormErrors] = useState<FormErrors>({});
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
      setFormErrors({});
    }
  }, [data]);

  // Validation functions
  const validatePhone = (value: string): string => {
    if (!value) return '';
    const digitsOnly = value.replace(/\D/g, '');
    if (digitsOnly.length !== 10) return 'Phone must be exactly 10 digits';
    return '';
  };

  const validateAlternatePhone = (value: string): string => {
    if (!value) return '';
    const digitsOnly = value.replace(/\D/g, '');
    if (digitsOnly.length !== 10) return 'Phone must be exactly 10 digits';
    return '';
  };

  const validateCGPA = (value: string): string => {
    if (!value) return '';
    const num = parseFloat(value);
    if (isNaN(num) || num < 0 || num > 10) return 'CGPA must be between 0 and 10';
    return '';
  };

  const validatePercentage = (value: string): string => {
    if (!value) return '';
    const num = parseFloat(value);
    if (isNaN(num) || num < 0 || num > 100) return 'Percentage must be between 0 and 100';
    return '';
  };

  const validatePincode = (value: string): string => {
    if (!value) return '';
    const digitsOnly = value.replace(/\D/g, '');
    if (digitsOnly.length !== 6) return 'Pincode must be exactly 6 digits';
    return '';
  };

  const validateAadhar = (value: string): string => {
    if (!value) return '';
    const digitsOnly = value.replace(/\D/g, '');
    if (digitsOnly.length !== 12) return 'Aadhar number must be exactly 12 digits';
    return '';
  };

  const validatePAN = (value: string): string => {
    if (!value) return '';
    if (value.length !== 10) return 'PAN must be exactly 10 characters';
    if (!/^[A-Z0-9]{10}$/.test(value)) return 'PAN must contain only uppercase letters and numbers';
    return '';
  };

  const validateCurrentYear = (value: string): string => {
    if (!value) return '';
    const num = parseInt(value);
    if (isNaN(num) || num < 1 || num > 4) return 'Current year must be between 1 and 4';
    return '';
  };

  const validateField = (name: string, value: string): string => {
    switch (name) {
      case 'phone':
        return validatePhone(value);
      case 'alternate_phone':
        return validateAlternatePhone(value);
      case 'cgpa':
        return validateCGPA(value);
      case 'percentage':
        return validatePercentage(value);
      case 'pincode':
        return validatePincode(value);
      case 'aadhar_number':
        return validateAadhar(value);
      case 'pan_number':
        return validatePAN(value);
      case 'current_year':
        return validateCurrentYear(value);
      default:
        return '';
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    let value = e.target.value;
    const name = e.target.name;

    // Format phone fields - only digits
    if (name === 'phone' || name === 'alternate_phone') {
      value = value.replace(/\D/g, '').slice(0, 10);
    }

    // Format pincode - only digits
    if (name === 'pincode') {
      value = value.replace(/\D/g, '').slice(0, 6);
    }

    // Format aadhar - only digits
    if (name === 'aadhar_number') {
      value = value.replace(/\D/g, '').slice(0, 12);
    }

    // Format PAN - uppercase
    if (name === 'pan_number') {
      value = value.toUpperCase().slice(0, 10);
    }

    // Update form data
    setFormData(prev => ({ ...prev, [name]: value }));

    // Validate field in real-time
    const error = validateField(name, value);
    if (error) {
      setFormErrors(prev => ({ ...prev, [name]: error }));
    } else {
      setFormErrors(prev => {
        const updated = { ...prev };
        delete updated[name];
        return updated;
      });
    }
  };

  const handleSave = async () => {
    // Run all validations
    const errors: FormErrors = {};
    const fieldsToValidate = [
      'phone', 'alternate_phone', 'cgpa', 'percentage', 'pincode',
      'aadhar_number', 'pan_number', 'current_year'
    ];

    fieldsToValidate.forEach(field => {
      const error = validateField(field, formData[field] || '');
      if (error) {
        errors[field] = error;
      }
    });

    // Check required fields
    const requiredFields = ['phone', 'address_line1', 'city', 'state', 'pincode', 'college', 'degree', 'branch'];
    requiredFields.forEach(field => {
      if (!formData[field] || formData[field].toString().trim() === '') {
        errors[field] = `${field.replace(/_/g, ' ').charAt(0).toUpperCase() + field.replace(/_/g, ' ').slice(1)} is required`;
      }
    });

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      setSaveError('Please fix all validation errors before saving');
      return;
    }

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
              <div>
                <Input 
                  label="Phone" 
                  name="phone" 
                  value={formData.phone || ''} 
                  onChange={handleChange} 
                  required 
                  placeholder="10 digits"
                />
                {formErrors.phone && <span className="text-xs text-red-600 dark:text-red-400 mt-1 block">{formErrors.phone}</span>}
              </div>
              <div>
                <Input 
                  label="Alternate Phone" 
                  name="alternate_phone" 
                  value={formData.alternate_phone || ''} 
                  onChange={handleChange}
                  placeholder="10 digits"
                />
                {formErrors.alternate_phone && <span className="text-xs text-red-600 dark:text-red-400 mt-1 block">{formErrors.alternate_phone}</span>}
              </div>
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
              <div>
                <Input 
                  label="Aadhar Number" 
                  name="aadhar_number" 
                  value={formData.aadhar_number || ''} 
                  onChange={handleChange}
                  placeholder="12 digits"
                />
                {formErrors.aadhar_number && <span className="text-xs text-red-600 dark:text-red-400 mt-1 block">{formErrors.aadhar_number}</span>}
              </div>
              <div>
                <Input 
                  label="PAN Number" 
                  name="pan_number" 
                  value={formData.pan_number || ''} 
                  onChange={handleChange}
                  placeholder="10 characters"
                />
                {formErrors.pan_number && <span className="text-xs text-red-600 dark:text-red-400 mt-1 block">{formErrors.pan_number}</span>}
              </div>
            </div>
          </section>

          {/* ADDRESS */}
          <section>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4 border-b pb-2">Address Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="sm:col-span-2 lg:col-span-3">
                <Input label="Address Line 1" name="address_line1" value={formData.address_line1 || ''} onChange={handleChange} required />
                {formErrors.address_line1 && <span className="text-xs text-red-600 dark:text-red-400 mt-1 block">{formErrors.address_line1}</span>}
              </div>
              <div className="sm:col-span-2 lg:col-span-3">
                <Input label="Address Line 2" name="address_line2" value={formData.address_line2 || ''} onChange={handleChange} />
              </div>
              <div>
                <Input label="City" name="city" value={formData.city || ''} onChange={handleChange} required />
                {formErrors.city && <span className="text-xs text-red-600 dark:text-red-400 mt-1 block">{formErrors.city}</span>}
              </div>
              <div>
                <Input label="State" name="state" value={formData.state || ''} onChange={handleChange} required />
                {formErrors.state && <span className="text-xs text-red-600 dark:text-red-400 mt-1 block">{formErrors.state}</span>}
              </div>
              <div>
                <Input 
                  label="Pincode" 
                  name="pincode" 
                  value={formData.pincode || ''} 
                  onChange={handleChange} 
                  required 
                  placeholder="6 digits"
                />
                {formErrors.pincode && <span className="text-xs text-red-600 dark:text-red-400 mt-1 block">{formErrors.pincode}</span>}
              </div>
              <Input label="Country" name="country" value={formData.country || 'India'} onChange={handleChange} />
            </div>
          </section>

          {/* ACADEMIC */}
          <section>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4 border-b pb-2">Academic Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Input label="College/Institute" name="college" value={formData.college || ''} onChange={handleChange} required />
                {formErrors.college && <span className="text-xs text-red-600 dark:text-red-400 mt-1 block">{formErrors.college}</span>}
              </div>
              <div>
                <Input label="University" name="university" value={formData.university || ''} onChange={handleChange} />
                {formErrors.university && <span className="text-xs text-red-600 dark:text-red-400 mt-1 block">{formErrors.university}</span>}
              </div>
              <div>
                <Input label="Degree" name="degree" value={formData.degree || ''} onChange={handleChange} placeholder="e.g. B.Tech, MCA" required />
                {formErrors.degree && <span className="text-xs text-red-600 dark:text-red-400 mt-1 block">{formErrors.degree}</span>}
              </div>
              <div>
                <Input label="Branch" name="branch" value={formData.branch || ''} onChange={handleChange} placeholder="e.g. Computer Science" required />
                {formErrors.branch && <span className="text-xs text-red-600 dark:text-red-400 mt-1 block">{formErrors.branch}</span>}
              </div>
              <Input label="Specialization" name="specialization" value={formData.specialization || ''} onChange={handleChange} />
              <Input type="number" label="Graduation Year" name="graduation_year" value={formData.graduation_year || ''} onChange={handleChange} />
              <div>
                <Input 
                  type="number" 
                  label="Current Year" 
                  name="current_year" 
                  value={formData.current_year || ''} 
                  onChange={handleChange}
                  min="1"
                  max="4"
                />
                {formErrors.current_year && <span className="text-xs text-red-600 dark:text-red-400 mt-1 block">{formErrors.current_year}</span>}
              </div>
              <div>
                <Input 
                  type="number" 
                  step="0.01" 
                  label="CGPA" 
                  name="cgpa" 
                  value={formData.cgpa || ''} 
                  onChange={handleChange}
                  placeholder="0-10"
                />
                {formErrors.cgpa && <span className="text-xs text-red-600 dark:text-red-400 mt-1 block">{formErrors.cgpa}</span>}
              </div>
              <div>
                <Input 
                  type="number" 
                  step="0.01" 
                  label="Percentage" 
                  name="percentage" 
                  value={formData.percentage || ''} 
                  onChange={handleChange}
                  placeholder="0-100"
                />
                {formErrors.percentage && <span className="text-xs text-red-600 dark:text-red-400 mt-1 block">{formErrors.percentage}</span>}
              </div>
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
