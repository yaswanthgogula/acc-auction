/**
 * ============================================================================
 * ACC ACADEMIC BUCKET COMPLETION PROGRESS BAR
 * ============================================================================
 * Shows academic quotas using official bucket designations:
 * 1. 3rd Year B.Tech (B3)
 * 2. 4th Year B.Tech (B4)
 * 3. 2nd Year B.Tech (B2)
 * 4. Diploma - D (B5)
 * 5. PG - P (PG)
 * 6. 1st Year B.Tech (B1)
 */

import React from 'react';

interface BucketProgressBarProps {
  bucketCounts: Record<string, number>;
  compact?: boolean;
}

export const BucketProgressBar: React.FC<BucketProgressBarProps> = ({
  bucketCounts,
  compact = false,
}) => {
  const buckets = [
    { key: 'B3', name: '3rd Year B.Tech', min: 2, color: 'from-amber-600 to-yellow-400' },
    { key: 'B4', name: '4th Year B.Tech', min: 2, color: 'from-purple-600 to-violet-400' },
    { key: 'B2', name: '2nd Year B.Tech', min: 2, color: 'from-emerald-600 to-teal-400' },
    { key: 'B5', name: 'Diploma - D', min: 2, color: 'from-orange-600 to-rose-400' },
    { key: 'PG', name: 'PG - P', min: 0, color: 'from-indigo-600 to-pink-500' },
    { key: 'B1', name: '1st Year B.Tech', min: 2, color: 'from-blue-600 to-cyan-400' },
  ];

  return (
    <div className={`flex flex-col gap-2.5 ${compact ? 'text-xs' : 'text-sm'}`}>
      {buckets.map((b) => {
        const count = bucketCounts[b.key] || 0;
        const target = b.min > 0 ? b.min : 2;
        const percentage = Math.min(100, Math.round((count / target) * 100));
        const isMet = b.min === 0 || count >= b.min;

        return (
          <div key={b.key} className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-slate-300 font-medium">
              <span className="flex items-center gap-1.5 font-bold">
                <span className="w-7 text-amber-400 font-mono text-[11px]">{b.key}</span>
                <span className="text-slate-200">{b.name}</span>
              </span>
              <span className="font-mono text-xs">
                <span className={isMet ? 'text-emerald-400 font-bold' : 'text-slate-300'}>
                  {count}
                </span>
                {b.min > 0 && <span className="text-slate-500"> / {b.min}</span>}
                <span className="ml-2 text-slate-400 font-semibold">{percentage}%</span>
              </span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700/50">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${b.color} transition-all duration-500`}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};
