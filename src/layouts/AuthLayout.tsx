import React from 'react';
import { Outlet } from 'react-router-dom';
import { Building2 } from 'lucide-react';

export const AuthLayout: React.FC = () => (
  <div className="min-h-screen auth-gradient flex">
    {/* Left brand panel */}
    <div className="hidden lg:flex flex-col justify-between w-[420px] p-12 flex-shrink-0">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center">
          <Building2 className="w-6 h-6 text-white" />
        </div>
        <div>
          <p className="text-white font-bold text-lg leading-tight">Clixhora</p>
          <p className="text-white/50 text-xs leading-tight">HRMS Portal</p>
        </div>
      </div>

      <div>
        <h1 className="text-4xl font-extrabold text-white leading-tight mb-4">
          Your complete<br />HR platform.
        </h1>
        <p className="text-white/60 text-sm leading-relaxed mb-8">
          Manage attendance, payroll, leave, and employee information — all in one place for Clixhora Digital Marketing & Technology.
        </p>
        <div className="flex flex-col gap-3">
          {['Employee check-in/out', 'Monthly payslip generation', 'Leave management', 'Role-based access'].map(f => (
            <div key={f} className="flex items-center gap-3 text-white/70 text-sm">
              <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs">✓</div>
              {f}
            </div>
          ))}
        </div>
      </div>

      <p className="text-white/30 text-xs">
        © 2026 Clixhora Digital Marketing & Technology. All rights reserved.
      </p>
    </div>

    {/* Right auth form */}
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Outlet />
      </div>
    </div>
  </div>
);
