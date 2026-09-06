import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon?: React.ReactNode;
  status?: 'success' | 'warning' | 'danger' | 'neutral';
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  subtext,
  icon,
  status = 'neutral',
}) => {
  const statusColors = {
    success: 'border-l-4 border-l-emerald-500',
    warning: 'border-l-4 border-l-amber-500',
    danger: 'border-l-4 border-l-strawberry-red',
    neutral: 'border-l-4 border-l-mahogany-red',
  };

  return (
    <div
      className={`bg-carbon-black border border-silver/15 p-4 rounded-lg shadow-md ${statusColors[status]}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-silver uppercase tracking-wider">
          {label}
        </span>
        {icon && <div className="text-silver/70">{icon}</div>}
      </div>
      <div className="mt-2 text-2xl font-bold text-white font-mono tracking-tight">
        {value}
      </div>
      {subtext && <div className="mt-1 text-xs text-dust-grey/80">{subtext}</div>}
    </div>
  );
};
