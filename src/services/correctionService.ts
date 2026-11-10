// ============================================================
// Clixhora HRMS — Attendance correction request service
//
// Facade over the correction repository. Employees raise a request, admins
// review it; every applied correction is written to the audit trail.
// ============================================================

import type { AttendanceCorrectionRequest, CorrectionRequestStatus } from '../types';
import {
  createCorrectionRepository,
  type CorrectionRepository,
} from './repositories/correctionRepository';

let repository: CorrectionRepository | null = null;

export const getCorrectionRepository = (): CorrectionRepository => {
  if (!repository) repository = createCorrectionRepository();
  return repository;
};

export const setCorrectionRepository = (repo: CorrectionRepository | null): void => {
  repository = repo;
};

export const listCorrectionRequests = async (filter?: {
  status?: CorrectionRequestStatus;
  employeeId?: string;
}): Promise<AttendanceCorrectionRequest[]> => {
  const requests = await getCorrectionRepository().listRequests(filter);
  return requests.sort((a, b) => b.attendanceDate.localeCompare(a.attendanceDate));
};

export const createCorrectionRequest = async (input: {
  employeeId: string;
  attendanceDate: string;
  requestedCheckIn?: string;
  requestedCheckOut?: string;
  requestedStatus?: string;
  reason: string;
}): Promise<AttendanceCorrectionRequest> => getCorrectionRepository().createRequest(input);

export const reviewCorrectionRequest = async (
  id: string,
  status: CorrectionRequestStatus,
  reviewedBy: string,
  reviewNote?: string,
): Promise<AttendanceCorrectionRequest> =>
  getCorrectionRepository().review(id, status, reviewedBy, reviewNote);

export const correctionService = {
  list: listCorrectionRequests,
  create: createCorrectionRequest,
  review: reviewCorrectionRequest,
};
