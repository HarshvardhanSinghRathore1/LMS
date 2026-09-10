import React from 'react';

interface ProgressBarProps {
  value: number; // 0 to 100
  max?: number;
  label?: string;
  showPercentage?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'brand' | 'success' | 'warning' | 'info';
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  label,
  showPercentage = true,
  size = 'md',
  variant = 'brand',
  className = '',
}) => {
  const percentage = Math.min(100, Math.max(0, Math.round((value / max) * 100)));

  let heightClass = 'h-2';
  if (size === 'sm') heightClass = 'h-1.5';
  if (size === 'lg') heightClass = 'h-3';

  let fillGradient = 'bg-gradient-to-r from-mahogany-red to-strawberry-red';
  if (variant === 'success') fillGradient = 'bg-gradient-to-r from-emerald-600 to-emerald-400';
  if (variant === 'warning') fillGradient = 'bg-gradient-to-r from-amber-600 to-amber-400';
  if (variant === 'info') fillGradient = 'bg-gradient-to-r from-cyan-600 to-blue-500';

  return (
    <div className={`space-y-1.5 w-full ${className}`}>
      {(label || showPercentage) && (
        <div className="flex items-center justify-between text-xs font-medium">
          {label && <span className="text-silver dark:text-silver light:text-gray-600 truncate">{label}</span>}
          {showPercentage && (
            <span className="font-mono text-white dark:text-white light:text-gray-900 font-semibold ml-auto">
              {percentage}%
            </span>
          )}
        </div>
      )}
      <div className={`w-full ${heightClass} rounded-full bg-carbon-black/60 dark:bg-silver/15 light:bg-gray-200 overflow-hidden`}>
        <div
          className={`${heightClass} rounded-full ${fillGradient} transition-all duration-500 ease-out`}
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  );
};
