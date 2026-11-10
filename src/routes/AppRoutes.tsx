import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthLayout }     from '../layouts/AuthLayout';
import { AdminLayout }    from '../layouts/AdminLayout';
import { EmployeeLayout } from '../layouts/EmployeeLayout';
import { ProtectedRoute } from './ProtectedRoute';
import { useAuth }        from '../hooks/useAuth';

// Auth pages
const Login          = lazy(() => import('../pages/auth/Login').then(m => ({ default: m.Login })));
const ForgotPassword = lazy(() => import('../pages/auth/ForgotPassword').then(m => ({ default: m.ForgotPassword })));

// Admin pages
const AdminDashboard     = lazy(() => import('../pages/admin/Dashboard').then(m => ({ default: m.AdminDashboard })));
const AdminEmployees     = lazy(() => import('../pages/admin/Employees').then(m => ({ default: m.AdminEmployees })));
const AdminEmployeeDetail= lazy(() => import('../pages/admin/EmployeeDetail').then(m => ({ default: m.AdminEmployeeDetail })));
const AdminAttendance    = lazy(() => import('../pages/admin/Attendance').then(m => ({ default: m.AdminAttendance })));
const AdminPayslips      = lazy(() => import('../pages/admin/Payslips').then(m => ({ default: m.AdminPayslips })));
const AdminAnnouncements = lazy(() => import('../pages/admin/Announcements').then(m => ({ default: m.AdminAnnouncements })));
const AdminSettings      = lazy(() => import('../pages/admin/Settings').then(m => ({ default: m.AdminSettings })));

// Employee pages
const EmpDashboard     = lazy(() => import('../pages/employee/Dashboard').then(m => ({ default: m.EmpDashboard })));
const EmpAttendance    = lazy(() => import('../pages/employee/Attendance').then(m => ({ default: m.EmpAttendance })));
const EmpPayslips      = lazy(() => import('../pages/employee/Payslips').then(m => ({ default: m.EmpPayslips })));
const EmpAnnouncements = lazy(() => import('../pages/employee/Announcements').then(m => ({ default: m.EmpAnnouncements })));
const EmpProfile       = lazy(() => import('../pages/employee/Profile').then(m => ({ default: m.EmpProfile })));

const Loading = () => (
  <div className="flex items-center justify-center py-16">
    <div className="spinner" />
  </div>
);

const SmartRedirect: React.FC = () => {
  const { role, isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <Loading />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Navigate to={role === 'admin' ? '/admin/dashboard' : '/employee/dashboard'} replace />;
};

export const AppRoutes: React.FC = () => (
  <Suspense fallback={<Loading />}>
    <Routes>
      {/* Public */}
      <Route element={<AuthLayout />}>
        <Route path="/login"           element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
      </Route>

      {/* Admin Portal */}
      <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
        <Route element={<AdminLayout />}>
          <Route path="/admin/dashboard"          element={<AdminDashboard />} />
          <Route path="/admin/employees"          element={<AdminEmployees />} />
          <Route path="/admin/employees/:id"      element={<AdminEmployeeDetail />} />
          <Route path="/admin/attendance"         element={<AdminAttendance />} />
          <Route path="/admin/payslips"           element={<AdminPayslips />} />
          <Route path="/admin/announcements"      element={<AdminAnnouncements />} />
          <Route path="/admin/settings"           element={<AdminSettings />} />
        </Route>
      </Route>

      {/* Employee Portal */}
      <Route element={<ProtectedRoute allowedRoles={['employee']} />}>
        <Route element={<EmployeeLayout />}>
          <Route path="/employee/dashboard"      element={<EmpDashboard />} />
          <Route path="/employee/attendance"     element={<EmpAttendance />} />
          <Route path="/employee/payslips"       element={<EmpPayslips />} />
          <Route path="/employee/announcements"  element={<EmpAnnouncements />} />
          <Route path="/employee/profile"        element={<EmpProfile />} />
        </Route>
      </Route>

      {/* Catch-all */}
      <Route path="/"  element={<SmartRedirect />} />
      <Route path="*"  element={<SmartRedirect />} />
    </Routes>
  </Suspense>
);
