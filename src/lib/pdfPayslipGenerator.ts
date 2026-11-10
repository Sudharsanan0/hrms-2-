import { Payslip, PayrollComponent } from '../types';
import { formatCurrency } from './utils';
import { numberToWordsRupees } from './numberToWords';

// ─── Company Constants ───────────────────────────────────────
const COMPANY_NAME    = 'Clixhora Digital Marketing & Technology';
const COMPANY_ADDRESS = '#12, 3rd Floor, Banaswadi Main Road, Banaswadi, Bengaluru, Karnataka 560043, India';
const COMPANY_EMAIL   = 'hr@clixhora.com';

/**
 * Generate and open a professional A4 payslip PDF for printing/saving.
 * This opens a new browser window with print-ready HTML.
 * Server-side PDF generation via Edge Function is the secure production path.
 */
export const generatePayslipPdf = (payslip: Payslip): void => {
  const earnings   = payslip.earnings   || [];
  const deductions = payslip.deductions || [];
  const att        = payslip.attendanceSummary;
  const totalEarnings = earnings.reduce((sum, e) => sum + (e.amount || 0), 0);
  const totalDeductions = deductions.reduce((sum, d) => sum + (d.amount || 0), 0);

  const earningsRows = earnings.map(
    (e: PayrollComponent) => `
      <tr>
        <td>${e.name}</td>
        <td class="amount">${formatCurrency(e.amount, true)}</td>
      </tr>`
  ).join('');

  const deductionsRows = deductions.map(
    (d: PayrollComponent) => `
      <tr>
        <td>${d.name}</td>
        <td class="amount deduction">${formatCurrency(d.amount, true)}</td>
      </tr>`
  ).join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Payslip — ${payslip.employeeName} — ${payslip.payrollMonth}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap');

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Inter', sans-serif;
      font-size: 12px;
      color: #1e293b;
      background: #fff;
    }

    .page {
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      padding: 24px 28px;
    }

    /* ── Header ── */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 3px solid #1e3a8a;
      padding-bottom: 16px;
      margin-bottom: 20px;
    }

    .logo-block { display: flex; align-items: center; gap: 12px; }

    .logo-icon {
      width: 44px;
      height: 44px;
      border-radius: 10px;
      background: linear-gradient(135deg, #1e3a8a 0%, #4338ca 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      font-weight: 800;
      font-size: 18px;
      letter-spacing: -1px;
    }

    .company-name { font-size: 15px; font-weight: 800; color: #1e3a8a; }
    .company-addr { font-size: 10px; color: #64748b; margin-top: 2px; max-width: 260px; }

    .payslip-label {
      text-align: right;
    }
    .payslip-label h1 {
      font-size: 16px;
      font-weight: 700;
      color: #1e3a8a;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .payslip-label .ref {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      color: #64748b;
      margin-top: 4px;
    }
    .payslip-label .month {
      font-size: 13px;
      font-weight: 600;
      color: #334155;
      margin-top: 2px;
    }

    /* ── Notice ── */
    .notice {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 6px;
      padding: 6px 12px;
      font-size: 10px;
      color: #1d4ed8;
      margin-bottom: 16px;
      text-align: center;
    }

    /* ── Info Grid ── */
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 14px 16px;
      margin-bottom: 18px;
    }

    .info-section-title {
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #94a3b8;
      margin-bottom: 8px;
    }

    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 2px 0;
      border-bottom: 1px solid #f1f5f9;
    }
    .info-row:last-child { border-bottom: none; }

    .info-label { color: #64748b; font-weight: 500; }
    .info-val   { color: #1e293b; font-weight: 600; text-align: right; }

    /* ── Attendance ── */
    .att-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 8px;
      margin-bottom: 18px;
    }
    .att-cell {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 8px;
      text-align: center;
    }
    .att-cell .val { font-size: 18px; font-weight: 700; color: #1e3a8a; }
    .att-cell .lbl { font-size: 9px; color: #64748b; margin-top: 2px; font-weight: 500; }

    /* ── Salary Tables ── */
    .salary-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 18px;
    }

    .sal-table {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      overflow: hidden;
    }

    .sal-table-title {
      background: #1e3a8a;
      color: #fff;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 7px 12px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
    }

    table thead th {
      background: #f1f5f9;
      color: #475569;
      font-weight: 600;
      padding: 6px 10px;
      text-align: left;
      border-bottom: 1px solid #e2e8f0;
    }

    table tbody td {
      padding: 5px 10px;
      border-bottom: 1px solid #f1f5f9;
      color: #334155;
    }
    table tbody tr:last-child td { border-bottom: none; }

    .amount { text-align: right; font-family: 'JetBrains Mono', monospace; font-weight: 600; }
    .deduction { color: #dc2626; }

    .total-row td {
      background: #f8fafc;
      font-weight: 700;
      color: #1e293b;
      border-top: 2px solid #e2e8f0;
      padding: 7px 10px;
    }

    /* ── Net Salary ── */
    .net-block {
      background: linear-gradient(135deg, #1e3a8a 0%, #4338ca 100%);
      border-radius: 10px;
      padding: 16px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 18px;
      color: #fff;
    }
    .net-label  { font-size: 10px; font-weight: 600; opacity: 0.8; text-transform: uppercase; letter-spacing: 1px; }
    .net-words  { font-size: 12px; font-weight: 500; margin-top: 4px; max-width: 320px; }
    .net-amount { font-family: 'JetBrains Mono', monospace; font-size: 28px; font-weight: 800; }

    /* ── Footer ── */
    .footer {
      border-top: 1px solid #e2e8f0;
      padding-top: 12px;
      text-align: center;
      font-size: 9px;
      color: #94a3b8;
    }

    .no-print {
      margin: 12px auto;
      max-width: 210mm;
      display: flex;
      gap: 8px;
      justify-content: flex-end;
    }
    .btn-print {
      background: #1e3a8a;
      color: white;
      border: none;
      padding: 8px 20px;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
      font-size: 13px;
    }

    @media print {
      .no-print { display: none !important; }
      body { background: white; }
    }
  </style>
</head>
<body>
  <div class="no-print">
    <button class="btn-print" onclick="window.print()">🖨 Print / Save as PDF</button>
  </div>

  <div class="page">
    <!-- HEADER -->
    <div class="header">
      <div class="logo-block">
        <div class="logo-icon">CX</div>
        <div>
          <div class="company-name">${COMPANY_NAME}</div>
          <div class="company-addr">${COMPANY_ADDRESS}</div>
        </div>
      </div>
      <div class="payslip-label">
        <h1>Salary Payslip</h1>
        <div class="ref">${payslip.payslipNumber}</div>
        <div class="month">${formatPayrollMonthDisplay(payslip.payrollMonth)}</div>
      </div>
    </div>

    <!-- NOTICE -->
    <div class="notice">
      This is a system-generated payslip issued by Clixhora Digital Marketing & Technology. No signature required.
    </div>

    <!-- EMPLOYEE INFO -->
    <div class="info-grid">
      <div>
        <div class="info-section-title">Employee Details</div>
        <div class="info-row"><span class="info-label">Name</span><span class="info-val">${payslip.employeeName}</span></div>
        <div class="info-row"><span class="info-label">Employee ID</span><span class="info-val">${payslip.employeeCode}</span></div>
        <div class="info-row"><span class="info-label">Department</span><span class="info-val">${payslip.departmentName}</span></div>
        <div class="info-row"><span class="info-label">Designation</span><span class="info-val">${payslip.designationName}</span></div>
        <div class="info-row"><span class="info-label">Date of Joining</span><span class="info-val">${payslip.dateJoined || '—'}</span></div>
      </div>
      <div>
        <div class="info-section-title">Payment Details</div>
        <div class="info-row"><span class="info-label">Pay Period</span><span class="info-val">${formatPayrollMonthDisplay(payslip.payrollMonth)}</span></div>
        <div class="info-row"><span class="info-label">Payment Mode</span><span class="info-val">${payslip.paymentMode || 'Bank Transfer'}</span></div>
        ${payslip.bankNameMasked ? `<div class="info-row"><span class="info-label">Bank</span><span class="info-val">${payslip.bankNameMasked}</span></div>` : ''}
        ${payslip.panMasked ? `<div class="info-row"><span class="info-label">PAN</span><span class="info-val">${payslip.panMasked}</span></div>` : ''}
        ${payslip.uanNumber ? `<div class="info-row"><span class="info-label">UAN</span><span class="info-val">${payslip.uanNumber}</span></div>` : ''}
        <div class="info-row"><span class="info-label">Payslip Ref</span><span class="info-val">${payslip.payslipNumber}</span></div>
      </div>
    </div>

    <!-- ATTENDANCE SUMMARY -->
    <div class="att-grid">
      <div class="att-cell"><div class="val">${att?.scheduledWorkingDays ?? '—'}</div><div class="lbl">Working Days</div></div>
      <div class="att-cell"><div class="val">${att?.payableDays ?? '—'}</div><div class="lbl">Payable Days</div></div>
      <div class="att-cell"><div class="val">${att?.presentDays ?? '—'}</div><div class="lbl">Present</div></div>
      <div class="att-cell"><div class="val">${att?.paidLeaveDays ?? '—'}</div><div class="lbl">Paid Leave</div></div>
      <div class="att-cell" style="background:#fef2f2; border-color:#fecaca;"><div class="val" style="color:#dc2626;">${att?.lopDays ?? 0}</div><div class="lbl">LOP Days</div></div>
    </div>

    <!-- EARNINGS & DEDUCTIONS -->
    <div class="salary-grid">
      <div class="sal-table">
        <div class="sal-table-title">Earnings</div>
        <table>
          <thead><tr><th>Component</th><th style="text-align:right;">Amount (₹)</th></tr></thead>
          <tbody>
            ${earningsRows}
            <tr class="total-row"><td>Total Earnings</td><td class="amount">${formatCurrency(totalEarnings || payslip.grossSalary, true)}</td></tr>
          </tbody>
        </table>
      </div>
      <div class="sal-table">
        <div class="sal-table-title">Deductions</div>
        <table>
          <thead><tr><th>Component</th><th style="text-align:right;">Amount (₹)</th></tr></thead>
          <tbody>
            ${deductionsRows || '<tr><td colspan="2" style="text-align:center;color:#94a3b8;padding:10px;">No deductions</td></tr>'}
            <tr class="total-row"><td>Total Deductions</td><td class="amount deduction">${formatCurrency(payslip.totalDeductions ?? totalDeductions, true)}</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- NET SALARY -->
    <div class="net-block">
      <div>
        <div class="net-label">Net Salary Payable</div>
        <div class="net-words">${numberToWordsRupees(payslip.netSalary)}</div>
      </div>
      <div class="net-amount">${formatCurrency(payslip.netSalary, true)}</div>
    </div>

    <!-- FOOTER -->
    <div class="footer">
      <p>Generated on ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST &nbsp;|&nbsp; ${COMPANY_EMAIL} &nbsp;|&nbsp; ${COMPANY_ADDRESS}</p>
      <p style="margin-top:4px;">This document is computer-generated and does not require a signature. For queries, contact HR at ${COMPANY_EMAIL}.</p>
    </div>
  </div>

  <script>
    window.addEventListener('load', function() {
      setTimeout(function() { window.print(); }, 400);
    });
  </script>
</body>
</html>`;

  const w = window.open('', '_blank');
  if (w) {
    w.document.write(html);
    w.document.close();
  }
};

function formatPayrollMonthDisplay(yyyyMM: string): string {
  if (!yyyyMM) return '';
  const [y, m] = yyyyMM.split('-');
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}
