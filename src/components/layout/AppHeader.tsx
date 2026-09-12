import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types/auth';
import { ShieldCheck, LogOut, UserCircle2, ArrowLeftRight, Sparkles } from 'lucide-react';

const roleColorConfig: Record<UserRole, { bg: string; text: string; border: string; label: string }> = {
  campaigner: {
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    border: 'border-indigo-200',
    label: 'Campaigner'
  },
  creator: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    label: 'Creator'
  },
  reviewer: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    label: 'Reviewer'
  }
};

export const AppHeader: React.FC = () => {
  const { user, switchRole, logout, isFirebaseConfigured } = useAuth();

  if (!user) return null;

  const currentRoleConfig = roleColorConfig[user.role] || roleColorConfig.campaigner;

  return (
    <header
      id="app-main-header"
      className="h-16 bg-white border-b border-slate-200 px-4 md:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs"
    >
      {/* Brand & Stage indicator */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-slate-900 text-white font-semibold shadow-xs">
          <ShieldCheck className="w-5 h-5 text-indigo-400" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-900 tracking-tight text-base">
              HypeNex Compliance Intelligence
            </span>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              Foundation Stage
            </span>
          </div>
          <p className="text-xs text-slate-600 hidden sm:block">
            Performance UGC Compliance Shell
          </p>
        </div>
      </div>

      {/* User Context & Role Switcher */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Role Switcher Pill for rapid verification across routes */}
        <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg p-1 text-xs">
          <span className="text-slate-600 px-2 flex items-center gap-1 font-medium">
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Active Role:</span>
          </span>
          {(['campaigner', 'creator', 'reviewer'] as UserRole[]).map((r) => {
            const isActive = user.role === r;
            const config = roleColorConfig[r];
            return (
              <button
                key={r}
                id={`role-switch-${r}-btn`}
                type="button"
                onClick={() => switchRole(r)}
                className={`px-2.5 py-1 rounded-md font-medium capitalize transition-all ${
                  isActive
                    ? `${config.bg} ${config.text} shadow-2xs border ${config.border}`
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
                title={`Switch view to ${config.label} Dashboard`}
              >
                {config.label}
              </button>
            );
          })}
        </div>

        {/* User identification badge */}
        <div className="hidden lg:flex items-center gap-2 pl-2 border-l border-slate-200">
          <UserCircle2 className="w-5 h-5 text-slate-400" />
          <div className="text-left">
            <div className="text-xs font-semibold text-slate-800 leading-tight">
              {user.displayName || user.email}
            </div>
            <div className="text-[10px] text-slate-600 flex items-center gap-1">
              {user.isDemo ? (
                <span className="text-indigo-600 font-medium flex items-center gap-0.5">
                  <Sparkles className="w-2.5 h-2.5" /> Preview Session
                </span>
              ) : (
                <span>Firebase Auth User</span>
              )}
            </div>
          </div>
        </div>

        {/* Sign Out Button */}
        <button
          id="sign-out-btn"
          type="button"
          onClick={() => logout()}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
          title="Sign out of application"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Sign Out</span>
        </button>
      </div>
    </header>
  );
};
