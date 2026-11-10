import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, Building2, Calendar, MapPin, Edit, UserX, UserCheck, AlertCircle } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { ErrorState, LoadingState } from '../../components/common/DataState';
import { useEmployee, useSetEmployeeStatus } from '../../hooks/useHrmsData';
import { useToast } from '../../hooks/useToast';
import { formatDate } from '../../lib/utils';
import { EditEmployeeModal } from './Employees';

export const AdminEmployeeDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const { data: employee, isLoading, error, refetch } = useEmployee(id);
  const statusMutation = useSetEmployeeStatus();
  const [editing, setEditing] = useState(false);

  const handleToggleStatus = async () => {
    if (!employee) return;
    const next = employee.employmentStatus === 'active' ? 'inactive' : 'active';
    try {
      await statusMutation.mutateAsync({ id: employee.id, status: next });
      toast.success(
        next === 'active' ? 'Employee Activated' : 'Employee Deactivated',
        `${employee.fullName} is now ${next}. The attendance roster was refreshed.`,
      );
      refetch();
    } catch (err: any) {
      toast.error('Could not update the employee', err?.message || 'Unknown error');
    }
  };

  if (isLoading) {
    return (
      <div className="animate-enter">
        <Link to="/admin/employees" className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to Employees
        </Link>
        <LoadingState label="Loading employee…" className="py-16" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="animate-enter">
        <Link to="/admin/employees" className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to Employees
        </Link>
        <div className="card p-5">
          <ErrorState error={error} title="Could not load the employee" onRetry={() => refetch()} />
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="animate-enter">
        <Link to="/admin/employees" className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to Employees
        </Link>
        <div className="card flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
            <Building2 className="w-8 h-8 text-slate-300" />
          </div>
          <p className="text-sm font-medium text-slate-700">Employee not found</p>
          <p className="text-xs text-slate-400 mt-1">The employee record may have been removed or the ID is incorrect.</p>
        </div>
      </div>
    );
  }

  const isActive = employee.employmentStatus === 'active';

  return (
    <div className="space-y-6 animate-enter">
      <div className="flex items-center justify-between">
        <Link to="/admin/employees" className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft className="w-4 h-4" /> Back to Employees
        </Link>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" leftIcon={<Edit className="w-3.5 h-3.5" />} onClick={() => setEditing(true)}>Edit</Button>
          <Button
            variant={isActive ? 'danger' : 'primary'}
            size="sm"
            isLoading={statusMutation.isPending}
            leftIcon={isActive ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
            onClick={handleToggleStatus}
          >
            {isActive ? 'Deactivate' : 'Activate'}
          </Button>
        </div>
      </div>

      {/* Profile Header */}
      <Card>
        <div className="flex items-center gap-5">
          <Avatar name={employee.fullName} size="lg" />
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold text-slate-900">{employee.fullName}</h1>
              <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded font-semibold text-slate-600">
                {employee.employeeCode}
              </span>
              <Badge status={employee.employmentStatus} />
            </div>
            <p className="text-sm text-slate-500 mt-0.5">{employee.designationName} · {employee.departmentName}</p>
          </div>
        </div>
      </Card>

      {!isActive && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          This employee is inactive and is therefore excluded from the attendance roster and payroll.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal Info */}
        <Card>
          <CardHeader><CardTitle>Personal Information</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {[
              { icon: <Mail className="w-4 h-4 text-slate-400" />, label: 'Work Email', val: employee.workEmail },
              { icon: <Phone className="w-4 h-4 text-slate-400" />, label: 'Contact', val: employee.contactNumber || '—' },
              { icon: <Calendar className="w-4 h-4 text-slate-400" />, label: 'Date of Joining', val: formatDate(employee.dateJoined) },
              { icon: <MapPin className="w-4 h-4 text-slate-400" />, label: 'Work Location', val: employee.workLocation || '—' },
            ].map(({ icon, label, val }) => (
              <div key={label} className="flex items-center gap-3">
                {icon}
                <span className="text-slate-500 w-32 flex-shrink-0">{label}</span>
                <span className="text-slate-900 font-medium">{val}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Employment Info */}
        <Card>
          <CardHeader><CardTitle>Employment Details</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {[
              { label: 'Department',       val: employee.departmentName },
              { label: 'Designation',      val: employee.designationName },
              { label: 'Employment Type',  val: employee.employmentType.replace('_', ' ') },
              { label: 'Date Joined',      val: formatDate(employee.dateJoined) },
              { label: 'Status',           val: <Badge status={employee.employmentStatus} /> },
            ].map(({ label, val }) => (
              <div key={label} className="flex items-center gap-3">
                <span className="text-slate-500 w-40 flex-shrink-0">{label}</span>
                <span className="text-slate-900 font-medium">{val as any}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {editing && employee && (
        <EditEmployeeModal
          key={employee.id}
          employee={employee}
          onClose={() => { setEditing(false); refetch(); }}
        />
      )}
    </div>
  );
};
