import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon?: React.ReactNode;
  status?: 'success' | 'warning' | 'danger' | 'neutral' | 'info';
  trend?: {
    value: string;
    isPositive: boolean;
  };
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  subtext,
  icon,
  status = 'neutral',
  trend,
  className = '',
}) => {
  const statusColors = {
    success: 'border-l-4 border-l-emerald-500',
    warning: 'border-l-4 border-l-amber-500',
    danger: 'border-l-4 border-l-strawberry-red',
    neutral: 'border-l-4 border-l-mahogany-red',
    info: 'border-l-4 border-l-sky-500',
  };

  return (
    <div
      className={`bg-carbon-black/80 dark:bg-[#161a1d] light:bg-white border border-silver/15 dark:border-silver/10 light:border-gray-200/80 p-4 sm:p-5 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 ${statusColors[status]} ${className}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-silver dark:text-silver light:text-gray-500 uppercase tracking-wider truncate">
          {label}
        </span>
        {icon && (
          <div className="p-2 rounded-lg bg-carbon-black/60 dark:bg-[#1f2428] light:bg-gray-100 text-silver dark:text-silver light:text-gray-600 shrink-0">
            {icon}
          </div>
        )}
      </div>
      <div className="mt-2 text-2xl sm:text-3xl font-bold text-white dark:text-white light:text-gray-900 font-mono tracking-tight">
        {value}
      </div>
      {(subtext || trend) && (
        <div className="mt-1.5 flex items-center gap-2 text-xs">
          {trend && (
            <span
              className={`font-semibold ${
                trend.isPositive ? 'text-emerald-400 light:text-emerald-600' : 'text-strawberry-red light:text-red-600'
              }`}
            >
              {trend.value}
            </span>
          )}
          {subtext && (
            <span className="text-silver/80 dark:text-silver/80 light:text-gray-500 truncate">{subtext}</span>
          )}
        </div>
      )}
    </div>
  );
};
