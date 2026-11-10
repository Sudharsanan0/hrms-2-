import React, { useState } from 'react';
import {
  User, Mail, Phone, Building2, Calendar, MapPin, Edit2,
  Lock, Save, Eye, EyeOff,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { ErrorState, LoadingState } from '../../components/common/DataState';
import { useToast } from '../../hooks/useToast';
import { useEmployee, useUpdateEmployee } from '../../hooks/useHrmsData';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { formatDate } from '../../lib/utils';

export const EmpProfile: React.FC = () => {
  const { user } = useAuth();
  const toast = useToast();
  const [editModal, setEditModal]   = useState(false);
  const [pwModal, setPwModal]       = useState(false);
  const [saving, setSaving]         = useState(false);
  const [showOld, setShowOld]       = useState(false);
  const [showNew, setShowNew]       = useState(false);

  const { data: employee, isLoading, error, refetch } = useEmployee(user?.employeeId);
  const updateMutation = useUpdateEmployee();

  const [personalForm, setPersonal] = useState({
    phone: '',
    address: '',
    emergencyName: '',
    emergencyPhone: '',
  });

  const [pwForm, setPwForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  /** Load the current values into the form when the modal is opened. */
  const openEditModal = () => {
    setPersonal(p => ({
      ...p,
      phone: employee?.contactNumber ?? '',
      address: employee?.address ?? '',
      emergencyName: employee?.emergencyContactName ?? '',
      emergencyPhone: employee?.emergencyContactPhone ?? '',
    }));
    setEditModal(true);
  };

  const handleSavePersonal = async () => {
    if (!employee) return;
    setSaving(true);
    try {
      await updateMutation.mutateAsync({
        id: employee.id,
        patch: {
          contactNumber: personalForm.phone.trim() || undefined,
          address: personalForm.address.trim() || undefined,
          emergencyContactName: personalForm.emergencyName.trim() || undefined,
          emergencyContactPhone: personalForm.emergencyPhone.trim() || undefined,
        },
      });
      await refetch();
      toast.success('Profile Updated', 'Your personal details have been saved.');
      setEditModal(false);
    } catch (err: any) {
      toast.error('Could not save your profile', err?.message || 'Unknown error');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePw = async () => {
    if (!pwForm.oldPassword || !pwForm.newPassword) { toast.error('Fill in all password fields.'); return; }
    if (pwForm.newPassword !== pwForm.confirmPassword) { toast.error('Passwords do not match.'); return; }
    if (pwForm.newPassword.length < 8) { toast.error('Password too short', 'Use at least 8 characters.'); return; }
    setSaving(true);
    try {
      if (isSupabaseConfigured) {
        // The current password is verified by re-authenticating, then the new
        // one is set through the Supabase auth session.
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: user?.email ?? '',
          password: pwForm.oldPassword,
        });
        if (signInError) {
          toast.error('Current password is incorrect', signInError.message);
          return;
        }
        const { error: updateError } = await supabase.auth.updateUser({ password: pwForm.newPassword });
        if (updateError) {
          toast.error('Could not change the password', updateError.message);
          return;
        }
      } else {
        // Demo mode has no auth backend to talk to.
        await new Promise(r => setTimeout(r, 600));
      }
      toast.success('Password Changed', 'Your password has been updated.');
      setPwModal(false);
      setPwForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <LoadingState label="Loading your profile…" className="py-16" />;
  if (error) {
    return (
      <div className="card p-5">
        <ErrorState error={error} title="Could not load your profile" onRetry={() => refetch()} />
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="space-y-6 animate-enter">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Profile</h1>
          <p className="text-sm text-slate-500 mt-0.5">View and update your profile information</p>
        </div>
        <div className="card p-8 text-center">
          <p className="text-sm font-medium text-slate-700">No employee record linked to your login</p>
          <p className="text-xs text-slate-400 mt-1">
            Ask your HR admin to set your work email ({user?.email}) on your employee record, then reload this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-enter">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My Profile</h1>
        <p className="text-sm text-slate-500 mt-0.5">View and update your profile information</p>
      </div>

      {/* Profile Card */}
      <Card>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <Avatar name={employee.fullName} size="lg" />
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-xl font-bold text-slate-900">{employee.fullName}</h2>
              <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded font-semibold text-slate-500">
                {employee.employeeCode}
              </span>
              <Badge status={employee.employmentStatus}>Active</Badge>
            </div>
            <p className="text-sm text-slate-500 mt-0.5">{employee.designationName} · {employee.departmentName}</p>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" /> {employee.workEmail}
            </p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" leftIcon={<Edit2 className="w-3.5 h-3.5" />} onClick={openEditModal}>
              Edit
            </Button>
            <Button size="sm" variant="outline" leftIcon={<Lock className="w-3.5 h-3.5" />} onClick={() => setPwModal(true)}>
              Password
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal Info */}
        <Card>
          <CardHeader><CardTitle>Personal Information</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {[
              { icon: <Mail className="w-4 h-4 text-slate-400" />,     label: 'Work Email',       val: employee.workEmail },
              { icon: <Phone className="w-4 h-4 text-slate-400" />,    label: 'Contact',          val: employee.contactNumber || '—' },
              { icon: <MapPin className="w-4 h-4 text-slate-400" />,   label: 'Address',          val: employee.address || '—' },
              { icon: <Phone className="w-4 h-4 text-slate-400" />,    label: 'Emergency',        val: employee.emergencyContactName || '—' },
              { icon: <Phone className="w-4 h-4 text-slate-400" />,    label: 'Emergency Phone',  val: employee.emergencyContactPhone || '—' },
            ].map(({ icon, label, val }) => (
              <div key={label} className="flex items-center gap-3">
                {icon}
                <span className="text-slate-500 w-32 flex-shrink-0 text-xs">{label}</span>
                <span className="text-slate-900 font-medium text-xs">{val}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Employment Info */}
        <Card>
          <CardHeader><CardTitle>Employment Details</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {[
              { icon: <Building2 className="w-4 h-4 text-slate-400" />, label: 'Department',    val: employee.departmentName },
              { icon: <User className="w-4 h-4 text-slate-400" />,      label: 'Designation',   val: employee.designationName },
              { icon: <Calendar className="w-4 h-4 text-slate-400" />,  label: 'Date Joined',   val: formatDate(employee.dateJoined) },
              { icon: <MapPin className="w-4 h-4 text-slate-400" />,    label: 'Work Location', val: employee.workLocation || '—' },
            ].map(({ icon, label, val }) => (
              <div key={label} className="flex items-center gap-3">
                {icon}
                <span className="text-slate-500 w-32 flex-shrink-0 text-xs">{label}</span>
                <span className="text-slate-900 font-medium text-xs">{val}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Edit Personal Modal */}
      <Modal isOpen={editModal} onClose={() => setEditModal(false)} title="Edit Personal Information"
        description="Update your contact and address details"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditModal(false)}>Cancel</Button>
            <Button isLoading={saving} onClick={handleSavePersonal} leftIcon={<Save className="w-4 h-4" />}>Save Changes</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
            Name, department, and designation can only be updated by your HR admin.
          </div>
          <Input label="Contact Number" type="tel" value={personalForm.phone}
            onChange={e => setPersonal(p => ({ ...p, phone: e.target.value }))} placeholder="+91 98765 43210" />
          <Input label="Address" value={personalForm.address}
            onChange={e => setPersonal(p => ({ ...p, address: e.target.value }))} placeholder="Your home address" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Emergency Contact Name" value={personalForm.emergencyName}
              onChange={e => setPersonal(p => ({ ...p, emergencyName: e.target.value }))} placeholder="Contact name" />
            <Input label="Emergency Contact Phone" type="tel" value={personalForm.emergencyPhone}
              onChange={e => setPersonal(p => ({ ...p, emergencyPhone: e.target.value }))} placeholder="+91 xxxxx xxxxx" />
          </div>
        </div>
      </Modal>

      {/* Change Password Modal */}
      <Modal isOpen={pwModal} onClose={() => setPwModal(false)} title="Change Password"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setPwModal(false)}>Cancel</Button>
            <Button isLoading={saving} onClick={handleChangePw} leftIcon={<Lock className="w-4 h-4" />}>Change Password</Button>
          </div>
        }
      >
        <div className="space-y-4">
          {!isSupabaseConfigured && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
              Demo mode — there is no authentication backend, so the password is not actually changed.
              Connect Supabase to change it for real.
            </div>
          )}
          <div className="relative">
            <Input label="Current Password" type={showOld ? 'text' : 'password'} value={pwForm.oldPassword}
              onChange={e => setPwForm(p => ({ ...p, oldPassword: e.target.value }))} />
            <button type="button" onClick={() => setShowOld(!showOld)}
              className="absolute right-3 top-8 text-slate-400 hover:text-slate-600">
              {showOld ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <div className="relative">
            <Input label="New Password" type={showNew ? 'text' : 'password'} value={pwForm.newPassword}
              onChange={e => setPwForm(p => ({ ...p, newPassword: e.target.value }))} hint="At least 8 characters" />
            <button type="button" onClick={() => setShowNew(!showNew)}
              className="absolute right-3 top-8 text-slate-400 hover:text-slate-600">
              {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <Input label="Confirm New Password" type="password" value={pwForm.confirmPassword}
            onChange={e => setPwForm(p => ({ ...p, confirmPassword: e.target.value }))} />
        </div>
      </Modal>
    </div>
  );
};
