import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Building2, Clock, CalendarCheck, Banknote, Calendar, Plus, Trash2, Save } from 'lucide-react';
import { Tabs } from '../../components/ui/Tabs';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { ErrorState, LoadingState } from '../../components/common/DataState';
import { useToast } from '../../hooks/useToast';
import { useAppSettings, useSaveSettings } from '../../hooks/useHrmsData';
import {
  addHoliday,
  removeHoliday,
  saveAttendanceSettings,
  saveCompanySettings,
  saveLeaveSettings,
  savePayrollSettings,
  type AppSettings,
} from '../../services/settingsService';

const TABS = [
  { id: 'company',    label: 'Company',    },
  { id: 'attendance', label: 'Attendance', },
  { id: 'leave',      label: 'Leave',      },
  { id: 'payroll',    label: 'Payroll',    },
  { id: 'holidays',   label: 'Holidays',   },
];

const SettingsForm: React.FC<{ settings: AppSettings }> = ({ settings }) => {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('company');

  const [company, setCompany] = useState(settings.company);
  const [attendance, setAttendance] = useState(settings.attendance);
  const [leave, setLeave] = useState(settings.leave);
  const [payroll, setPayroll] = useState(settings.payroll);
  const [newHoliday, setNewHoliday] = useState({ name: '', date: '' });

  const saveMutation = useSaveSettings();

  const save = async (label: string, persist: () => Promise<unknown>) => {
    try {
      await saveMutation.mutateAsync(persist);
      toast.success(`${label} saved`, 'The change is stored in the shared data source.');
    } catch (err: any) {
      toast.error(`Could not save the ${label.toLowerCase()}`, err?.message || 'Unknown error');
    }
  };

  const handleAddHoliday = async () => {
    if (!newHoliday.name || !newHoliday.date) { toast.error('Enter holiday name and date.'); return; }
    try {
      await addHoliday({ name: newHoliday.name, date: newHoliday.date });
      toast.success('Holiday added', `${newHoliday.name} — ${newHoliday.date}`);
      setNewHoliday({ name: '', date: '' });
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    } catch (err: any) {
      toast.error('Could not add the holiday', err?.message || 'Unknown error');
    }
  };

  const handleRemoveHoliday = async (id: string, name: string) => {
    try {
      await removeHoliday(id);
      toast.success('Holiday removed', name);
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    } catch (err: any) {
      toast.error('Could not remove the holiday', err?.message || 'Unknown error');
    }
  };

  return (
    <div className="space-y-6 animate-enter">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500 mt-0.5">Configure your HRMS settings for Clixhora</p>
      </div>

      <Tabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />

      {/* Company */}
      {activeTab === 'company' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Building2 className="w-4 h-4" /> Company Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Company Name" value={company.name} onChange={e => setCompany(p=>({...p,name:e.target.value}))} />
              <Input label="HR Email" type="email" value={company.email} onChange={e => setCompany(p=>({...p,email:e.target.value}))} />
            </div>
            <Input label="Registered Address" value={company.address} onChange={e => setCompany(p=>({...p,address:e.target.value}))} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select label="Timezone" value={company.timezone} onChange={e => setCompany(p=>({...p,timezone:e.target.value}))}
                options={[{ value: 'Asia/Kolkata', label: 'IST — Asia/Kolkata (UTC+5:30)' }]} />
              <Select label="Currency" value={company.currency} onChange={e => setCompany(p=>({...p,currency:e.target.value}))}
                options={[{ value: 'INR', label: 'Indian Rupee (₹ INR)' }]} />
            </div>
            <div className="flex justify-end pt-2">
              <Button
                isLoading={saveMutation.isPending}
                onClick={() => save('Company settings', () => saveCompanySettings(company))}
                leftIcon={<Save className="w-4 h-4" />}
              >Save Changes</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Attendance */}
      {activeTab === 'attendance' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Clock className="w-4 h-4" /> Attendance Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
              Attendance timings are based on IST (Asia/Kolkata). Employees check in via the web portal.
            </div>
            <div>
              <label className="form-label">Weekly Off Days</label>
              <div className="flex flex-wrap gap-2">
                {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map(day => (
                  <button key={day} type="button"
                    onClick={() => setAttendance(p => ({
                      ...p,
                      weeklyOffDays: p.weeklyOffDays.includes(day)
                        ? p.weeklyOffDays.filter(d => d !== day)
                        : [...p.weeklyOffDays, day]
                    }))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      attendance.weeklyOffDays.includes(day)
                        ? 'bg-brand-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}>{day.slice(0, 3)}</button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input label="Grace Period (min)" type="number" value={attendance.gracePeriodMinutes}
                onChange={e => setAttendance(p=>({...p,gracePeriodMinutes:+e.target.value}))} hint="After this, marked Late" />
              <Input label="Half Day Threshold (min)" type="number" value={attendance.halfDayThresholdMinutes}
                onChange={e => setAttendance(p=>({...p,halfDayThresholdMinutes:+e.target.value}))} hint="Min hours for half day" />
              <Input label="Full Day Minimum (min)" type="number" value={attendance.minimumFullDayMinutes}
                onChange={e => setAttendance(p=>({...p,minimumFullDayMinutes:+e.target.value}))} hint="Min hours for full day" />
            </div>
            <div className="flex justify-end pt-2">
              <Button
                isLoading={saveMutation.isPending}
                onClick={() => save('Attendance settings', () => saveAttendanceSettings(attendance))}
                leftIcon={<Save className="w-4 h-4" />}
              >Save Changes</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Leave */}
      {activeTab === 'leave' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><CalendarCheck className="w-4 h-4" /> Leave Policy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700">
              <strong>Current Policy:</strong> Employees earn {leave.monthlyPaidLeaveEntitlement} paid leave per calendar month.
              {leave.carryForwardEnabled ? ' Unused paid leave carries to the next month.' : ' Unused monthly paid leave expires at month end.'}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Monthly Paid Leave Entitlement" type="number" value={leave.monthlyPaidLeaveEntitlement}
                onChange={e => setLeave(p=>({...p,monthlyPaidLeaveEntitlement:+e.target.value}))} hint="Days per month" />
            </div>
            <div className="space-y-3">
              <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg cursor-pointer">
                <input type="checkbox" checked={leave.carryForwardEnabled} onChange={e => setLeave(p=>({...p,carryForwardEnabled:e.target.checked}))} className="rounded" />
                <div>
                  <p className="text-sm font-medium text-slate-900">Enable carry-forward</p>
                  <p className="text-xs text-slate-400">Unused paid leave carries to next month</p>
                </div>
              </label>
              <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg cursor-pointer">
                <input type="checkbox" checked={leave.halfDayEnabled} onChange={e => setLeave(p=>({...p,halfDayEnabled:e.target.checked}))} className="rounded" />
                <div>
                  <p className="text-sm font-medium text-slate-900">Enable half-day leave</p>
                  <p className="text-xs text-slate-400">Employees can apply for half-day leave</p>
                </div>
              </label>
            </div>
            <div className="flex justify-end pt-2">
              <Button
                isLoading={saveMutation.isPending}
                onClick={() => save('Leave policy', () => saveLeaveSettings(leave))}
                leftIcon={<Save className="w-4 h-4" />}
              >Save Changes</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payroll */}
      {activeTab === 'payroll' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Banknote className="w-4 h-4" /> Payroll Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input label="Payslip Publication Day" type="number" min={1} max={28} value={payroll.payslipPublicationDay}
                onChange={e => setPayroll(p=>({...p,payslipPublicationDay:+e.target.value}))}
                hint="Day of following month to publish payslips" />
              <Input label="Payroll Cutoff Day" type="number" min={1} max={31} value={payroll.payrollCutoffDay}
                onChange={e => setPayroll(p=>({...p,payrollCutoffDay:+e.target.value}))}
                hint="Attendance is locked after this day" />
              <Input label="Standard Working Hours" type="number" min={1} max={24} value={payroll.standardWorkingHours}
                onChange={e => setPayroll(p=>({...p,standardWorkingHours:+e.target.value}))}
                hint="Hours in a full working day" />
            </div>
            <Select label="LOP Calculation Basis" value={payroll.lopBasis} onChange={e => setPayroll(p=>({...p,lopBasis:e.target.value as typeof payroll.lopBasis}))}
              options={[
                { value: 'calendar_days', label: 'Calendar Days (default)' },
                { value: 'working_days',  label: 'Working Days Only' },
              ]} hint="How unpaid leave deduction is calculated" />
            <Select label="Salary Rounding Policy" value={payroll.roundingPolicy} onChange={e => setPayroll(p=>({...p,roundingPolicy:e.target.value as typeof payroll.roundingPolicy}))}
              options={[
                { value: 'round', label: 'Round (nearest rupee)' },
                { value: 'floor', label: 'Floor (round down)' },
                { value: 'ceil',  label: 'Ceiling (round up)' },
              ]} />
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
              <strong>LOP Formula:</strong> Deduction = (Gross Salary ÷ Calendar Days in Month) × LOP Days
            </div>
            <div className="flex justify-end pt-2">
              <Button
                isLoading={saveMutation.isPending}
                onClick={() => save('Payroll settings', () => savePayrollSettings(payroll))}
                leftIcon={<Save className="w-4 h-4" />}
              >Save Changes</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Holidays */}
      {activeTab === 'holidays' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Calendar className="w-4 h-4" /> Holiday Calendar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              <Input placeholder="Holiday name (e.g. Diwali)" value={newHoliday.name}
                onChange={e => setNewHoliday(p=>({...p,name:e.target.value}))} />
              <Input type="date" value={newHoliday.date}
                onChange={e => setNewHoliday(p=>({...p,date:e.target.value}))} className="w-48" />
              <Button onClick={handleAddHoliday} leftIcon={<Plus className="w-4 h-4" />}>Add</Button>
            </div>
            {settings.holidays.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <Calendar className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p className="text-sm">No holidays configured yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {settings.holidays.map(h => (
                  <div key={h.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-brand-50 rounded-lg flex flex-col items-center justify-center">
                        <span className="text-[9px] font-bold text-brand-500 uppercase">
                          {new Date(h.holidayDate).toLocaleDateString('en-IN', { month: 'short' })}
                        </span>
                        <span className="text-sm font-bold text-brand-700">{new Date(h.holidayDate).getDate()}</span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{h.name}</p>
                        <p className="text-xs text-slate-400">{new Date(h.holidayDate).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveHoliday(h.id, h.name)}
                      aria-label={`Remove ${h.name}`}
                      className="text-rose-400 hover:text-rose-600 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export const AdminSettings: React.FC = () => {
  const settingsQuery = useAppSettings();

  if (settingsQuery.isLoading) return <LoadingState label="Loading settings…" />;
  if (settingsQuery.error) {
    return (
      <ErrorState
        error={settingsQuery.error}
        title="Could not load the settings"
        onRetry={() => settingsQuery.refetch()}
      />
    );
  }
  if (!settingsQuery.data) return <LoadingState label="Loading settings…" />;

  return <SettingsForm key="settings-form" settings={settingsQuery.data} />;
};
