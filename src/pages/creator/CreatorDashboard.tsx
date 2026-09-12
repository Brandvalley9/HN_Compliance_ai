import React from 'react';
import { PlaceholderSection } from '../../components/placeholders/PlaceholderSection';
import { UploadCloud, Bot, History, Video, UserCheck } from 'lucide-react';

export const CreatorDashboard: React.FC = () => {
  return (
    <div id="creator-dashboard-view" className="space-y-6">
      {/* Header with Role Name and Simple Page Title */}
      <div id="creator-header-block" className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs">
        <div className="flex items-center gap-2 mb-1">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <UserCheck className="w-3.5 h-3.5" />
            Role: Creator
          </span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
          Creator Dashboard
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Foundation shell for UGC content submissions, pre-flight checks, and draft revisions.
        </p>
      </div>

      {/* Empty Placeholder Sections for Future Functionality */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <PlaceholderSection
          id="placeholder-creator-submissions"
          title="Creator Submissions"
          subtitle="Empty placeholder for uploading creative UGC drafts, linking performance tags, and submitting for review."
          icon={UploadCloud}
          plannedStage="Future Stage"
        />

        <PlaceholderSection
          id="placeholder-compliance-precheck"
          title="Compliance Pre-Check"
          subtitle="Empty placeholder for instantaneous pre-submission verification against campaign rules."
          icon={Bot}
          plannedStage="Future Stage"
        />

        <PlaceholderSection
          id="placeholder-version-history"
          title="Version History"
          subtitle="Empty placeholder for tracking submission revisions, editor feedback comments, and changelogs."
          icon={History}
          plannedStage="Future Stage"
        />

        <PlaceholderSection
          id="placeholder-creator-guidelines"
          title="Campaign Brief Guidelines"
          subtitle="Empty placeholder for campaign dos and don'ts, required hashtags, and approved audio stems."
          icon={Video}
          plannedStage="Future Stage"
        />
      </div>
    </div>
  );
};
