import React from 'react';
import { PlaceholderSection } from '../../components/placeholders/PlaceholderSection';
import { CheckSquare, BookOpen, ShieldAlert, FileSearch, UserCheck } from 'lucide-react';

export const ReviewerDashboard: React.FC = () => {
  return (
    <div id="reviewer-dashboard-view" className="space-y-6">
      {/* Header with Role Name and Simple Page Title */}
      <div id="reviewer-header-block" className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs">
        <div className="flex items-center gap-2 mb-1">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <UserCheck className="w-3.5 h-3.5" />
            Role: Reviewer
          </span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
          Reviewer Dashboard
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Foundation shell for human compliance verification, regulatory standards lookup, and audit decisioning.
        </p>
      </div>

      {/* Empty Placeholder Sections for Future Functionality */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <PlaceholderSection
          id="placeholder-human-review-queue"
          title="Human Review Queue"
          subtitle="Empty placeholder for prioritised submission queue, claim verification flags, and approval workflows."
          icon={CheckSquare}
          plannedStage="Future Stage"
        />

        <PlaceholderSection
          id="placeholder-regulatory-knowledge"
          title="Regulatory Knowledge"
          subtitle="Empty placeholder for FTC disclosure statutes, healthcare claim thresholds, and regional compliance mandates."
          icon={BookOpen}
          plannedStage="Future Stage"
        />

        <PlaceholderSection
          id="placeholder-audit-compliance-logs"
          title="Audit & Compliance Logs"
          subtitle="Empty placeholder for reviewer sign-offs, rationale records, and compliance certification trails."
          icon={ShieldAlert}
          plannedStage="Future Stage"
        />

        <PlaceholderSection
          id="placeholder-claim-annotations"
          title="Claim Annotations & Timestamps"
          subtitle="Empty placeholder for timestamp-level video compliance tags and substantiated evidence references."
          icon={FileSearch}
          plannedStage="Future Stage"
        />
      </div>
    </div>
  );
};
