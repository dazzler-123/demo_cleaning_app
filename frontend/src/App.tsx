import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { ROLES } from '@/types';

import Login from '@/pages/auth/Login';
import AdminLayout from '@/layouts/AdminLayout';
import AgentLayout from '@/layouts/AgentLayout';
import AdminDashboard from '@/pages/admin/Dashboard';
import LeadsList from '@/pages/admin/LeadsList';
import ConfirmedLeads from '@/pages/admin/ConfirmedLeads';
import LeadForm from '@/pages/admin/LeadForm';
import AgentManagement from '@/pages/admin/AgentManagement';
import Reports from '@/pages/admin/Reports';
import MyTasks from '@/pages/agent/MyTasks';
import TaskDetail from '@/pages/agent/TaskDetail';
import MyAvailability from '@/pages/agent/MyAvailability';
import AgentDashboard from '@/pages/agent/Dashboard';
import UserManagement from '@/pages/admin/UserManagement';
import AuditLogs from '@/pages/admin/AuditLogs';
import ScheduledTasksList from '@/pages/admin/ScheduledTasksList';
import AssignmentsList from '@/pages/admin/AssignmentsList';
import JobCalendar from '@/pages/JobCalendar';

function ProtectedRoute({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  allowedRoles: readonly string[];
}) {
  const { token, user } = useAuthStore();
  if (!token) return <Navigate to="/login" replace />;
  if (!user) return null;
  if (!allowedRoles.includes(user.role)) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  const { token, user, loadUser } = useAuthStore();

  useEffect(() => {
    if (token && !user) loadUser().catch(() => {});
  }, [token, user, loadUser]);

  return (
    <Routes>
      <Route path="/login" element={token ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/" element={token && user ? (user.role === ROLES.AGENT ? <Navigate to="/agent/dashboard" replace /> : <Navigate to="/admin/dashboard" replace />) : <Navigate to="/login" replace />} />
      <Route path="/admin" element={<ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.SUPER_ADMIN]}><AdminLayout /></ProtectedRoute>}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="leads" element={<LeadsList />} />
        <Route path="leads/scheduled" element={<ConfirmedLeads />} />
        <Route path="leads/new" element={<LeadForm />} />
        <Route path="leads/:id/edit" element={<LeadForm />} />
        <Route path="agents" element={<AgentManagement />} />
        <Route path="schedules" element={<ScheduledTasksList />} />
        <Route path="assignments" element={<AssignmentsList />} />
        <Route path="calendar" element={<JobCalendar />} />
        <Route path="reports" element={<Reports />} />
        <Route path="users" element={<UserManagement />} />
        <Route path="audit" element={<AuditLogs />} />
      </Route>
      <Route path="/agent" element={<ProtectedRoute allowedRoles={[ROLES.AGENT]}><AgentLayout /></ProtectedRoute>}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<AgentDashboard />} />
        <Route path="tasks" element={<MyTasks />} />
        <Route path="tasks/:id" element={<TaskDetail />} />
        <Route path="calendar" element={<JobCalendar />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
