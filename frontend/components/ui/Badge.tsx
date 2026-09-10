import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'brand';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  className = '',
}) => {
  const baseStyles = 'inline-flex items-center font-semibold rounded-full uppercase tracking-wider transition-colors';

  const variants = {
    success:
      'bg-emerald-950/70 dark:bg-emerald-950/70 light:bg-emerald-50 text-emerald-400 dark:text-emerald-400 light:text-emerald-700 border border-emerald-800/40 light:border-emerald-200',
    warning:
      'bg-amber-950/70 dark:bg-amber-950/70 light:bg-amber-50 text-amber-400 dark:text-amber-400 light:text-amber-700 border border-amber-800/40 light:border-amber-200',
    danger:
      'bg-dark-garnet/80 dark:bg-dark-garnet/80 light:bg-red-50 text-strawberry-red dark:text-strawberry-red light:text-red-700 border border-mahogany-red/40 light:border-red-200',
    info:
      'bg-sky-950/70 dark:bg-sky-950/70 light:bg-sky-50 text-sky-400 dark:text-sky-400 light:text-sky-700 border border-sky-800/40 light:border-sky-200',
    neutral:
      'bg-carbon-black dark:bg-[#161a1d] light:bg-gray-100 text-silver dark:text-silver light:text-gray-700 border border-silver/20 dark:border-silver/15 light:border-gray-200',
    brand:
      'bg-mahogany-red/25 dark:bg-mahogany-red/25 light:bg-red-50 text-white-smoke dark:text-white-smoke light:text-mahogany-red border border-mahogany-red/50 light:border-red-200',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-2.5 py-1 text-xs',
  };

  return (
    <span className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}>
      {children}
    </span>
  );
};
