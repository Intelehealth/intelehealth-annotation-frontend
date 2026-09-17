'use client';

import { useAuth } from '@/contexts/AuthContext';
import { AdminDashboard } from '@/components/dashboard/admin-dashboard';
import { AnnotatorDashboard } from '@/components/dashboard/annotator-dashboard';

// Role switch only. The layout handles auth redirects and the app shell.
export default function DashboardPage() {
  const { user } = useAuth();
  if (!user) return null;
  const isAdmin = String(user.role ?? '').toUpperCase() === 'ADMIN';
  return isAdmin ? <AdminDashboard firstName={user.firstName} /> : <AnnotatorDashboard firstName={user.firstName} />;
}
