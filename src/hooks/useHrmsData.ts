// ============================================================
// Clixhora HRMS — Shared React Query hooks
//
// All modules read through these hooks, so every page shares one cache and
// one data source. Mutations invalidate the affected keys so the dashboard,
// employee list and attendance roster always stay in sync.
// ============================================================

import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { todayIST } from '../lib/utils';
import {
  getAttendanceRoster,
  markAttendance,
  correctAttendance,
  type AttendanceRoster,
  type MarkAttendanceInput,
} from '../services/attendanceService';
import { getAdminDashboardMetrics, type DashboardMetrics } from '../services/dashboardService';
import {
  getEmployeeAttendance,
  checkIn as attendanceCheckIn,
  checkOut as attendanceCheckOut,
} from '../services/attendanceService';
import { listPayslips, getPayslipsForEmployee } from '../services/payrollService';
import {
  getLeaveRequestsForEmployee,
  listLeaveRequests,
  updateLeaveRequestStatus,
} from '../services/leaveService';
import {
  listCorrectionRequests,
  reviewCorrectionRequest,
} from '../services/correctionService';
import {
  createAnnouncement,
  deleteAnnouncement,
  listAnnouncements,
  listAnnouncementsForAudience,
  setAnnouncementStatus,
  setPinned as setAnnouncementPinned,
  updateAnnouncement,
  type AnnouncementInput,
} from '../services/announcementService';
import {
  getAppSettings,
} from '../services/settingsService';
import {
  createEmployee,
  deleteEmployee,
  getEmployeeById,
  listEmployees,
  setEmployeeStatus,
  updateEmployee,
  type CreateEmployeePayload,
  type CreateEmployeeResult,
} from '../services/employeeService';
import type {
  AnnouncementStatus,
  CorrectionRequestStatus,
  Employee,
  EmploymentStatus,
  LeaveStatus,
} from '../types';

export const queryKeys = {
  employees: ['employees'] as const,
  employeeList: ['employees', 'list'] as const,
  employee: (id: string) => ['employees', 'detail', id] as const,
  roster: (date: string) => ['attendance', 'roster', date] as const,
  dashboard: (date: string) => ['dashboard', date] as const,
  myAttendance: (employeeId: string, month: string) => ['attendance', 'mine', employeeId, month] as const,
  payslips: (employeeId?: string, month?: string) => ['payslips', employeeId ?? 'all', month ?? 'all'] as const,
  leave: (employeeId?: string) => ['leave', employeeId ?? 'all'] as const,
  announcements: ['announcements'] as const,
  myAnnouncements: (departmentId?: string) => ['announcements', 'audience', departmentId ?? 'all'] as const,
};

// ─── Employees ───────────────────────────────────────────────

export const useEmployees = (): UseQueryResult<Employee[]> =>
  useQuery({ queryKey: queryKeys.employeeList, queryFn: listEmployees });

export const useEmployee = (id?: string): UseQueryResult<Employee | null> =>
  useQuery({
    queryKey: queryKeys.employee(id ?? 'none'),
    queryFn: () => getEmployeeById(id as string),
    enabled: !!id,
  });

export const useCreateEmployee = () => {
  const queryClient = useQueryClient();
  return useMutation<Employee, Error, CreateEmployeePayload>({
    mutationFn: async payload => {
      const result: CreateEmployeeResult = await createEmployee(payload);
      if (!result.success || !result.employee) {
        throw new Error(result.error || 'Could not create the employee.');
      }
      return result.employee;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.employees });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
  });
};

export const useUpdateEmployee = () => {
  const queryClient = useQueryClient();
  return useMutation<Employee, Error, { id: string; patch: Parameters<typeof updateEmployee>[1] }>({
    mutationFn: ({ id, patch }) => updateEmployee(id, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.employees });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
  });
};

export const useSetEmployeeStatus = () => {
  const queryClient = useQueryClient();
  return useMutation<Employee, Error, { id: string; status: EmploymentStatus }>({
    mutationFn: ({ id, status }) => setEmployeeStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.employees });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
  });
};

export const useDeleteEmployee = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: id => deleteEmployee(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.employees });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
  });
};

// ─── Attendance ──────────────────────────────────────────────

export const useAttendanceRoster = (date: string): UseQueryResult<AttendanceRoster> =>
  useQuery({ queryKey: queryKeys.roster(date), queryFn: () => getAttendanceRoster(date) });

export const useMarkAttendance = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, MarkAttendanceInput>({
    mutationFn: async input => {
      await markAttendance(input);
    },
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.roster(input.date) });
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

export const useCorrectAttendance = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, MarkAttendanceInput>({
    mutationFn: async input => {
      await correctAttendance(input);
    },
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.roster(input.date) });
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

// ─── Dashboard ───────────────────────────────────────────────

export const useDashboardMetrics = (date: string = todayIST()): UseQueryResult<DashboardMetrics> =>
  useQuery({ queryKey: queryKeys.dashboard(date), queryFn: () => getAdminDashboardMetrics(date) });

// ─── Employee self service ───────────────────────────────────

/** Month range (YYYY-MM-DD) for a given payroll month (YYYY-MM). */
export const monthRange = (month: string): { start: string; end: string } => {
  const [year, monthIndex] = month.split('-').map(Number);
  const start = `${year}-${String(monthIndex).padStart(2, '0')}-01`;
  const lastDay = new Date(Date.UTC(year, monthIndex, 0)).getUTCDate();
  const end = `${year}-${String(monthIndex).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { start, end };
};

export const useMyAttendance = (employeeId?: string, month: string = todayIST().slice(0, 7)) => {
  const range = monthRange(month);
  return useQuery({
    queryKey: queryKeys.myAttendance(employeeId ?? 'none', month),
    queryFn: () => getEmployeeAttendance(employeeId as string, range.start, range.end),
    enabled: !!employeeId,
  });
};

export const useCheckInOut = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { employeeId: string; action: 'in' | 'out'; actorName?: string }>({
    mutationFn: async ({ employeeId, action, actorName }) => {
      if (action === 'in') {
        await attendanceCheckIn(employeeId, todayIST(), { name: actorName });
      } else {
        await attendanceCheckOut(employeeId, todayIST(), { name: actorName });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

export const usePayslips = (filter?: { employeeId?: string; payrollMonth?: string }) =>
  useQuery({
    queryKey: queryKeys.payslips(filter?.employeeId, filter?.payrollMonth),
    queryFn: () => listPayslips(filter),
  });

export const useMyPayslips = (employeeId?: string) =>
  useQuery({
    queryKey: queryKeys.payslips(employeeId ?? 'none'),
    queryFn: () => getPayslipsForEmployee(employeeId as string),
    enabled: !!employeeId,
  });

export const useMyLeaveRequests = (employeeId?: string) =>
  useQuery({
    queryKey: queryKeys.leave(employeeId),
    queryFn: () => getLeaveRequestsForEmployee(employeeId as string),
    enabled: !!employeeId,
  });

/** Every leave request — admin view. */
export const useLeaveRequests = (status?: LeaveStatus) =>
  useQuery({
    queryKey: [...queryKeys.leave('all'), status ?? 'any'],
    queryFn: () => listLeaveRequests(status ? { status } : undefined),
  });

export const useUpdateLeaveRequestStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, reviewedBy, reviewNote }: {
      id: string;
      status: LeaveStatus;
      reviewedBy?: string;
      reviewNote?: string;
    }) => updateLeaveRequestStatus(id, status, reviewedBy, reviewNote),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave'] });
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

/** The correction requests an employee raised. */
export const useMyCorrectionRequests = (employeeId?: string) =>
  useQuery({
    queryKey: ['corrections', 'mine', employeeId ?? 'none'],
    queryFn: () => listCorrectionRequests({ employeeId: employeeId as string }),
    enabled: !!employeeId,
  });

/** Every attendance correction request — admin view. */
export const useCorrectionRequests = (status?: CorrectionRequestStatus) =>
  useQuery({
    queryKey: ['corrections', status ?? 'any'],
    queryFn: () => listCorrectionRequests(status ? { status } : undefined),
  });

export const useReviewCorrectionRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, reviewedBy, reviewNote }: {
      id: string;
      status: CorrectionRequestStatus;
      reviewedBy: string;
      reviewNote?: string;
    }) => reviewCorrectionRequest(id, status, reviewedBy, reviewNote),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['corrections'] });
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

// ─── Announcements ───────────────────────────────────────────

/** Every announcement — admin view. */
export const useAnnouncements = () =>
  useQuery({ queryKey: queryKeys.announcements, queryFn: () => listAnnouncements() });

/** The announcements an employee may read. */
export const useMyAnnouncements = (departmentId?: string) =>
  useQuery({
    queryKey: queryKeys.myAnnouncements(departmentId),
    queryFn: () => listAnnouncementsForAudience({ departmentId }),
  });

export const useCreateAnnouncement = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AnnouncementInput) => createAnnouncement(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
    },
  });
};

export const useUpdateAnnouncement = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<AnnouncementInput> }) =>
      updateAnnouncement(id, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
    },
  });
};

export const useSetAnnouncementStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: AnnouncementStatus }) =>
      setAnnouncementStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
    },
  });
};

export const usePinAnnouncement = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isPinned }: { id: string; isPinned: boolean }) =>
      setAnnouncementPinned(id, isPinned),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
    },
  });
};

export const useDeleteAnnouncement = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAnnouncement(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
    },
  });
};

// ─── Settings ────────────────────────────────────────────────

export const useAppSettings = () =>
  useQuery({ queryKey: ['settings'], queryFn: () => getAppSettings() });

export const useSaveSettings = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, () => Promise<unknown>>({
    mutationFn: async save => {
      await save();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
  });
};
