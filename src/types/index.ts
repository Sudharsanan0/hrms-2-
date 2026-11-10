// ============================================================
// Clixhora HRMS — Core TypeScript Type Definitions
// ============================================================

// ─── Auth & Users ────────────────────────────────────────────

export type Role = 'admin' | 'employee';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  employeeId?: string;     // DB employee record UUID
  employeeCode?: string;   // CLX-01, CLX-02, etc.
  companyId?: string;
  department?: string;
  designation?: string;
  avatarUrl?: string;
}

// ─── Company ─────────────────────────────────────────────────

export interface Company {
  id: string;
  name: string;
  address?: string;
  email?: string;
  phone?: string;
  logoUrl?: string;
  timezone: string;
  currency: string;
  createdAt: string;
}

// ─── Departments & Designations ──────────────────────────────

export interface Department {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
}

export interface Designation {
  id: string;
  departmentId: string;
  departmentName?: string;
  name: string;
  isActive: boolean;
  createdAt: string;
}

// ─── Employees ───────────────────────────────────────────────

export type EmploymentStatus = 'active' | 'inactive' | 'terminated' | 'resigned';
export type EmploymentType   = 'full_time' | 'part_time' | 'contract' | 'intern';

export interface Employee {
  id: string;
  employeeCode: string;        // CLX-01
  authUserId?: string;
  fullName: string;
  workEmail: string;
  personalEmail?: string;
  contactNumber?: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  departmentId?: string;
  departmentName: string;
  /** Canonical department slug (marketing, production, …) — used for filtering. */
  departmentSlug?: string;
  designationId?: string;
  designationName: string;
  dateJoined: string;
  employmentType: EmploymentType;
  employmentStatus: EmploymentStatus;
  workLocation?: string;
  reportingManagerId?: string;
  reportingManagerName?: string;
  invitationStatus?: 'not_invited' | 'invited' | 'accepted' | 'expired';
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeSalary {
  id: string;
  employeeId: string;
  effectiveFrom: string;
  effectiveTo?: string;
  basicSalary: number;
  hra?: number;
  otherAllowances?: number;
  grossSalary: number;
  pfApplicable: boolean;
  esiApplicable: boolean;
  ptApplicable: boolean;
  tdsApplicable: boolean;
  paymentMode: 'bank_transfer' | 'cash' | 'cheque';
  createdAt: string;
}

export interface EmployeeBankDetails {
  id: string;
  employeeId: string;
  bankName?: string;
  accountNumber?: string;   // masked for display
  ifscCode?: string;
  accountHolderName?: string;
  paymentMode: string;
  createdAt: string;
}

export interface EmployeeStatutoryDetails {
  id: string;
  employeeId: string;
  panNumber?: string;
  uanNumber?: string;
  pfMemberId?: string;
  esiNumber?: string;
  pfApplicable: boolean;
  esiApplicable: boolean;
  ptApplicable: boolean;
  createdAt: string;
}

// ─── Attendance ──────────────────────────────────────────────

export type AttendanceStatus =
  | 'present'
  | 'absent'
  | 'weekly_off'
  | 'public_holiday'
  | 'paid_leave'
  | 'unpaid_leave'
  | 'half_day'
  | 'work_from_home'
  | 'not_marked';

export type AttendanceSource = 'web' | 'mobile' | 'biometric' | 'manual_admin';

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName?: string;
  employeeCode?: string;
  departmentName?: string;
  attendanceDate: string;
  checkInAt?: string;       // UTC ISO string
  checkOutAt?: string;      // UTC ISO string
  checkInDisplay?: string;  // IST formatted
  checkOutDisplay?: string; // IST formatted
  status: AttendanceStatus;
  source: AttendanceSource;
  totalMinutes?: number;
  correctionReason?: string;
  notes?: string;
  createdBy?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export type CorrectionRequestStatus = 'pending' | 'approved' | 'rejected';

export interface AttendanceCorrectionRequest {
  id: string;
  employeeId: string;
  employeeName?: string;
  attendanceRecordId?: string;
  attendanceDate: string;
  requestedCheckIn?: string;
  requestedCheckOut?: string;
  requestedStatus?: AttendanceStatus;
  reason: string;
  status: CorrectionRequestStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNote?: string;
  createdAt: string;
}

// ─── Leave ───────────────────────────────────────────────────

export type LeaveType   = 'paid' | 'unpaid' | 'public_holiday';
export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName?: string;
  employeeCode?: string;
  departmentName?: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  duration: number;          // working days requested
  isHalfDay?: boolean;
  reason: string;
  status: LeaveStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNote?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LeaveBalance {
  id: string;
  employeeId: string;
  leaveMonth: string;        // YYYY-MM format
  entitledDays: number;
  reservedDays: number;      // pending requests
  usedDays: number;
  remainingDays: number;
  createdAt: string;
  updatedAt: string;
}

// ─── Holidays ────────────────────────────────────────────────

export type HolidayApplicability = 'all' | 'department' | 'selected';

export interface Holiday {
  id: string;
  name: string;
  holidayDate: string;
  description?: string;
  applicability: HolidayApplicability;
  isOptional: boolean;
  createdAt: string;
}

// ─── Payroll ─────────────────────────────────────────────────

export type PayrollRunStatus = 'draft' | 'processing' | 'ready' | 'finalized' | 'payment_confirmed' | 'published';

export interface PayrollRun {
  id: string;
  payrollMonth: string;        // YYYY-MM
  status: PayrollRunStatus;
  preparedAt?: string;
  finalizedAt?: string;
  paymentDate?: string;
  paymentConfirmedAt?: string;
  paymentConfirmedBy?: string;
  publishedAt?: string;
  publishedBy?: string;
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  employeeCount: number;
  createdAt: string;
}

export interface PayrollItem {
  id: string;
  payrollRunId: string;
  employeeId: string;
  employeeName?: string;
  employeeCode?: string;
  departmentName?: string;
  salarySnapshot: PayrollSalarySnapshot;
  attendanceSnapshot: PayrollAttendanceSnapshot;
  earnings: PayrollComponent[];
  deductions: PayrollComponent[];
  totalEarnings: number;
  totalDeductions: number;
  netSalary: number;
  payableDays: number;
  totalWorkingDays: number;
  lopDays: number;
  status: 'calculated' | 'approved' | 'error';
  errorNote?: string;
  createdAt: string;
}

export interface PayrollComponent {
  name: string;
  amount: number;
  type: 'earning' | 'deduction';
  isConfigured: boolean;
}

export interface PayrollSalarySnapshot {
  basicSalary: number;
  hra?: number;
  otherAllowances?: number;
  grossSalary: number;
  effectiveFrom: string;
}

export interface PayrollAttendanceSnapshot {
  calendarDays: number;
  scheduledWorkingDays: number;
  presentDays: number;
  paidLeaveDays: number;
  unpaidLeaveDays: number;
  absentDays: number;
  halfDays: number;
  publicHolidayDays: number;
  weeklyOffDays: number;
  payableDays: number;
  lopDays: number;
}

// ─── Payslips ────────────────────────────────────────────────

export type PayslipStatus = 'draft' | 'finalized' | 'published' | 'revised';

export interface Payslip {
  id: string;
  payrollItemId: string;
  payrollRunId: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  departmentName: string;
  designationName: string;
  payrollMonth: string;      // YYYY-MM
  version: number;
  status: PayslipStatus;
  storagePath?: string;
  generatedAt?: string;
  publishedAt?: string;
  payslipNumber: string;     // CLX-2026-10-001
  // Denormalized for quick display
  basicSalary: number;
  grossSalary: number;
  totalDeductions: number;
  netSalary: number;
  payableDays: number;
  lopDays: number;
  earnings: PayrollComponent[];
  deductions: PayrollComponent[];
  attendanceSummary: PayrollAttendanceSnapshot;
  // Additional display fields
  dateJoined?: string;
  paymentMode?: string;
  bankNameMasked?: string;
  panMasked?: string;
  uanNumber?: string;
}

// ─── Announcements ───────────────────────────────────────────

export type AnnouncementStatus   = 'draft' | 'scheduled' | 'published' | 'archived';
export type AnnouncementAudience = 'all' | 'department';
export type AnnouncementTheme    = 'none' | 'red' | 'firecrackers' | 'flowers' | 'ribbon' | 'popup';

export interface Announcement {
  id: string;
  title: string;
  body: string;
  audience: AnnouncementAudience;
  audienceDepartmentIds?: string[];
  status: AnnouncementStatus;
  isPinned: boolean;
  theme: AnnouncementTheme;
  templateType?: string;
  publishAt?: string;
  expiresAt?: string;
  deletedAt?: string;
  createdBy?: string;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Settings ────────────────────────────────────────────────

export interface AttendanceSettings {
  weeklyOffDays: string[];         // ['Sunday']
  gracePeriodMinutes: number;
  halfDayThresholdMinutes: number;
  minimumFullDayMinutes: number;
}

export interface LeaveSettings {
  monthlyPaidLeaveEntitlement: number;   // default 1
  carryForwardEnabled: boolean;          // default false
  halfDayEnabled: boolean;
}

export interface PayrollSettings {
  payslipPublicationDay: number;         // default 5
  lopCalculationBasis: 'calendar_days' | 'working_days';  // default calendar_days
  currency: string;                      // INR
  roundingPolicy: 'round' | 'floor' | 'ceil'; // default round
}

// ─── Audit ───────────────────────────────────────────────────

export interface AuditLog {
  id: string;
  actorUserId?: string;
  actorName?: string;
  action: string;
  entityType: string;
  entityId: string;
  beforeData?: Record<string, unknown>;
  afterData?: Record<string, unknown>;
  reason?: string;
  createdAt: string;
}

// ─── Employee Invitation ─────────────────────────────────────

export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'revoked';

export interface EmployeeInvitation {
  id: string;
  employeeId: string;
  email: string;
  status: InvitationStatus;
  invitedBy: string;
  invitedAt: string;
  acceptedAt?: string;
}

// ─── Biometric (Future) ──────────────────────────────────────

export type BiometricEventType = 'check_in' | 'check_out' | 'unknown';
export type BiometricEventStatus = 'received' | 'processing' | 'processed' | 'failed' | 'duplicate';

export interface BiometricDeviceEvent {
  id: string;
  externalEventId: string;
  deviceId: string;
  employeeId?: string;
  eventTimestamp: string;
  eventType: BiometricEventType;
  processingStatus: BiometricEventStatus;
  rawPayload?: Record<string, unknown>;
  errorNote?: string;
  receivedAt: string;
}

export interface BiometricDevice {
  id: string;
  deviceName: string;
  vendor?: string;
  model?: string;
  deviceIdentifier: string;
  integrationType: 'lan_api' | 'usb_sdk' | 'cloud_api' | 'local_agent';
  isActive: boolean;
  lastSyncAt?: string;
  createdAt: string;
}

// ─── Scheduled Jobs ──────────────────────────────────────────

export type JobStatus = 'running' | 'completed' | 'failed' | 'skipped';

export interface ScheduledJobRun {
  id: string;
  jobType: string;
  businessPeriod: string;    // YYYY-MM for payroll jobs
  executionStatus: JobStatus;
  attemptCount: number;
  startedAt: string;
  completedAt?: string;
  errorSummary?: string;
}

// ─── Dashboard Metrics ───────────────────────────────────────

export interface AdminDashboardMetrics {
  totalActiveEmployees: number;
  presentToday: number;
  absentToday: number;
  onLeaveToday: number;
  pendingLeaveRequests: number;
  pendingCorrectionRequests: number;
  currentMonthPayrollStatus: PayrollRunStatus | null;
  totalGrossPayroll: number;
  totalDeductions: number;
  totalNetPayroll: number;
  recentlyJoined: Employee[];
  upcomingHolidays: Holiday[];
}

export interface EmployeeDashboardData {
  employee: Employee;
  todayAttendance?: AttendanceRecord;
  monthAttendanceSummary: PayrollAttendanceSnapshot;
  currentMonthLeaveBalance?: LeaveBalance;
  recentLeaveRequests: LeaveRequest[];
  latestPayslip?: Payslip;
  recentAnnouncements: Announcement[];
  upcomingHolidays: Holiday[];
}

// ─── Form Input Types ────────────────────────────────────────

export interface CreateEmployeeInput {
  fullName: string;
  workEmail: string;
  contactNumber?: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  departmentId: string;
  designationId: string;
  dateJoined: string;
  employmentType: EmploymentType;
  workLocation?: string;
  reportingManagerId?: string;
  // Salary
  basicSalary: number;
  hra?: number;
  otherAllowances?: number;
  grossSalary: number;
  paymentMode: 'bank_transfer' | 'cash' | 'cheque';
  // Bank (optional)
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  // Statutory (optional)
  panNumber?: string;
  uanNumber?: string;
  pfApplicable: boolean;
  esiApplicable: boolean;
}

export interface SelectOption {
  value: string;
  label: string;
}

// UserRole alias (same as Role)
export type UserRole = Role;
