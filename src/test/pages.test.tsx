import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdminEmployees } from '../pages/admin/Employees';
import { AdminAttendance } from '../pages/admin/Attendance';
import { AdminDashboard } from '../pages/admin/Dashboard';
import { AdminPayslips } from '../pages/admin/Payslips';
import { AdminAnnouncements } from '../pages/admin/Announcements';
import { AdminSettings } from '../pages/admin/Settings';
import { getAppSettings } from '../services/settingsService';
import { renderWithProviders } from './renderWithProviders';
import { clearDemoStorage } from '../services/repositories/demoStorage';

describe('Employees page', () => {
  beforeEach(() => clearDemoStorage());

  it('renders the employees from the shared data source', async () => {
    renderWithProviders(<AdminEmployees />);

    await waitFor(() => expect(screen.getByText('CLX-01')).toBeInTheDocument());
    expect(screen.getByText('CLX-06')).toBeInTheDocument();
    expect(screen.getByText('sudharsanan muthu')).toBeInTheDocument();

    // The stats come from the same records — no hardcoded zeros.
    const total = screen.getByText('Total').parentElement?.querySelector('p');
    expect(total?.textContent).toBe('6');
  });

  it('filters the list by department', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AdminEmployees />);
    await waitFor(() => expect(screen.getByText('CLX-01')).toBeInTheDocument());

    await user.selectOptions(screen.getByLabelText(/department/i), 'marketing');

    await waitFor(() => expect(screen.getByText('CLX-06')).toBeInTheDocument());
    expect(screen.queryByText('CLX-02')).not.toBeInTheDocument();
  });
});

describe('Attendance page', () => {
  beforeEach(() => clearDemoStorage());

  it('shows every active employee in the roster, marked as not marked', async () => {
    renderWithProviders(<AdminAttendance />);

    await waitFor(() => expect(screen.getByText('CLX-01')).toBeInTheDocument());
    expect(screen.getByText('CLX-06')).toBeInTheDocument();

    const rows = screen.getAllByText('Not Marked');
    expect(rows.length).toBe(6);
  });

  it('marks an employee present and updates the summary', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AdminAttendance />);
    await waitFor(() => expect(screen.getByText('CLX-01')).toBeInTheDocument());

    const markButtons = screen.getAllByRole('button', { name: /^Mark$/ });
    await user.click(markButtons[0]);

    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText('Check In'), '09:30');
    await user.click(within(dialog).getByRole('button', { name: /mark attendance/i }));

    await waitFor(() => expect(screen.getAllByText('Present').length).toBe(1));
    expect(screen.getAllByText('Not Marked')).toHaveLength(5);
  });
});

describe('Admin dashboard', () => {
  beforeEach(() => clearDemoStorage());

  it('shows the real employee count instead of a hardcoded zero', async () => {
    renderWithProviders(<AdminDashboard />);
    const title = await screen.findByText('Total Employees');
    const card = title.closest('div.card') ?? title.parentElement?.parentElement;

    await waitFor(() => expect(card?.textContent).toContain('6'));
    expect(card?.textContent).not.toContain('—');
  });
});

describe('Employee edit modal', () => {
  beforeEach(() => clearDemoStorage());

  it('saves the change and refreshes the list from the shared source', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AdminEmployees />);
    await waitFor(() => expect(screen.getByText('Arun Kumar')).toBeInTheDocument());

    const editButtons = screen.getAllByRole('button', { name: /^edit$/i });
    await user.click(editButtons[0]);

    const dialog = await screen.findByRole('dialog');
    const nameInput = within(dialog).getByLabelText('Full Name *');
    await user.clear(nameInput);
    await user.type(nameInput, 'Arun Kumar Updated');
    await user.click(within(dialog).getByRole('button', { name: /save changes/i }));

    await waitFor(() => expect(screen.getByText('Arun Kumar Updated')).toBeInTheDocument());
    expect(screen.queryByText('Arun Kumar')).not.toBeInTheDocument();
  });
});

describe('Attendance export', () => {
  beforeEach(() => clearDemoStorage());

  it('downloads the roster of the selected date as a CSV file', async () => {
    const user = userEvent.setup();
    const createObjectURL = vi.fn((_blob: Blob) => 'blob:attendance');
    const revokeObjectURL = vi.fn();
    Object.assign(URL, { createObjectURL, revokeObjectURL });
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    renderWithProviders(<AdminAttendance />);
    await waitFor(() => expect(screen.getByText('CLX-01')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /export report/i }));

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    const anchor = clickSpy.mock.instances[0] as HTMLAnchorElement;
    expect(anchor.download).toMatch(/^attendance-\d{4}-\d{2}-\d{2}\.csv$/);

    const blob = createObjectURL.mock.calls[0][0] as Blob;
    const text = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsText(blob);
    });
    expect(text).toContain('Employee ID');
    expect(text).toContain('CLX-01');

    clickSpy.mockRestore();
  });
});

describe('Payroll policy', () => {
  beforeEach(() => clearDemoStorage());

  it('shows the attendance and leave rules payroll is calculated with', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AdminPayslips />);

    await user.click(await screen.findByRole('button', { name: /view policy/i }));

    const dialog = await screen.findByRole('dialog');
    await waitFor(() => expect(within(dialog).getByText(/Weekly off/)).toBeInTheDocument());
    expect(within(dialog).getByText(/Sunday/)).toBeInTheDocument();
    expect(within(dialog).getByText(/Monthly paid leave entitlement/)).toBeInTheDocument();
    expect(within(dialog).getByText(/Half day leave/)).toBeInTheDocument();
  });
});

describe('Announcements', () => {
  beforeEach(() => clearDemoStorage());

  it('publishes a new announcement and lists it from the shared source', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AdminAnnouncements />);

    await waitFor(() => expect(screen.getByText('Office closed on Sunday')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /new announcement/i }));

    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText('Title *'), 'All hands meeting');
    await user.type(within(dialog).getByLabelText('Content *'), 'Everyone joins on Friday at 10 AM.');
    await user.click(within(dialog).getByRole('button', { name: /publish now/i }));

    await waitFor(() => expect(screen.getAllByText('All hands meeting').length).toBeGreaterThan(0));
  });

  it('archives an announcement instead of leaving the action dead', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AdminAnnouncements />);

    await waitFor(() => expect(screen.getByText('Office closed on Sunday')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /archive office closed on sunday/i }));

    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /^archive$/i }));

    await waitFor(() =>
      expect(screen.queryByText('Office closed on Sunday')).not.toBeInTheDocument(),
    );
  });
});

describe('Settings', () => {
  beforeEach(() => clearDemoStorage());

  it('saves the company settings into the shared data source', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AdminSettings />);

    const nameInput = await screen.findByLabelText('Company Name');
    await waitFor(() => expect(nameInput).toHaveValue('Clixhora Digital Marketing & Technology'));

    await user.clear(nameInput);
    await user.type(nameInput, 'Clixhora Media Pvt Ltd');
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => expect(screen.getByText(/settings saved/i)).toBeInTheDocument());

    const settings = await getAppSettings();
    expect(settings.company.name).toBe('Clixhora Media Pvt Ltd');
  });
});

describe('Leave approval', () => {
  beforeEach(() => clearDemoStorage());

  it('lets an admin approve a pending leave request from the attendance page', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AdminAttendance />);

    await waitFor(() => expect(screen.getByText('CLX-01')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /leave requests/i }));
    await waitFor(() => expect(screen.getByText('Family function out of town.')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /approve leave of priya sharma/i }));

    await waitFor(() => expect(screen.getByText(/leave approved/i)).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText('approved')).toBeInTheDocument());
  });
});

describe('Correction review', () => {
  beforeEach(() => clearDemoStorage());

  it('lets an admin approve a pending correction request from the attendance page', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AdminAttendance />);

    await waitFor(() => expect(screen.getByText('CLX-01')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /corrections/i }));
    await waitFor(() => expect(screen.getByText('Badge machine did not register my check-in.')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /approve correction of/i }));

    await waitFor(() => expect(screen.getByText(/correction approved/i)).toBeInTheDocument());
  });
});
