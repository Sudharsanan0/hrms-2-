import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus, Search, Users, UserCheck, UserX,
  ChevronRight, Database, AlertTriangle, Pencil, CheckCircle2,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { Modal } from '../../components/ui/Modal';
import { Tabs } from '../../components/ui/Tabs';
import { useToast } from '../../hooks/useToast';
import { formatDate } from '../../lib/utils';
import { departmentOptions, designationOptions } from '../../lib/org';
import {
  useCreateEmployee,
  useEmployees,
  useSetEmployeeStatus,
  useUpdateEmployee,
} from '../../hooks/useHrmsData';
import { importTestEmployees, isDevelopment, isDatabaseConnected, SeedResult } from '../../services/seedService';
import type { Employee } from '../../types';

const STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'terminated', label: 'Terminated' },
  { value: 'resigned', label: 'Resigned' },
];

// ─── Add Employee Modal ──────────────────────────────────

interface AddEmployeeForm {
  step: number;
  fullName: string;
  workEmail: string;
  contactNumber: string;
  dateOfBirth: string;
  gender: string;
  address: string;
  departmentId: string;
  designationId: string;
  dateJoined: string;
  employmentType: string;
  workLocation: string;
  basicSalary: string;
  hra: string;
  otherAllowances: string;
  paymentMode: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  panNumber: string;
  pfApplicable: boolean;
  esiApplicable: boolean;
}

const defaultForm: AddEmployeeForm = {
  step: 1,
  fullName: '', workEmail: '', contactNumber: '', dateOfBirth: '', gender: '', address: '',
  departmentId: '', designationId: '', dateJoined: new Date().toISOString().split('T')[0],
  employmentType: 'full_time', workLocation: 'Banaswadi, Bengaluru',
  basicSalary: '', hra: '', otherAllowances: '', paymentMode: 'bank_transfer',
  bankName: '', accountNumber: '', ifscCode: '', panNumber: '',
  pfApplicable: false, esiApplicable: false,
};

const AddEmployeeModal: React.FC<{
  open: boolean;
  onClose: () => void;
  onSuccess: (emp: Employee) => void;
}> = ({ open, onClose, onSuccess }) => {
  const toast = useToast();
  const [form, setForm] = useState<AddEmployeeForm>({ ...defaultForm });
  const [errors, setErrors] = useState<Partial<AddEmployeeForm>>({});
  const createMutation = useCreateEmployee();
  const loading = createMutation.isPending;

  const set = (key: keyof AddEmployeeForm, val: any) =>
    setForm(prev => ({ ...prev, [key]: val }));

  const desigOptions = form.departmentId ? designationOptions(form.departmentId) : [];

  const validate = (): boolean => {
    const errs: any = {};
    if (form.step === 1) {
      if (!form.fullName.trim()) errs.fullName = 'Required';
      if (!form.workEmail.trim() || !form.workEmail.includes('@')) errs.workEmail = 'Valid email required';
    }
    if (form.step === 2) {
      if (!form.departmentId) errs.departmentId = 'Select department';
      if (!form.designationId) errs.designationId = 'Select designation';
      if (!form.dateJoined) errs.dateJoined = 'Required';
    }
    if (form.step === 3) {
      if (!form.basicSalary || Number(form.basicSalary) <= 0) errs.basicSalary = 'Enter valid salary';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (validate()) set('step', Math.min(form.step + 1, 4));
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      const employee = await createMutation.mutateAsync({
        fullName: form.fullName.trim(),
        workEmail: form.workEmail.trim().toLowerCase(),
        contactNumber: form.contactNumber.trim() || undefined,
        dateOfBirth: form.dateOfBirth || undefined,
        gender: form.gender || undefined,
        address: form.address.trim() || undefined,
        departmentId: form.departmentId,
        designationId: form.designationId,
        dateJoined: form.dateJoined,
        employmentType: form.employmentType,
        workLocation: form.workLocation.trim() || undefined,
        basicSalary: form.basicSalary,
        hra: form.hra || undefined,
        otherAllowances: form.otherAllowances || undefined,
        paymentMode: form.paymentMode,
        bankName: form.bankName.trim() || undefined,
        accountNumber: form.accountNumber.trim() || undefined,
        ifscCode: form.ifscCode.trim() || undefined,
        panNumber: form.panNumber.trim() || undefined,
        pfApplicable: form.pfApplicable,
        esiApplicable: form.esiApplicable,
      });

      toast.success(
        'Employee Created',
        `${employee.fullName} (${employee.employeeCode}) has been added successfully. The dashboard and attendance roster were refreshed.`,
      );

      setForm({ ...defaultForm });
      setErrors({});
      onSuccess(employee);
      onClose();
    } catch (err: any) {
      console.error('[AddEmployee] Unexpected error:', err);
      toast.error('Failed to Add Employee', err?.message || 'An unexpected error occurred.');
    }
  };

  const steps = ['Personal', 'Employment', 'Salary', 'Bank & Statutory'];

  return (
    <Modal isOpen={open} onClose={onClose} title="Add New Employee" size="lg">
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6">
        {steps.map((s, i) => (
          <React.Fragment key={s}>
            <div className="flex items-center gap-1.5">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                i + 1 === form.step ? 'bg-brand-600 text-white' :
                i + 1 < form.step ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'
              }`}>{i + 1 < form.step ? '✓' : i + 1}</div>
              <span className={`text-xs font-medium hidden sm:block ${i + 1 === form.step ? 'text-brand-700' : 'text-slate-400'}`}>{s}</span>
            </div>
            {i < steps.length - 1 && <div className={`flex-1 h-0.5 ${i + 1 < form.step ? 'bg-emerald-400' : 'bg-slate-200'}`} />}
          </React.Fragment>
        ))}
      </div>

      {/* Step 1: Personal */}
      {form.step === 1 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Full Name *" value={form.fullName} onChange={e => set('fullName', e.target.value)} error={errors.fullName as string} placeholder="e.g. Rahul Sharma" />
            <Input label="Work Email *" type="email" value={form.workEmail} onChange={e => set('workEmail', e.target.value)} error={errors.workEmail as string} placeholder="rahul@clixhora.com" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Contact Number" type="tel" value={form.contactNumber} onChange={e => set('contactNumber', e.target.value)} placeholder="+91 98765 43210" />
            <Input label="Date of Birth" type="date" value={form.dateOfBirth} onChange={e => set('dateOfBirth', e.target.value)} />
          </div>
          <Select label="Gender" value={form.gender} onChange={e => set('gender', e.target.value)}
            options={[{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }, { value: 'other', label: 'Other' }]}
            placeholder="Select gender" />
          <Input label="Address" value={form.address} onChange={e => set('address', e.target.value)} placeholder="Bengaluru, Karnataka" />
        </div>
      )}

      {/* Step 2: Employment */}
      {form.step === 2 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select label="Department *" value={form.departmentId} onChange={e => { set('departmentId', e.target.value); set('designationId', ''); }}
              options={departmentOptions()} error={errors.departmentId as string} placeholder="Select department" />
            <Select label="Designation *" value={form.designationId} onChange={e => set('designationId', e.target.value)}
              options={desigOptions} error={errors.designationId as string} placeholder="Select designation" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Date of Joining *" type="date" value={form.dateJoined} onChange={e => set('dateJoined', e.target.value)} error={errors.dateJoined as string} />
            <Select label="Employment Type" value={form.employmentType} onChange={e => set('employmentType', e.target.value)}
              options={[
                { value: 'full_time', label: 'Full Time' },
                { value: 'part_time', label: 'Part Time' },
                { value: 'contract', label: 'Contract' },
                { value: 'intern', label: 'Intern' },
              ]} />
          </div>
          <Input label="Work Location" value={form.workLocation} onChange={e => set('workLocation', e.target.value)} placeholder="Banaswadi, Bengaluru" />
        </div>
      )}

      {/* Step 3: Salary */}
      {form.step === 3 && (
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
            <strong>Note:</strong> Salary amounts are monthly figures in INR (₹). Enter gross salary; individual components are optional.
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Basic Salary / Month (₹) *" type="number" value={form.basicSalary} onChange={e => set('basicSalary', e.target.value)} error={errors.basicSalary as string} placeholder="25000" />
            <Input label="HRA / Month (₹)" type="number" value={form.hra} onChange={e => set('hra', e.target.value)} placeholder="10000" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Other Allowances / Month (₹)" type="number" value={form.otherAllowances} onChange={e => set('otherAllowances', e.target.value)} placeholder="5000" />
            <Select label="Payment Mode" value={form.paymentMode} onChange={e => set('paymentMode', e.target.value)}
              options={[
                { value: 'bank_transfer', label: 'Bank Transfer' },
                { value: 'cash', label: 'Cash' },
                { value: 'cheque', label: 'Cheque' },
              ]} />
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600">
            <p className="font-semibold mb-1">Statutory Deductions</p>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.pfApplicable} onChange={e => set('pfApplicable', e.target.checked)} className="rounded" />
                PF Applicable
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.esiApplicable} onChange={e => set('esiApplicable', e.target.checked)} className="rounded" />
                ESI Applicable
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Bank & Statutory */}
      {form.step === 4 && (
        <div className="space-y-4">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
            <strong>Security Note:</strong> Bank and statutory information is encrypted and masked. Only authorized admins can view full details.
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Bank Name" value={form.bankName} onChange={e => set('bankName', e.target.value)} placeholder="HDFC Bank" />
            <Input label="Account Number" type="password" value={form.accountNumber} onChange={e => set('accountNumber', e.target.value)} placeholder="Account number" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="IFSC Code" value={form.ifscCode} onChange={e => set('ifscCode', e.target.value)} placeholder="HDFC0001234" />
            <Input label="PAN Number" value={form.panNumber} onChange={e => set('panNumber', e.target.value.toUpperCase())} placeholder="ABCDE1234F" />
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100">
        <Button variant="outline" onClick={() => form.step > 1 ? set('step', form.step - 1) : onClose()}>
          {form.step > 1 ? 'Back' : 'Cancel'}
        </Button>
        <div className="flex items-center gap-2">
          {form.step < 4 ? (
            <Button onClick={handleNext}>Continue →</Button>
          ) : (
            <Button isLoading={loading} onClick={handleSubmit} leftIcon={<UserCheck className="w-4 h-4" />}>
              Create Employee
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};

// ─── Edit Employee Modal ─────────────────────────────────

export const EditEmployeeModal: React.FC<{
  employee: Employee | null;
  onClose: () => void;
}> = ({ employee, onClose }) => {
  const toast = useToast();
  const statusMutation = useSetEmployeeStatus();
  const updateMutation = useUpdateEmployee();
  const [form, setForm] = useState(() => ({
    fullName: employee?.fullName ?? '',
    departmentId: employee?.departmentSlug ?? employee?.departmentId ?? '',
    designationId: employee?.designationName ?? employee?.designationId ?? '',
    dateJoined: employee?.dateJoined ?? '',
    workLocation: employee?.workLocation ?? '',
    employmentStatus: employee?.employmentStatus ?? 'active',
  }));

  const set = (key: keyof typeof form, val: any) => setForm(prev => ({ ...prev, [key]: val }));

  const handleSave = async () => {
    if (!employee) return;
    if (!form.fullName.trim()) { toast.error('Full name is required.'); return; }
    try {
      await updateMutation.mutateAsync({
        id: employee.id,
        patch: {
          fullName: form.fullName.trim(),
          departmentId: form.departmentId,
          designationId: form.designationId,
          dateJoined: form.dateJoined,
          workLocation: form.workLocation,
          employmentStatus: form.employmentStatus as Employee['employmentStatus'],
        },
      });
      toast.success('Employee Updated', `${form.fullName} has been updated.`);
      onClose();
    } catch (err: any) {
      toast.error('Update Failed', err?.message || 'Could not update the employee.');
    }
  };

  const desigOptions = form.departmentId ? designationOptions(form.departmentId) : [];

  return (
    <Modal
      isOpen={!!employee}
      onClose={onClose}
      title={`Edit ${employee?.employeeCode ?? ''}`}
      description="Changes are saved to the shared employee record and refresh the dashboard and attendance roster."
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button isLoading={statusMutation.isPending} onClick={handleSave} leftIcon={<CheckCircle2 className="w-4 h-4" />}>
            Save Changes
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Input label="Full Name *" value={form.fullName} onChange={e => set('fullName', e.target.value)} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select label="Department" value={form.departmentId} onChange={e => { set('departmentId', e.target.value); set('designationId', ''); }}
            options={departmentOptions()} />
          <Select label="Designation" value={form.designationId} onChange={e => set('designationId', e.target.value)}
            options={desigOptions.length ? desigOptions : (form.designationId ? [{ value: form.designationId, label: form.designationId }] : [])} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Date of Joining" type="date" value={form.dateJoined} onChange={e => set('dateJoined', e.target.value)} />
          <Select label="Employment Status" value={form.employmentStatus} onChange={e => set('employmentStatus', e.target.value)}
            options={[
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
              { value: 'terminated', label: 'Terminated' },
              { value: 'resigned', label: 'Resigned' },
            ]} />
        </div>
        <Input label="Work Location" value={form.workLocation} onChange={e => set('workLocation', e.target.value)} />
      </div>
    </Modal>
  );
};

// ─── Main Employees Page ─────────────────────────────────

export const AdminEmployees: React.FC = () => {
  const toast = useToast();
  const [search, setSearch]         = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [statusFilter, setStatus]   = useState('');
  const [addModalOpen, setAddModal] = useState(false);
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null);
  const [activeTab, setActiveTab]   = useState('all');
  const [seedLoading, setSeedLoad]  = useState(false);
  const [seedConfirm, setSeedConf]  = useState(false);

  const { data: employees, isLoading, error, refetch } = useEmployees();
  const statusMutation = useSetEmployeeStatus();

  const list = useMemo(() => employees ?? [], [employees]);
  const activeEmployees = list.filter(e => e.employmentStatus === 'active');
  const inactiveEmployees = list.filter(e => e.employmentStatus !== 'active');

  const tabs = [
    { id: 'all',      label: 'All',     badge: list.length },
    { id: 'active',   label: 'Active',  badge: activeEmployees.length },
    { id: 'inactive', label: 'Inactive', badge: inactiveEmployees.length },
  ];

  const filtered = useMemo(() => list.filter(e => {
    if (search && !e.fullName.toLowerCase().includes(search.toLowerCase()) &&
        !e.employeeCode.toLowerCase().includes(search.toLowerCase())) return false;
    if (deptFilter && e.departmentSlug !== deptFilter) return false;
    if (statusFilter && e.employmentStatus !== statusFilter) return false;
    if (activeTab === 'active' && e.employmentStatus !== 'active') return false;
    if (activeTab === 'inactive' && e.employmentStatus === 'active') return false;
    return true;
  }), [list, search, deptFilter, statusFilter, activeTab]);

  /** Import the six test employees into the connected database (explicit, idempotent). */
  const handleImport = async () => {
    setSeedConf(false);
    setSeedLoad(true);
    try {
      const result: SeedResult = await importTestEmployees();

      const messages: string[] = [];
      if (result.created.length > 0) messages.push(`Created: ${result.created.join(', ')}`);
      if (result.skipped.length > 0) messages.push(`Already present (skipped): ${result.skipped.join(', ')}`);
      if (result.failed.length > 0) messages.push(`Failed: ${result.failed.map(f => `${f.name} (${f.error})`).join(', ')}`);

      if (result.created.length > 0) {
        toast.success(`Imported ${result.created.length} Employee(s)`, messages.join(' | '));
      } else if (result.skipped.length > 0) {
        toast.info('Nothing to import', messages.join(' | '));
      } else {
        toast.error('Import Failed', messages.join(' | '));
      }

      await refetch();
    } catch (err: any) {
      toast.error('Import Error', err?.message || 'Unknown error');
    } finally {
      setSeedLoad(false);
    }
  };

  const handleToggleStatus = async (employee: Employee) => {
    const nextStatus = employee.employmentStatus === 'active' ? 'inactive' : 'active';
    try {
      await statusMutation.mutateAsync({ id: employee.id, status: nextStatus });
      toast.success(
        nextStatus === 'active' ? 'Employee Activated' : 'Employee Deactivated',
        `${employee.fullName} is now ${nextStatus}. The dashboard and attendance roster were refreshed.`,
      );
    } catch (err: any) {
      toast.error('Update Failed', err?.message || 'Could not update the employee.');
    }
  };

  return (
    <div className="space-y-6 animate-enter">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Employees</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage your team members at Clixhora</p>
        </div>
        <div className="flex items-center gap-2">
          {isDevelopment() && isDatabaseConnected() && (
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Database className="w-4 h-4" />}
              isLoading={seedLoading}
              onClick={() => setSeedConf(true)}
            >
              Import Test Employees
            </Button>
          )}
          <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => setAddModal(true)}>
            Add Employee
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-slate-900">{isLoading ? '—' : list.length}</p>
          <p className="text-xs text-slate-400 mt-0.5">Total</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-emerald-600">{isLoading ? '—' : activeEmployees.length}</p>
          <p className="text-xs text-slate-400 mt-0.5">Active</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-slate-400">{isLoading ? '—' : inactiveEmployees.length}</p>
          <p className="text-xs text-slate-400 mt-0.5">Inactive</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <Input
            aria-label="Search employees"
            leftIcon={<Search className="w-4 h-4" />}
            placeholder="Search by name or employee ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-48">
          <Select
            aria-label="Department"
            options={[{ value: '', label: 'All Departments' }, ...departmentOptions()]}
            value={deptFilter}
            onChange={e => setDeptFilter(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-40">
          <Select
            aria-label="Status"
            options={STATUS_OPTIONS}
            value={statusFilter}
            onChange={e => setStatus(e.target.value)}
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Table */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="table-header">
              <tr>
                <th className="px-4 py-3 text-left">Employee</th>
                <th className="px-4 py-3 text-left">Department</th>
                <th className="px-4 py-3 text-left">Designation</th>
                <th className="px-4 py-3 text-left">Joined</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
                      <p className="text-sm text-slate-400">Loading employees...</p>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center">
                        <AlertTriangle className="w-8 h-8 text-rose-300" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-rose-700">Could not load employees</p>
                        <p className="text-xs text-slate-500 mt-1 max-w-md">
                          {error instanceof Error ? error.message : 'Unknown error'}
                        </p>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => refetch()}>Try again</Button>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center">
                        <Users className="w-8 h-8 text-slate-300" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-700">
                          {list.length === 0 ? 'No employees found' : 'No employees match your filters'}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          {list.length === 0
                            ? 'Click "Add Employee" to onboard your first team member.'
                            : 'Try adjusting your filters.'}
                        </p>
                      </div>
                      {list.length === 0 && (
                        <div className="flex items-center gap-2">
                          <Button onClick={() => setAddModal(true)} leftIcon={<Plus className="w-4 h-4" />}>
                            Add First Employee
                          </Button>
                          {isDevelopment() && isDatabaseConnected() && (
                            <Button variant="outline" size="sm" leftIcon={<Database className="w-4 h-4" />}
                              isLoading={seedLoading} onClick={() => setSeedConf(true)}>
                              Import Test Employees
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ) : filtered.map(emp => (
                <tr key={emp.id} className="table-row">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={emp.fullName} size="sm" />
                      <div>
                        <Link to={`/admin/employees/${emp.id}`} className="font-semibold text-slate-900 hover:text-brand-600 block leading-tight">
                          {emp.fullName}
                        </Link>
                        <p className="text-slate-400 text-[10px] font-mono">{emp.employeeCode}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{emp.departmentName}</td>
                  <td className="px-4 py-3 text-slate-500">{emp.designationName}</td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(emp.dateJoined)}</td>
                  <td className="px-4 py-3"><Badge status={emp.employmentStatus} /></td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button size="sm" variant="ghost" onClick={() => setEditEmployee(emp)} leftIcon={<Pencil className="w-3.5 h-3.5" />}>
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleToggleStatus(emp)}
                        leftIcon={emp.employmentStatus === 'active' ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                      >
                        {emp.employmentStatus === 'active' ? 'Deactivate' : 'Activate'}
                      </Button>
                      <Link to={`/admin/employees/${emp.id}`}>
                        <Button size="sm" variant="outline" rightIcon={<ChevronRight className="w-3.5 h-3.5" />}>
                          View
                        </Button>
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Employee Modal */}
      <AddEmployeeModal open={addModalOpen} onClose={() => setAddModal(false)} onSuccess={() => refetch()} />

      {/* Edit Employee Modal */}
      {editEmployee && (
        <EditEmployeeModal
          key={editEmployee.id}
          employee={editEmployee}
          onClose={() => setEditEmployee(null)}
        />
      )}

      {/* Import Confirmation Modal */}
      <Modal isOpen={seedConfirm} onClose={() => setSeedConf(false)} title="Import Test Employees" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            This will create <strong>6 fictional test employees</strong> in the connected database.
            Existing employees are never overwritten or deleted.
          </p>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 space-y-1">
            <p>• CLX-01 — Arun Kumar — Marketing, Meta Ads Specialist</p>
            <p>• CLX-02 — Priya Sharma — Production, Video Editor</p>
            <p>• CLX-03 — Karthik Raj — Software, Frontend Developer</p>
            <p>• CLX-04 — Divya R — Telecalling, Telecaller</p>
            <p>• CLX-05 — Sanjay Kumar — Sales, Online Sales Executive</p>
            <p>• CLX-06 — sudharsanan muthu — Marketing, Google Ads Specialist</p>
          </div>
          <p className="text-xs text-slate-400">
            Idempotent: employees whose work email already exists are skipped. The CLX-xx identifiers are kept only
            when they are not already used in the database.
          </p>
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setSeedConf(false)}>Cancel</Button>
            <Button size="sm" leftIcon={<Database className="w-4 h-4" />} onClick={handleImport} isLoading={seedLoading}>
              Confirm — Import Employees
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
