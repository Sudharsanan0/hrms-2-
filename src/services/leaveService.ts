// ============================================================
// Clixhora HRMS — Leave service
//
// Facade over the leave repository. Reads throw on failure so the UI can
// show an explicit error instead of an empty list.
// ============================================================

import type { LeaveRequest, LeaveStatus, LeaveType } from '../types';
import {
  createLeaveRepository,
  type LeaveRepository,
} from './repositories/leaveRepository';

let repository: LeaveRepository | null = null;

export const getLeaveRepository = (): LeaveRepository => {
  if (!repository) repository = createLeaveRepository();
  return repository;
};

export const setLeaveRepository = (repo: LeaveRepository | null): void => {
  repository = repo;
};

export const listLeaveRequests = async (filter?: {
  status?: LeaveStatus;
  employeeId?: string;
}): Promise<LeaveRequest[]> => {
  const requests = await getLeaveRepository().listRequests(filter);
  return requests.sort((a, b) => b.startDate.localeCompare(a.startDate));
};

export const getLeaveRequestsForEmployee = async (employeeId: string): Promise<LeaveRequest[]> =>
  listLeaveRequests({ employeeId });

export const createLeaveRequest = async (input: {
  employeeId: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  duration: number;
  isHalfDay?: boolean;
  reason: string;
}): Promise<LeaveRequest> => getLeaveRepository().createRequest(input);

export const updateLeaveRequestStatus = async (
  id: string,
  status: LeaveStatus,
  reviewedBy?: string,
  reviewNote?: string,
): Promise<LeaveRequest> => getLeaveRepository().updateStatus(id, status, reviewedBy, reviewNote);

export const leaveService = {
  list: listLeaveRequests,
  listForEmployee: getLeaveRequestsForEmployee,
  create: createLeaveRequest,
  updateStatus: updateLeaveRequestStatus,
};
