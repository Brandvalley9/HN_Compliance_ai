import React, { useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { LoginPage } from '../../pages/auth/LoginPage';
import { DashboardLayout } from '../layout/DashboardLayout';
import { CampaignerDashboard } from '../../pages/campaigner/CampaignerDashboard';
import { CreatorDashboard } from '../../pages/creator/CreatorDashboard';
import { ReviewerDashboard } from '../../pages/reviewer/ReviewerDashboard';
import { UserRole } from '../../types/auth';

export const RoleRouter: React.FC = () => {
  const { user, loading, switchRole } = useAuth();

  // Synchronize route hash with active user role for deep linking and explicit route verification
  useEffect(() => {
    if (!user) {
      if (window.location.hash) {
        window.history.replaceState(null, '', window.location.pathname);
      }
      return;
    }

    // Set hash based on user's active role
    const currentHash = window.location.hash.replace(/^#\/?/, '');
    if (currentHash !== user.role) {
      window.history.replaceState(null, '', `#/${user.role}`);
    }

    // Listen for hashchange events (e.g., user navigating back/forward or typing #/creator)
    const handleHashChange = () => {
      const newHash = window.location.hash.replace(/^#\/?/, '') as UserRole;
      if (['campaigner', 'creator', 'reviewer'].includes(newHash) && newHash !== user.role) {
        switchRole(newHash);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [user, user?.role, switchRole]);

  if (loading) {
    return (
      <div id="auth-loading-screen" className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-medium text-slate-600 tracking-wide">
            Initializing HypeNex Compliance Shell...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  // Render the appropriate role dashboard based on user.role
  const renderDashboard = () => {
    switch (user.role) {
      case 'campaigner':
        return <CampaignerDashboard />;
      case 'creator':
        return <CreatorDashboard />;
      case 'reviewer':
        return <ReviewerDashboard />;
      default:
        return <CampaignerDashboard />;
    }
  };

  return (
    <DashboardLayout>
      {renderDashboard()}
    </DashboardLayout>
  );
};
